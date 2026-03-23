import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import { sessionMiddleware } from "./lib/session";
import passport from "./lib/passport";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

app.use("/api", router);

export default app;
