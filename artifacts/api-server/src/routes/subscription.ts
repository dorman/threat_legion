import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getSessionId, getSession, updateSession } from "../lib/auth";
import type { User } from "@workspace/api-zod";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): User | null {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  return req.user as User;
}

async function syncTierToSession(req: Request, tier: string) {
  const sid = getSessionId(req);
  if (!sid) return;
  const session = await getSession(sid);
  if (!session) return;
  session.user = { ...session.user, tier: tier as "free" | "paid" };
  await updateSession(sid, session);
}

router.get("/subscription", (req: Request, res: Response) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const tier = user.tier ?? "free";
  res.json({ tier, price: tier === "paid" ? 10 : 0 });
});

router.post("/subscription/upgrade", async (req: Request, res: Response) => {
  const user = requireAuth(req, res);
  if (!user) return;

  await db
    .update(usersTable)
    .set({ tier: "paid", updatedAt: new Date() })
    .where(eq(usersTable.id, user.id));

  await syncTierToSession(req, "paid");
  req.user = { ...user, tier: "paid" };

  res.json({ tier: "paid", price: 10 });
});

router.post("/subscription/downgrade", async (req: Request, res: Response) => {
  const user = requireAuth(req, res);
  if (!user) return;

  await db
    .update(usersTable)
    .set({ tier: "free", updatedAt: new Date() })
    .where(eq(usersTable.id, user.id));

  await syncTierToSession(req, "free");
  req.user = { ...user, tier: "free" };

  res.json({ tier: "free", price: 0 });
});

export default router;
