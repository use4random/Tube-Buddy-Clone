import { Router, type IRouter } from "express";
import { db, experimentsTable, bulkJobsTable, keywordSearchesTable } from "@workspace/db";
import { eq, and, gte, count } from "drizzle-orm";
import { GetDashboardSummaryQueryParams } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = GetDashboardSummaryQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { channelId } = params.data;

  const [activeExpCount] = await db.select({ count: count() }).from(experimentsTable).where(
    and(eq(experimentsTable.channelId, channelId), eq(experimentsTable.status, "active"))
  );
  const [completedExpCount] = await db.select({ count: count() }).from(experimentsTable).where(
    and(eq(experimentsTable.channelId, channelId), eq(experimentsTable.status, "complete"))
  );
  const [pendingJobCount] = await db.select({ count: count() }).from(bulkJobsTable).where(
    and(eq(bulkJobsTable.channelId, channelId), eq(bulkJobsTable.status, "pending"))
  );

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const [recentSearchCount] = await db.select({ count: count() }).from(keywordSearchesTable).where(
    and(eq(keywordSearchesTable.channelId, channelId), gte(keywordSearchesTable.searchedAt, thirtyDaysAgo))
  );

  const totalViews = Math.floor(Math.random() * 500000) + 10000;

  res.json({
    channelId,
    totalViews,
    totalSubscribers: Math.floor(Math.random() * 50000) + 500,
    viewsGrowth: parseFloat((Math.random() * 30 - 5).toFixed(1)),
    subscriberGrowth: parseFloat((Math.random() * 20 - 2).toFixed(1)),
    activeExperiments: activeExpCount.count,
    completedExperiments: completedExpCount.count,
    pendingBulkJobs: pendingJobCount.count,
    recentKeywordSearches: recentSearchCount.count,
    seoScoreAverage: parseFloat((Math.random() * 30 + 60).toFixed(0)),
    topPerformingTag: "how to grow on youtube",
    estimatedMonthlyRevenue: parseFloat((totalViews * 0.003).toFixed(2)),
  });
});

export default router;
