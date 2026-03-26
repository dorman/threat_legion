import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import type { User } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

export const SYSTEM_USER_ID = "system";

const router: IRouter = Router();

type DbUser = typeof usersTable.$inferSelect;

export function toApiUser(user: DbUser): User {
  return {
    id: user.id,
    email: user.email ?? null,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    profileImageUrl: user.profileImageUrl ?? null,
    githubUsername: user.githubUsername ?? null,
    acceptedDisclaimerAt: user.acceptedDisclaimerAt ?? null,
    tier: (user.tier as "free" | "paid") ?? "free",
    aiProvider: user.aiProvider ?? null,
    aiModel: user.aiModel ?? null,
    hasApiKey: Boolean(user.aiApiKey),
  };
}

export async function getOrCreateSystemUser(): Promise<User> {
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, SYSTEM_USER_ID))
    .limit(1);

  if (existing) return toApiUser(existing);

  const [created] = await db
    .insert(usersTable)
    .values({ id: SYSTEM_USER_ID, tier: "paid" })
    .returning();

  return toApiUser(created!);
}

router.get("/auth/me", async (_req: Request, res: Response) => {
  try {
    const user = await getOrCreateSystemUser();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to load settings" });
  }
});

const VALID_PROVIDERS = ["anthropic", "openai", "deepseek", "groq"] as const;
type ValidProvider = (typeof VALID_PROVIDERS)[number];

router.put("/auth/ai-settings", async (req: Request, res: Response) => {
  const { provider, apiKey, model } = req.body as {
    provider?: unknown;
    apiKey?: unknown;
    model?: unknown;
  };

  if (
    !provider ||
    typeof provider !== "string" ||
    !(VALID_PROVIDERS as readonly string[]).includes(provider)
  ) {
    res.status(400).json({
      error: `provider must be one of: ${VALID_PROVIDERS.join(", ")}`,
    });
    return;
  }

  if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
    res.status(400).json({ error: "apiKey is required and must be a non-empty string" });
    return;
  }

  await getOrCreateSystemUser();

  const [updated] = await db
    .update(usersTable)
    .set({
      aiProvider: provider as ValidProvider,
      aiApiKey: apiKey.trim(),
      aiModel: model && typeof model === "string" && model.trim() ? model.trim() : null,
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, SYSTEM_USER_ID))
    .returning();

  res.json(toApiUser(updated!));
});

export default router;
