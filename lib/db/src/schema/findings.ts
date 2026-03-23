import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { scansTable } from "./scans";

export const findingsTable = pgTable("findings", {
  id: serial("id").primaryKey(),
  scanId: integer("scan_id")
    .notNull()
    .references(() => scansTable.id, { onDelete: "cascade" }),
  severity: text("severity", {
    enum: ["critical", "high", "medium", "low"],
  }).notNull(),
  title: text("title").notNull(),
  filePath: text("file_path"),
  lineStart: integer("line_start"),
  lineEnd: integer("line_end"),
  description: text("description").notNull(),
  remediation: text("remediation").notNull(),
  codeSnippet: text("code_snippet"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFindingSchema = createInsertSchema(findingsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertFinding = z.infer<typeof insertFindingSchema>;
export type Finding = typeof findingsTable.$inferSelect;
