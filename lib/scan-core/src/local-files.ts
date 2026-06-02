import fs from "fs";
import path from "path";
import os from "os";

const SKIP_DIRS = new Set([
  ".git", "node_modules", ".next", ".nuxt", "dist", "build", "out",
  "__pycache__", ".pytest_cache", ".venv", "venv", "env",
  "vendor", ".gradle", "target", ".cargo", ".idea", ".vscode",
  "coverage", ".nyc_output", ".turbo", ".cache",
]);

const SKIP_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp", ".bmp", ".tiff",
  ".mp4", ".mov", ".avi", ".mkv", ".mp3", ".wav", ".flac",
  ".pdf", ".docx", ".xlsx", ".pptx", ".doc", ".xls",
  ".zip", ".tar", ".gz", ".rar", ".7z", ".bz2",
  ".exe", ".dll", ".so", ".dylib", ".bin", ".class",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".pyc", ".pyo",
]);

const MAX_FILE_SIZE_BYTES = 512 * 1024;

const SCANNABLE_DOTFILES = new Set([".env", ".env.local", ".env.example"]);

export function isScannableFile(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, "/");
  const base = path.basename(normalized);
  const ext = path.extname(base).toLowerCase();

  if (SCANNABLE_DOTFILES.has(base) || base.startsWith(".env.")) return true;
  if (base.startsWith(".")) return false;
  if (SKIP_EXTENSIONS.has(ext)) return false;
  return true;
}

export function filterScannablePaths(paths: string[]): string[] {
  return paths.filter(isScannableFile);
}

export async function getLocalFileTree(dir: string, maxFiles = 200): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentDir: string, prefix: string): Promise<void> {
    if (files.length >= maxFiles) return;

    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (files.length >= maxFiles) break;

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        if (entry.name.startsWith(".") && !SCANNABLE_DOTFILES.has(entry.name)) continue;
        const subPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
        await walk(path.join(currentDir, entry.name), subPrefix);
      } else if (entry.isFile()) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (!isScannableFile(rel)) continue;
        try {
          const stat = await fs.promises.stat(path.join(currentDir, entry.name));
          if (stat.size > MAX_FILE_SIZE_BYTES) continue;
        } catch {
          continue;
        }
        files.push(rel);
      }
    }
  }

  await walk(dir, "");
  return files;
}

export async function getLocalFileContent(dir: string, relPath: string): Promise<string | null> {
  try {
    const resolved = path.resolve(dir, relPath);
    if (!resolved.startsWith(path.resolve(dir) + path.sep) && resolved !== path.resolve(dir)) {
      return null;
    }
    return await fs.promises.readFile(resolved, "utf-8");
  } catch {
    return null;
  }
}

export async function searchLocalFiles(
  dir: string,
  allFiles: string[],
  pattern: string,
  maxResults = 20
): Promise<string[]> {
  const regex = new RegExp(pattern, "gi");
  const matches: string[] = [];

  for (const fp of allFiles.slice(0, 80)) {
    if (matches.length >= maxResults) break;
    const content = await getLocalFileContent(dir, fp);
    if (!content) continue;
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      regex.lastIndex = 0;
      if (regex.test(lines[i]!) && matches.length < maxResults) {
        matches.push(`${fp}:${i + 1}: ${lines[i]!.trim()}`);
      }
    }
  }

  return matches;
}

export function getScanDir(scanId: number): string {
  return path.join(os.tmpdir(), `threat-legion-${scanId}`);
}

export async function cleanupScanDir(scanId: number): Promise<void> {
  try {
    await fs.promises.rm(getScanDir(scanId), { recursive: true, force: true });
  } catch {
    // ignore
  }
}

export async function resolveExistingFiles(scanDir: string, relativePaths: string[]): Promise<string[]> {
  const existing: string[] = [];
  for (const rel of relativePaths) {
    const normalized = rel.replace(/\\/g, "/");
    if (!isScannableFile(normalized)) continue;
    const full = path.join(scanDir, normalized);
    try {
      const stat = await fs.promises.stat(full);
      if (stat.isFile() && stat.size <= MAX_FILE_SIZE_BYTES) {
        existing.push(normalized);
      }
    } catch {
      // file deleted or missing
    }
  }
  return existing;
}
