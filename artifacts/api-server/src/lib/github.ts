import { Octokit } from "@octokit/rest";

export function createOctokit(accessToken: string): Octokit {
  return new Octokit({ auth: accessToken });
}

export async function verifyRepoOwnership(
  accessToken: string,
  owner: string,
  repo: string
): Promise<boolean> {
  try {
    const octokit = createOctokit(accessToken);
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const { data: user } = await octokit.users.getAuthenticated();
    return repoData.owner.login.toLowerCase() === user.login.toLowerCase();
  } catch {
    return false;
  }
}

export function parseRepoUrl(
  url: string
): { owner: string; repo: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.replace(/^\//, "").replace(/\.git$/, "").split("/");
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    const match = url.match(/^([^/]+)\/([^/]+)$/);
    if (match) return { owner: match[1], repo: match[2] };
    return null;
  }
}

export async function getRepoFileTree(
  octokit: Octokit,
  owner: string,
  repo: string,
  maxFiles = 200
): Promise<string[]> {
  try {
    const { data: tree } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: "HEAD",
      recursive: "1",
    });
    return (tree.tree || [])
      .filter((item) => item.type === "blob" && item.path)
      .map((item) => item.path as string)
      .slice(0, maxFiles);
  } catch {
    return [];
  }
}

export async function getFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string
): Promise<string | null> {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path });
    if ("content" in data && data.content) {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }
    return null;
  } catch {
    return null;
  }
}
