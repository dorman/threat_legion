import { db, scansTable, findingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  runScanCore,
  cleanupScanDir,
  type ScanEvent,
  type FindingData,
  type LLMConfig,
} from "@workspace/scan-core";

export type { ScanEvent, FindingData } from "@workspace/scan-core";

export async function runScan(
  scanId: number,
  scanDir: string,
  projectName: string,
  aiConfig: LLMConfig,
  onEvent: (event: ScanEvent) => void
): Promise<void> {
  await runScanCore({
    scanId,
    scanDir,
    projectName,
    aiConfig,
    profile: "ai-app",
    onEvent,
    onStart: async () => {
      await db
        .update(scansTable)
        .set({ status: "running", startedAt: new Date() })
        .where(eq(scansTable.id, scanId));
    },
    onFinding: async (finding) => {
      await db.insert(findingsTable).values({
        scanId,
        severity: finding.severity,
        title: finding.title,
        filePath: finding.filePath ?? null,
        lineStart: finding.lineStart ?? null,
        lineEnd: finding.lineEnd ?? null,
        description: finding.description,
        remediation: finding.remediation,
        codeSnippet: finding.codeSnippet ?? null,
      });
    },
    onComplete: async (result) => {
      await db
        .update(scansTable)
        .set({
          status: "completed",
          completedAt: new Date(),
          summary: result.summary,
          score: result.score,
          criticalCount: result.criticalCount,
          highCount: result.highCount,
          mediumCount: result.mediumCount,
          lowCount: result.lowCount,
        })
        .where(eq(scansTable.id, scanId));
    },
    onFail: async () => {
      await db
        .update(scansTable)
        .set({ status: "failed", completedAt: new Date() })
        .where(eq(scansTable.id, scanId));
    },
    cleanup: async () => {
      await cleanupScanDir(scanId);
    },
  });
}
