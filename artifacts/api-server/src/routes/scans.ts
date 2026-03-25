import { Router, type IRouter, type Request, type Response } from "express";
import { db, scansTable, findingsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { parseRepoUrl, verifyRepoOwnership, getConnectorGithubUsername, checkRepoVisibility } from "../lib/github";
import { runScan, type ScanEvent } from "../lib/scan-engine";
import { publishScanEvent, subscribeScan } from "../lib/scan-bus";
import { getSessionId, getSession, updateSession } from "../lib/auth";
import type { User } from "@workspace/api-zod";

const router: IRouter = Router();

const activeScanIds = new Set<number>();

/**
 * The workspace GitHub connector is tied to a single GitHub account belonging
 * to the Replit workspace owner. We enforce that only that owner can initiate
 * scans, ensuring the GitHub identity used for ownership verification matches
 * the authenticated user making the request.
 */
const WORKSPACE_OWNER_ID = process.env["REPL_OWNER_ID"] ?? "";

function requireAuth(req: Request, res: Response): User | null {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  return req.user as User;
}

function requireWorkspaceOwner(user: User, res: Response): boolean {
  if (!WORKSPACE_OWNER_ID || user.id !== WORKSPACE_OWNER_ID) {
    res.status(403).json({
      error:
        "Scan access is restricted to the workspace owner. The GitHub connector used for repository verification is tied to a single account.",
    });
    return false;
  }
  return true;
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

  if (!requireWorkspaceOwner(user, res)) return;

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

  const visibility = await checkRepoVisibility(parsed.owner, parsed.repo);
  if (visibility === "private") {
    res.status(403).json({
      error:
        "Private repositories cannot be scanned. ThreatLegion uses a third-party AI provider (Claude AI by Anthropic) to analyse code. To protect your privacy, we only permit scanning of public repositories so that no private source code is ever sent to an external AI service.",
      code: "PRIVATE_REPO",
    });
    return;
  }
  if (visibility === "not_found") {
    res.status(404).json({
      error: "Repository not found. Please check the URL and ensure the repository exists.",
    });
    return;
  }

  let githubUsername = user.githubUsername;

  const liveUsername = await getConnectorGithubUsername();
  if (liveUsername) {
    githubUsername = liveUsername;
    if (liveUsername !== user.githubUsername) {
      try {
        await db
          .update(usersTable)
          .set({ githubUsername: liveUsername, updatedAt: new Date() })
          .where(eq(usersTable.id, user.id));

        const sid = getSessionId(req);
        if (sid) {
          const session = await getSession(sid);
          if (session) {
            session.user = { ...session.user, githubUsername: liveUsername };
            await updateSession(sid, session);
          }
        }
      } catch (err) {
        req.log.warn({ err }, "Failed to persist refreshed githubUsername");
      }
    }
  }

  if (!githubUsername) {
    res.status(403).json({
      error:
        "GitHub is not connected. Please connect your GitHub account to Replit and try again.",
    });
    return;
  }

  const isAuthorized = await verifyRepoOwnership(
    parsed.owner,
    parsed.repo,
    githubUsername
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

  const userTier = (user as User & { tier?: string }).tier ?? "free";
  const filteredFindings = findings.map((f) => {
    if (userTier === "paid") return f;
    if (f.severity === "critical" || f.severity === "high") {
      return {
        ...f,
        description: "Upgrade to the Pro plan to view this finding.",
        remediation: "Upgrade to the Pro plan to view remediation details.",
        codeSnippet: null,
        filePath: null,
        lineStart: null,
        lineEnd: null,
        locked: true,
      };
    }
    return f;
  });

  res.json({ ...scan, findings: filteredFindings });
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
