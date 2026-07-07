import { Router, type IRouter } from "express";
import healthRouter from "./health";
import commitmentsRouter from "./commitments";
import schedulesRouter from "./schedules";
import googleCalendarRouter from "./googleCalendar";
import integrationsRouter from "./integrations";
import preferencesRouter from "./preferences";
import stripeRouter from "./stripe";
import adminRouter from "./admin";
import staffRouter from "./staff";
import manualRequestsRouter from "./manualRequests";

const router: IRouter = Router();

router.use(healthRouter);
router.use(commitmentsRouter);
router.use(schedulesRouter);
router.use(googleCalendarRouter);
router.use(integrationsRouter);
router.use(preferencesRouter);
router.use(stripeRouter);
router.use(adminRouter);
router.use(staffRouter);
router.use(manualRequestsRouter);

export default router;
