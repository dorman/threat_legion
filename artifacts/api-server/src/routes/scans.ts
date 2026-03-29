import { Router, type IRouter, type Request, type Response } from "express";
import { db, scansTable, findingsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { runScan, type ScanEvent } from "../lib/scan-engine";
import { publishScanEvent, subscribeScan } from "../lib/scan-bus";
import { SYSTEM_USER_ID, getOrCreateSystemUser } from "./auth";
import type { LLMConfig } from "../lib/ai-provider";
import { getScanDir } from "../lib/local-files";
import multer from "multer";
import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";

const router: IRouter = Router();

const activeScanIds = new Set<number>();

// Multer: hold all uploads in memory (source code is small text files)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,   // 50MB per file
    files: 2000,                    // up to 2000 files for folder upload
    fieldSize: 1 * 1024 * 1024,    // 1MB for text fields
  },
});

// Accept either a single zip (`file`) or many folder files (`files`)
const uploadMiddleware = upload.fields([
  { name: "file", maxCount: 1 },
  { name: "files", maxCount: 2000 },
]);

function getParamId(req: Request): number | null {
  const raw = req.params["id"];
  const str = Array.isArray(raw) ? raw[0] : raw ?? "";
  const id = parseInt(str, 10);
  return isNaN(id) ? null : id;
}

/** Strip any leading segment that looks like a zip root dir (e.g. "myproject-main/src/..." → "src/...") */
function stripZipRootDir(entries: AdmZip.IZipEntry[]): string | null {
  const topLevelDirs = new Set<string>();
  for (const e of entries) {
    const parts = e.entryName.split("/");
    if (parts[0]) topLevelDirs.add(parts[0]);
  }
  // If all entries share a single top-level dir, strip it
  if (topLevelDirs.size === 1) {
    return [...topLevelDirs][0]!;
  }
  return null;
}

/** Write uploaded files to the scan temp dir */
async function writeFilesToScanDir(
  scanDir: string,
  files: Express.Multer.File[]
): Promise<void> {
  await fs.promises.mkdir(scanDir, { recursive: true });

  for (const file of files) {
    // Sanitize the path — originalname holds the webkitRelativePath
    const relPath = file.originalname
      .split(/[/\\]/)
      .map((p) => path.basename(p)) // strip any traversal
      .join(path.sep);

    // But we want to preserve directory structure — use original slashes safely
    const safeParts = file.originalname
      .replace(/\\/g, "/")
      .split("/")
      .filter((p) => p && p !== ".." && p !== ".");
    const safePath = safeParts.join(path.sep);

    if (!safePath) continue;

    const fullPath = path.join(scanDir, safePath);
    // Double-check the resolved path is inside scanDir
    if (!fullPath.startsWith(scanDir + path.sep)) continue;

    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, file.buffer);
  }
}

/** Extract a zip buffer to the scan temp dir */
async function extractZipToScanDir(
  scanDir: string,
  buffer: Buffer
): Promise<void> {
  await fs.promises.mkdir(scanDir, { recursive: true });

  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  const rootDir = stripZipRootDir(entries);

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    let entryPath = entry.entryName.replace(/\\/g, "/");

    // Strip common zip root dir if present
    if (rootDir && entryPath.startsWith(rootDir + "/")) {
      entryPath = entryPath.slice(rootDir.length + 1);
    }

    if (!entryPath) continue;

    // Sanitize: no path traversal
    const safeParts = entryPath
      .split("/")
      .filter((p) => p && p !== ".." && p !== ".");
    if (safeParts.length === 0) continue;
    const safePath = safeParts.join(path.sep);

    const fullPath = path.join(scanDir, safePath);
    if (!fullPath.startsWith(scanDir + path.sep)) continue;

    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, entry.getData());
  }
}

// ── GET /scans ────────────────────────────────────────────────────────────────

router.get("/scans", async (req: Request, res: Response) => {
  try {
    const scans = await db
      .select()
      .from(scansTable)
      .orderBy(desc(scansTable.createdAt));

    res.json(scans);
  } catch (err) {
    req.log.error({ err }, "Failed to list scans");
    res.status(500).json({ error: "Failed to list scans" });
  }
});

// ── POST /scans ───────────────────────────────────────────────────────────────

