import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import scansRouter from "./scans";
import subscriptionRouter from "./subscription";
import waitlistRouter from "./waitlist";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(scansRouter);
router.use(subscriptionRouter);
router.use(waitlistRouter);

export default router;
