import { Router, type IRouter } from "express";
import healthRouter from "./health";
import marketRouter from "./market";
import watchlistRouter from "./watchlist";
import portfolioRouter from "./portfolio";
import tradesRouter from "./trades";
import alertsRouter from "./alerts";
import scannerRouter from "./scanner";
import dashboardRouter from "./dashboard";
import signalsRouter from "./signals";

const router: IRouter = Router();

router.use(healthRouter);
router.use(marketRouter);
router.use(watchlistRouter);
router.use(portfolioRouter);
router.use(tradesRouter);
router.use(alertsRouter);
router.use(scannerRouter);
router.use(dashboardRouter);
router.use(signalsRouter);

export default router;
