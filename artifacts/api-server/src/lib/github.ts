const GITHUB_TOKEN = process.env["GITHUB_TOKEN"];

const GITHUB_HEADERS: Record<string, string> = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
};

async function githubGet<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    method: "GET",
    headers: GITHUB_HEADERS,
  });
  if (!res.ok) {
    throw new Error(`GitHub API error ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Fetch the GitHub login associated with the GITHUB_TOKEN.
 * Returns null if no token is configured or the request fails.
 */
export async function getConnectorGithubUsername(): Promise<string | null> {
  if (!GITHUB_TOKEN) return null;
  try {
    const user = await githubGet<{ login: string }>("/user");
    return user.login ?? null;
  } catch {
    return null;
  }
}

export function parseRepoUrl(
  url: string
): { owner: string; repo: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname
      .replace(/^\//, "")
      .replace(/\.git$/, "")
      .split("/");
    if (parts.length < 2) return null;
    return { owner: parts[0]!, repo: parts[1]! };
  } catch {
    const match = url.match(/^([^/]+)\/([^/]+)$/);
    if (match) return { owner: match[1]!, repo: match[2]! };
    return null;
  }
}

/**
 * Checks whether a GitHub repository is publicly accessible using an
 * unauthenticated request. This deliberately avoids any auth token
 * so that private repos are never accessible to the AI scanner.
 *
 * Returns "public" | "private" | "not_found".
 */
export async function checkRepoVisibility(
  owner: string,
  repo: string
): Promise<"public" | "private" | "not_found"> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (res.status === 404) return "not_found";
    if (!res.ok) return "not_found";

    const data = (await res.json()) as { private?: boolean };
    return data.private ? "private" : "public";
  } catch {
    return "not_found";
  }
}

export async function getRepoFileTree(
  owner: string,
  repo: string,
  maxFiles = 200
): Promise<string[]> {
  try {
    const data = await githubGet<{ tree?: { type: string; path?: string }[] }>(
      `/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`
    );
    return (data.tree || [])
      .filter((item) => item.type === "blob" && item.path)
      .map((item) => item.path as string)
      .slice(0, maxFiles);
  } catch {
    return [];
  }
}

export async function getFileContent(
  owner: string,
  repo: string,
  path: string
): Promise<string | null> {
  try {
    const data = await githubGet<{ content?: string; encoding?: string }>(
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`
    );
    if (data.content && data.encoding === "base64") {
      return Buffer.from(data.content.replace(/\n/g, ""), "base64").toString(
        "utf-8"
      );
    }
    return null;
  } catch {
    return null;
  }
}
