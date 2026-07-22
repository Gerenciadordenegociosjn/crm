import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import clientsRouter from "./clients";
import dealsRouter from "./deals";
import activitiesRouter from "./activities";
import adAccountsRouter from "./ad-accounts";
import dashboardRouter from "./dashboard";
import integrationsRouter from "./integrations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(clientsRouter);
router.use(dealsRouter);
router.use(activitiesRouter);
router.use(adAccountsRouter);
router.use(dashboardRouter);
router.use(integrationsRouter);

export default router;
