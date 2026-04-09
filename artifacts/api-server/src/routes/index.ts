import { Router, type IRouter } from "express";
import healthRouter from "./health";
import paymentsRouter from "./payments";
import disputesRouter from "./disputes";
import payoutsRouter from "./payouts";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/payments", paymentsRouter);
router.use("/disputes", disputesRouter);
router.use("/payouts", payoutsRouter);

export default router;
