import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const GITHUB_CLIENT_ID = process.env["GITHUB_CLIENT_ID"];
const GITHUB_CLIENT_SECRET = process.env["GITHUB_CLIENT_SECRET"];
const BASE_URL = process.env["REPLIT_DEV_DOMAIN"]
  ? `https://${process.env["REPLIT_DEV_DOMAIN"]}`
  : "http://localhost:3000";

if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
  logger.warn(
    "GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are not set. GitHub OAuth will not work."
  );
}

passport.use(
  new GitHubStrategy(
    {
      clientID: GITHUB_CLIENT_ID || "placeholder",
      clientSecret: GITHUB_CLIENT_SECRET || "placeholder",
      callbackURL: `${BASE_URL}/api/auth/github/callback`,
      scope: ["read:user", "repo"],
    },
    async (
      accessToken: string,
      _refreshToken: string,
      profile: { id: string; username: string; displayName: string; photos?: { value: string }[] },
      done: (err: Error | null, user?: unknown) => void
    ) => {
      try {
        const githubId = parseInt(profile.id, 10);
        const existing = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.githubId, githubId))
          .limit(1);

        if (existing.length > 0) {
          const updated = await db
            .update(usersTable)
            .set({
              login: profile.username,
              name: profile.displayName || null,
              avatarUrl: profile.photos?.[0]?.value || null,
              accessToken,
              updatedAt: new Date(),
            })
            .where(eq(usersTable.githubId, githubId))
            .returning();
          return done(null, updated[0]);
        } else {
          const created = await db
            .insert(usersTable)
            .values({
              githubId,
              login: profile.username,
              name: profile.displayName || null,
              avatarUrl: profile.photos?.[0]?.value || null,
              accessToken,
            })
            .returning();
          return done(null, created[0]);
        }
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);

passport.serializeUser((user: unknown, done) => {
  const u = user as { id: number };
  done(null, u.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);
    done(null, users[0] || null);
  } catch (err) {
    done(err);
  }
});

export default passport;
