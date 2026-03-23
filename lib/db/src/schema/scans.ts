import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const scansTable = pgTable("scans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  repoUrl: text("repo_url").notNull(),
  repoOwner: text("repo_owner").notNull(),
  repoName: text("repo_name").notNull(),
  status: text("status", {
    enum: ["pending", "running", "completed", "failed"],
  })
    .notNull()
    .default("pending"),
  summary: text("summary"),
  score: integer("score"),
  criticalCount: integer("critical_count").notNull().default(0),
  highCount: integer("high_count").notNull().default(0),
  mediumCount: integer("medium_count").notNull().default(0),
  lowCount: integer("low_count").notNull().default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertScanSchema = createInsertSchema(scansTable).omit({
  id: true,
  criticalCount: true,
  highCount: true,
  mediumCount: true,
  lowCount: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
});
export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scansTable.$inferSelect;
