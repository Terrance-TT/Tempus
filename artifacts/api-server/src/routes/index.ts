import { Router, type IRouter } from "express";
import healthRouter from "./health";
import commitmentsRouter from "./commitments";
import schedulesRouter from "./schedules";
import googleCalendarRouter from "./googleCalendar";
import integrationsRouter from "./integrations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(commitmentsRouter);
router.use(schedulesRouter);
router.use(googleCalendarRouter);
router.use(integrationsRouter);

export default router;
