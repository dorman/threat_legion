import { Router, type IRouter, type Request, type Response } from "express";
import { db, scansTable, findingsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { parseRepoUrl, verifyRepoOwnership } from "../lib/github";
import { runScan, type ScanEvent } from "../lib/scan-engine";
import { publishScanEvent, subscribeScan } from "../lib/scan-bus";
import type { User } from "@workspace/api-zod";

const router: IRouter = Router();

const activeScanIds = new Set<number>();

function requireAuth(req: Request, res: Response): User | null {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  return req.user as User;
}

function getParamId(req: Request): number | null {
  const raw = req.params["id"];
  const str = Array.isArray(raw) ? raw[0] : raw ?? "";
  const id = parseInt(str, 10);
  return isNaN(id) ? null : id;
}

router.get("/scans", async (req: Request, res: Response) => {
  const user = requireAuth(req, res);
  if (!user) return;

  try {
    const scans = await db
      .select()
      .from(scansTable)
      .where(eq(scansTable.userId, user.id))
      .orderBy(desc(scansTable.createdAt));

    res.json(scans);
  } catch (err) {
    req.log.error({ err }, "Failed to list scans");
    res.status(500).json({ error: "Failed to list scans" });
  }
});

router.post("/scans", async (req: Request, res: Response): Promise<void> => {
  const user = requireAuth(req, res);
  if (!user) return;

  const { repoUrl } = req.body as { repoUrl?: string };

  if (!repoUrl) {
    res.status(400).json({ error: "repoUrl is required" });
    return;
  }

  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) {
    res.status(400).json({
      error: "Invalid GitHub repo URL. Use format: https://github.com/owner/repo",
    });
    return;
  }

  if (!user.githubUsername) {
    res.status(403).json({
      error:
        "GitHub account not linked. Please sign in via a Replit account that has GitHub connected.",
    });
    return;
  }

  const isAuthorized = await verifyRepoOwnership(
    parsed.owner,
    parsed.repo,
    user.githubUsername
  );
  if (!isAuthorized) {
    res.status(403).json({
      error:
        "You can only scan repositories you own or collaborate on. Ensure your GitHub account has access to this repository.",
    });
    return;
  }

  const [scan] = await db
    .insert(scansTable)
    .values({
      userId: user.id,
      repoUrl: repoUrl.replace(/\.git$/, ""),
      repoOwner: parsed.owner,
      repoName: parsed.repo,
      status: "pending",
    })
    .returning();

  activeScanIds.add(scan.id);

  runScan(scan.id, parsed.owner, parsed.repo, (event: ScanEvent) => {
    publishScanEvent(scan.id, event);
  }).catch((err) => {
    req.log.error({ err, scanId: scan.id }, "Background scan failed");
  }).finally(() => {
    activeScanIds.delete(scan.id);
  });

  res.status(201).json(scan);
});

router.get("/scans/:id", async (req: Request, res: Response): Promise<void> => {
  const user = requireAuth(req, res);
  if (!user) return;

  const scanId = getParamId(req);
  if (scanId === null) {
    res.status(400).json({ error: "Invalid scan ID" });
    return;
  }

  const [scan] = await db
    .select()
    .from(scansTable)
    .where(and(eq(scansTable.id, scanId), eq(scansTable.userId, user.id)))
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

router.delete("/scans/:id", async (req: Request, res: Response): Promise<void> => {
  const user = requireAuth(req, res);
  if (!user) return;

  const scanId = getParamId(req);
  if (scanId === null) {
    res.status(400).json({ error: "Invalid scan ID" });
    return;
  }

  const [scan] = await db
    .select()
    .from(scansTable)
    .where(and(eq(scansTable.id, scanId), eq(scansTable.userId, user.id)))
    .limit(1);

  if (!scan) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }

  await db.delete(scansTable).where(eq(scansTable.id, scanId));
  res.status(204).send();
});

router.get("/scans/:id/stream", async (req: Request, res: Response): Promise<void> => {
  const user = requireAuth(req, res);
  if (!user) return;

  const scanId = getParamId(req);
  if (scanId === null) {
    res.status(400).json({ error: "Invalid scan ID" });
    return;
  }

  const [scan] = await db
    .select()
    .from(scansTable)
    .where(and(eq(scansTable.id, scanId), eq(scansTable.userId, user.id)))
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
        : { message: "Scan already failed" }),
    } as ScanEvent);
    res.end();
    return;
  }

  sendEvent({ type: "log", message: `Connecting to scan stream for ${scan.repoOwner}/${scan.repoName}...` });

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
