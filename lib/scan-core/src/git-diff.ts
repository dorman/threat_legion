import { execSync } from "child_process";
import { filterScannablePaths, resolveExistingFiles } from "./local-files";

export function getGitChangedFiles(cwd: string, base: string, head: string): string[] {
  const commands = [
    `git diff --name-only --diff-filter=ACMR ${base}...${head}`,
    `git diff --name-only --diff-filter=ACMR ${base}..${head}`,
    `git diff --name-only --diff-filter=ACMR ${base} ${head}`,
  ];

  for (const cmd of commands) {
    try {
      const out = execSync(cmd, {
        cwd,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const files = out
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      if (files.length > 0) {
        return filterScannablePaths(files);
      }
    } catch {
      // try next diff syntax
    }
  }

  return [];
}

export async function resolveScannableFiles(
  scanDir: string,
  changedFiles: string[]
): Promise<string[]> {
  return resolveExistingFiles(scanDir, filterScannablePaths(changedFiles));
}

export function isGitRepository(cwd: string): boolean {
  try {
    execSync("git rev-parse --git-dir", {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}
