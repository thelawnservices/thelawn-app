import { Router, type IRouter } from "express";
import healthRouter from "./health";
import paymentsRouter from "./payments";
import disputesRouter from "./disputes";
import payoutsRouter from "./payouts";
import feedbackRouter from "./feedback";
import moderateImageRouter from "./moderateImage";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/payments", paymentsRouter);
router.use("/disputes", disputesRouter);
router.use("/payouts", payoutsRouter);
router.use("/feedback", feedbackRouter);
router.use("/moderate-image", moderateImageRouter);

export default router;
