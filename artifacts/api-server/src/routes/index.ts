import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import channelsRouter from "./channels";
import keywordsRouter from "./keywords";
import seoRouter from "./seo";
import experimentsRouter from "./experiments";
import bulkRouter from "./bulk";
import analyticsRouter from "./analytics";
import competitorsRouter from "./competitors";
import commentsRouter from "./comments";
import aiRouter from "./ai";
import billingRouter from "./billing";
import dashboardRouter from "./dashboard";
import googleOauthRouter from "./google-oauth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(channelsRouter);
router.use(keywordsRouter);
router.use(seoRouter);
router.use(experimentsRouter);
router.use(bulkRouter);
router.use(analyticsRouter);
router.use(competitorsRouter);
router.use(commentsRouter);
router.use(aiRouter);
router.use(billingRouter);
router.use(dashboardRouter);
router.use(googleOauthRouter);

export default router;
