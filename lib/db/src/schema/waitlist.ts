import { pgTable, serial, varchar, timestamp, boolean } from "drizzle-orm/pg-core";

export const waitlistSignupsTable = pgTable("waitlist_signups", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 200 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  notified: boolean("notified").notNull().default(false),
});

export type WaitlistSignup = typeof waitlistSignupsTable.$inferSelect;
export type InsertWaitlistSignup = typeof waitlistSignupsTable.$inferInsert;
