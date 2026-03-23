import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import passport from "../lib/passport";
import { type User } from "@workspace/db";

const router: IRouter = Router();

const BASE_URL = process.env["REPLIT_DEV_DOMAIN"]
  ? `https://${process.env["REPLIT_DEV_DOMAIN"]}`
  : "http://localhost:3000";

router.get("/auth/github", passport.authenticate("github", { scope: ["read:user", "repo"] }));

router.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: `${BASE_URL}/?error=auth_failed` }),
  (_req: Request, res: Response) => {
    res.redirect(`${BASE_URL}/dashboard`);
  }
);

router.get("/auth/me", (req: Request, res: Response): void => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const user = req.user as User;
  res.json({
    id: user.id,
    githubId: user.githubId,
    login: user.login,
    name: user.name,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  });
});

router.post("/auth/logout", (req: Request, res: Response, next: NextFunction): void => {
  req.logout((err) => {
    if (err) return next(err);
    res.json({ message: "Logged out successfully" });
  });
});

export default router;
