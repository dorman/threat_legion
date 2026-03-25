import app from "./app";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { scansTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start() {
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
