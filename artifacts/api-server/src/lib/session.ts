import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "@workspace/db";

const PgSession = connectPgSimple(session);

export const sessionMiddleware = session({
  store: new PgSession({
    pool,
    tableName: "sessions",
    createTableIfMissing: true,
  }),
  secret: process.env["SESSION_SECRET"] || "threat-legion-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env["NODE_ENV"] === "production",
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
});