router.post("/scans", (req: Request, res: Response): void => {
  uploadMiddleware(req, res, (uploadErr) => {
    void (async () => {
    if (uploadErr) {
      res.status(400).json({ error: `Upload error: ${(uploadErr as Error).message}` });
      return;
    }

    try {
    // Check AI config first
    await getOrCreateSystemUser();
    const [dbUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, SYSTEM_USER_ID))
      .limit(1);

    if (!dbUser?.aiApiKey || !dbUser?.aiProvider) {
      res.status(400).json({
        error:
          "No AI provider configured. Please go to Settings and add your API key before starting a scan.",
        code: "NO_AI_KEY",
      });
      return;
    }

    const aiConfig: LLMConfig = {
      provider: dbUser.aiProvider as LLMConfig["provider"],
      apiKey: dbUser.aiApiKey,
      model: dbUser.aiModel ?? undefined,
    };

    const fields = req.files as Record<string, Express.Multer.File[]> | undefined;
    const zipFiles = fields?.["file"] ?? [];
    const folderFiles = fields?.["files"] ?? [];
    const isZip = zipFiles.length === 1;
    const isFolder = folderFiles.length > 0;

    if (!isZip && !isFolder) {
      res.status(400).json({
        error: "No files uploaded. Send a ZIP file in the 'file' field or folder files in the 'files' field.",
      });
      return;
    }

    // Derive project name from the uploaded filename / first folder file path
    let projectName = "uploaded-project";
    if (isZip) {
      projectName = path.basename(zipFiles[0]!.originalname, ".zip") || "project";
    } else {
      // webkitRelativePath looks like "myproject/src/index.ts" — take first segment
      // Skip dot-files (e.g. .git-blame-ignore-revs) when picking the project name
      const nonDotFile = folderFiles.find((f) => {
        const firstSeg = f.originalname.replace(/\\/g, "/").split("/")[0] ?? "";
        return firstSeg && !firstSeg.startsWith(".");
      });
      const firstPath = (nonDotFile ?? folderFiles[0]!).originalname.replace(/\\/g, "/");
      const rootSegment = firstPath.split("/")[0];
      if (rootSegment) projectName = rootSegment;
    }
    // Sanitize project name
    projectName = projectName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64);

    // Create scan record
    const [scan] = await db
      .insert(scansTable)
      .values({
        userId: SYSTEM_USER_ID,
        repoUrl: isZip ? zipFiles[0]!.originalname : projectName,
        repoOwner: "local",
        repoName: projectName,
        status: "pending",
      })
      .returning();

    const scanDir = getScanDir(scan.id);

    try {
      if (isZip) {
        await extractZipToScanDir(scanDir, zipFiles[0]!.buffer);
      } else {
        await writeFilesToScanDir(scanDir, folderFiles);
      }
    } catch (fsErr) {
      req.log.error({ fsErr, scanId: scan.id }, "Failed to write uploaded files");
      await db.delete(scansTable).where(eq(scansTable.id, scan.id));
      res.status(500).json({ error: "Failed to process uploaded files" });
      return;
    }

    activeScanIds.add(scan.id);

    runScan(scan.id, scanDir, projectName, aiConfig, (event: ScanEvent) => {
      publishScanEvent(scan.id, event);
    })
      .catch((err) => {
        req.log.error({ err, scanId: scan.id }, "Background scan failed");
      })
      .finally(() => {
        activeScanIds.delete(scan.id);
      });

    res.status(201).json(scan);
    } catch (err) {
      req.log.error({ err }, "Unexpected error in POST /scans");
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error. Check server logs." });
      }
    }
    })();
  });
});

// ── GET /scans/:id ────────────────────────────────────────────────────────────

router.get("/scans/:id", async (req: Request, res: Response): Promise<void> => {
  const scanId = getParamId(req);
  if (scanId === null) {
    res.status(400).json({ error: "Invalid scan ID" });
    return;
  }

  const [scan] = await db
    .select()
    .from(scansTable)
    .where(eq(scansTable.id, scanId))
    .limit(1);

  if (!scan) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }

  const findings = await db
    .select()
    .from(findingsTable)
    .where(eq(findingsTable.scanId, scanId))
    .orderBy(findingsTable.severity);

  res.json({ ...scan, findings });
});

// ── DELETE /scans/:id ─────────────────────────────────────────────────────────

router.delete("/scans/:id", async (req: Request, res: Response): Promise<void> => {
  const scanId = getParamId(req);
  if (scanId === null) {
    res.status(400).json({ error: "Invalid scan ID" });
    return;
  }

  const [scan] = await db
    .select()
    .from(scansTable)
    .where(eq(scansTable.id, scanId))
    .limit(1);

  if (!scan) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }

  await db.delete(scansTable).where(eq(scansTable.id, scanId));
  res.status(204).send();
});

// ── GET /scans/:id/stream ─────────────────────────────────────────────────────

router.get("/scans/:id/stream", async (req: Request, res: Response): Promise<void> => {
  const scanId = getParamId(req);
  if (scanId === null) {
    res.status(400).json({ error: "Invalid scan ID" });
    return;
  }

  const [scan] = await db
    .select()
    .from(scansTable)
    .where(eq(scansTable.id, scanId))
    .limit(1);

  if (!scan) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const sendEvent = (event: ScanEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  if (scan.status === "completed" || scan.status === "failed") {
    sendEvent({
      type: scan.status === "completed" ? "complete" : "error",
      ...(scan.status === "completed"
        ? { score: scan.score ?? 0, summary: scan.summary ?? "Scan complete" }
        : { message: "Scan failed" }),
    } as ScanEvent);
    res.end();
    return;
  }

  if (!activeScanIds.has(scanId)) {
    await db
      .update(scansTable)
      .set({ status: "failed", completedAt: new Date() })
      .where(eq(scansTable.id, scanId));
    sendEvent({ type: "error", message: "Scan process was interrupted. Please start a new scan." } as ScanEvent);
    res.end();
    return;
  }

  sendEvent({ type: "log", message: `Connecting to scan stream for '${scan.repoName}'...` });

  const unsubscribe = subscribeScan(scanId, (event) => {
    sendEvent(event);
    if (event.type === "complete" || event.type === "error") {
      res.end();
    }
  });

  req.on("close", () => {
    unsubscribe();
  });
});

export default router;
