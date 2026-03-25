import { ReplitConnectors } from "@replit/connectors-sdk";

const connectors = new ReplitConnectors();

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

async function githubGet<T>(path: string): Promise<T> {
  const res = await connectors.proxy("github", path, { method: "GET" });
  if (!res.ok) {
    throw new Error(`GitHub API error ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Fetch the GitHub login (username) of the account linked to the workspace
 * GitHub connector. This is the authoritative identity used for all GitHub API
 * calls made through the connector.
 */
export async function getConnectorGithubUsername(): Promise<string | null> {
  try {
    const user = await githubGet<{ login: string }>("/user");
    return user.login ?? null;
  } catch {
    return null;
  }
}

/**
 * Verify that the given GitHub username is the owner of or a collaborator on
 * the specified repository. The `githubUsername` must originate from the
 * connector's own identity (fetched via getConnectorGithubUsername), not from
 * user-supplied data, ensuring the check is against the authoritative GitHub
 * account bound to the workspace connector.
 */
export async function verifyRepoOwnership(
  owner: string,
  repo: string,
  githubUsername: string
): Promise<boolean> {
  try {
    const repoData = await githubGet<{ owner: { login: string } }>(
      `/repos/${owner}/${repo}`
    );

    if (repoData.owner.login.toLowerCase() === githubUsername.toLowerCase()) {
      return true;
    }

    const collaboratorRes = await connectors.proxy(
      "github",
      `/repos/${owner}/${repo}/collaborators/${githubUsername}/permission`,
      { method: "GET" }
    );

    if (!collaboratorRes.ok) {
      return false;
    }

    const permData = (await collaboratorRes.json()) as {
      permission?: string;
    };
    const permission = permData.permission ?? "none";
    return permission !== "none" && permission !== "";
  } catch {
    return false;
  }
}

/**
 * Checks whether a GitHub repository is publicly accessible using an
 * unauthenticated request. This deliberately avoids the connector's auth
 * token so that private repos are never accessible to the AI scanner.
 *
 * Returns "public" | "private" | "not_found".
 * - "public"    → repo exists and is publicly readable — safe to scan
 * - "private"   → repo exists but requires auth (confirmed private)
 * - "not_found" → repo does not exist or cannot be resolved
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

    if (res.status === 404) return "private";
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
