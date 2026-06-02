import { getLocalFileTree } from "./local-files";

const AI_SURFACE_PATH_PATTERNS: RegExp[] = [
  /^\.cursor\//,
  /^\.cursor\/rules\//,
  /^\.cursorrules$/i,
  /(?:^|\/)AGENTS\.md$/i,
  /(?:^|\/)CLAUDE\.md$/i,
  /(?:^|\/)mcp\.json$/i,
  /(?:^|\/)\.mcp\.json$/i,
  /(?:^|\/)cursor\.rules$/i,
  /(?:^|\/)rules?\/.*\.mdc$/i,
];

const AI_SURFACE_NAME_PATTERNS: RegExp[] = [
  /prompt/i,
  /embedding/i,
  /embeddings/i,
  /vector/i,
  /retriev/i,
  /\brag\b/i,
  /langchain/i,
  /llamaindex/i,
  /llama[_-]?index/i,
  /openai/i,
  /anthropic/i,
  /\bmcp\b/i,
  /tool[_-]?call/i,
  /function[_-]?call/i,
  /agent[_-]?loop/i,
  /chat[_-]?completion/i,
  /system[_-]?prompt/i,
];

export function isAiSurfacePath(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, "/");
  const base = normalized.split("/").pop() ?? normalized;

  if (AI_SURFACE_PATH_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  return AI_SURFACE_NAME_PATTERNS.some(
    (pattern) => pattern.test(normalized) || pattern.test(base)
  );
}

export async function collectAiSurfaceFiles(scanDir: string, maxFiles = 40): Promise<string[]> {
  const tree = await getLocalFileTree(scanDir, 500);
  const matches = tree.filter(isAiSurfacePath);
  return matches.slice(0, maxFiles);
}

export function mergeScanFileList(changed: string[], aiSurfaces: string[]): string[] {
  return [...new Set([...changed, ...aiSurfaces])];
}
