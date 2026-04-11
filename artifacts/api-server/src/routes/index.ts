import { Router, type IRouter } from "express";
import healthRouter from "./health";
import paymentsRouter from "./payments";
import disputesRouter from "./disputes";
import payoutsRouter from "./payouts";
import feedbackRouter from "./feedback";
import moderateImageRouter from "./moderateImage";
import walletRouter from "./wallet";
import authRouter from "./auth";
import profilesRouter from "./profiles";
import pushRouter from "./push";
import smsRouter from "./sms";
import crashReportRouter from "./crashReport";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/payments", paymentsRouter);
router.use("/disputes", disputesRouter);
router.use("/payouts", payoutsRouter);
router.use("/feedback", feedbackRouter);
router.use("/moderate-image", moderateImageRouter);
router.use("/wallet", walletRouter);
router.use("/profiles", profilesRouter);
router.use("/push", pushRouter);
router.use("/sms", smsRouter);
router.use("/crash", crashReportRouter);

export default router;
