import * as oidc from "openid-client";
import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import {
  getOidcConfig,
  getSessionId,
  getSession,
  createSession,
  updateSession,
  deleteSession,
  SESSION_COOKIE,
  SESSION_TTL,
  type SessionData,
} from "../lib/auth";
import { getConnectorGithubUsername } from "../lib/github";
import type { User } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const OIDC_COOKIE_TTL = 10 * 60 * 1000;

const router: IRouter = Router();

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function setOidcCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
  });
}

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

async function upsertUser(
  claims: Record<string, unknown>,
  githubUsername: string | null
): Promise<User> {
  const userData = {
    id: claims.sub as string,
    email: (claims.email as string) || null,
    firstName: (claims.first_name as string) || null,
    lastName: (claims.last_name as string) || null,
    profileImageUrl: ((claims.profile_image_url || claims.picture) as string) || null,
    githubUsername,
  };

  const [user] = await db
    .insert(usersTable)
    .values(userData)
    .onConflictDoUpdate({
      target: usersTable.id,
      set: {
        ...userData,
        updatedAt: new Date(),
      },
    })
    .returning();
  return {
    id: user.id,
    email: user.email ?? null,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    profileImageUrl: user.profileImageUrl ?? null,
    githubUsername: user.githubUsername ?? null,
    acceptedDisclaimerAt: user.acceptedDisclaimerAt ?? null,
    tier: (user.tier as "free" | "paid") ?? "free",
  };
}

router.get("/auth/me", (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json(req.user);
});

router.get("/auth/login", async (req: Request, res: Response) => {
  try {
    const config = await getOidcConfig();
    const callbackUrl = `${getOrigin(req)}/api/auth/callback`;
    const returnTo = getSafeReturnTo(req.query.returnTo);

    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

    const redirectTo = oidc.buildAuthorizationUrl(config, {
      redirect_uri: callbackUrl,
      scope: "openid email profile offline_access",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      prompt: "login consent",
      state,
      nonce,
    });

    setOidcCookie(res, "code_verifier", codeVerifier);
    setOidcCookie(res, "nonce", nonce);
    setOidcCookie(res, "state", state);
    setOidcCookie(res, "return_to", returnTo);

    res.redirect(redirectTo.href);
  } catch (err) {
    res.status(500).json({ error: "Failed to initiate login" });
  }
});

router.get("/auth/callback", async (req: Request, res: Response) => {
  try {
    const config = await getOidcConfig();
    const callbackUrl = `${getOrigin(req)}/api/auth/callback`;

    const codeVerifier = req.cookies?.code_verifier;
    const nonce = req.cookies?.nonce;
    const expectedState = req.cookies?.state;
    const returnTo = getSafeReturnTo(req.cookies?.return_to);

    if (!codeVerifier || !expectedState) {
      res.redirect("/api/auth/login");
      return;
    }

    const currentUrl = new URL(
      `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
    );

    const tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
    });

    const claims = tokens.claims();
    if (!claims) {
      res.redirect("/api/auth/login");
      return;
    }

    const githubUsername = await getConnectorGithubUsername();
    const user = await upsertUser(claims as unknown as Record<string, unknown>, githubUsername);

    const now = Math.floor(Date.now() / 1000);
    const sessionData: SessionData = {
      user,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
    };

    const sid = await createSession(sessionData);
    setSessionCookie(res, sid);

    res.clearCookie("code_verifier");
    res.clearCookie("nonce");
    res.clearCookie("state");
    res.clearCookie("return_to");

    res.redirect(returnTo || "/");
  } catch (err) {
    res.redirect("/api/auth/login");
  }
});

router.post("/auth/accept-disclaimer", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const currentUser = req.user as User;
  const acceptedAt = new Date();

  const [updated] = await db
    .update(usersTable)
    .set({ acceptedDisclaimerAt: acceptedAt, updatedAt: acceptedAt })
    .where(eq(usersTable.id, currentUser.id))
    .returning();

  const updatedUser: User = {
    id: updated.id,
    email: updated.email ?? null,
    firstName: updated.firstName ?? null,
    lastName: updated.lastName ?? null,
    profileImageUrl: updated.profileImageUrl ?? null,
    githubUsername: updated.githubUsername ?? null,
    acceptedDisclaimerAt: updated.acceptedDisclaimerAt ?? null,
    tier: updated.tier as "free" | "paid",
  };

  const sid = getSessionId(req);
  if (sid) {
    const session = await getSession(sid);
    if (session) {
      await updateSession(sid, { ...session, user: updatedUser });
    }
  }

  res.json(updatedUser);
});

router.post("/auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) {
    await deleteSession(sid);
  }
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ message: "Logged out successfully" });
});

export default router;
