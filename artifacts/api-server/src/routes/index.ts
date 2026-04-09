import { Router, type IRouter } from "express";
import healthRouter from "./health";
import paymentsRouter from "./payments";
import disputesRouter from "./disputes";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/payments", paymentsRouter);
router.use("/disputes", disputesRouter);

export default router;
