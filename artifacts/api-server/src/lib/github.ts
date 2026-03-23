import { ReplitConnectors } from "@replit/connectors-sdk";

const connectors = new ReplitConnectors();

export function parseRepoUrl(
  url: string
): { owner: string; repo: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.replace(/^\//, "").replace(/\.git$/, "").split("/");
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
 * Verify that the given GitHub username is the owner of or a collaborator on
 * the specified repository. Uses the workspace-level GitHub connector for the
 * repository metadata calls; ownership is evaluated against the caller-supplied
 * `githubUsername` obtained from the authenticated user's session, not from the
 * connector's own identity.
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
