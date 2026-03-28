import app from "./app";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { scansTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getOrCreateSystemUser } from "./routes/auth";

const rawPort = process.env["PORT"] ?? "8080";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start() {
  await getOrCreateSystemUser();
  logger.info("System user initialized");

  const orphaned = await db
    .update(scansTable)
    .set({ status: "failed", completedAt: new Date() })
    .where(eq(scansTable.status, "running"))
    .returning({ id: scansTable.id });

  if (orphaned.length > 0) {
    logger.warn({ ids: orphaned.map((r) => r.id) }, "Marked orphaned running scans as failed on startup");
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

start();
