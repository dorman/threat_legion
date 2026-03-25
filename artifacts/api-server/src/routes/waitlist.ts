import { Router, type IRouter, type Request, type Response } from "express";
import { db, waitlistSignupsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.post("/waitlist", async (req: Request, res: Response): Promise<void> => {
  const { email, name } = req.body as { email?: string; name?: string };

  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "A valid email address is required." });
    return;
  }

  const trimmedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    res.status(400).json({ error: "Please enter a valid email address." });
    return;
  }

  const trimmedName = name?.trim() ?? null;

  try {
    const existing = await db
      .select({ id: waitlistSignupsTable.id })
      .from(waitlistSignupsTable)
      .where(eq(waitlistSignupsTable.email, trimmedEmail))
      .limit(1);

    if (existing.length > 0) {
      res.status(200).json({ message: "You're already on the waitlist! We'll be in touch." });
      return;
    }

    await db.insert(waitlistSignupsTable).values({
      email: trimmedEmail,
      name: trimmedName,
    });

    res.status(201).json({ message: "You're on the list! We'll notify you when ThreatLegion launches." });
  } catch (err) {
    req.log.error({ err }, "Failed to add waitlist signup");
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

router.get("/waitlist/count", async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db.select({ id: waitlistSignupsTable.id }).from(waitlistSignupsTable);
    res.json({ count: rows.length });
  } catch {
    res.json({ count: 0 });
  }
});

export default router;
