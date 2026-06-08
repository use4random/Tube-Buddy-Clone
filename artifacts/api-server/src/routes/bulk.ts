import { Router, type IRouter } from "express";
import { db, bulkJobsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SubmitBulkUpdateBody, SubmitBulkFindReplaceBody, ListBulkJobsQueryParams, GetBulkJobParams } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.post("/bulk/update", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = SubmitBulkUpdateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { channelId, videoIds, changes } = parsed.data;
  const [job] = await db.insert(bulkJobsTable).values({
    channelId,
    userId: req.userId!,
    operationType: "update",
    status: "pending",
    totalVideos: videoIds.length,
    processedVideos: 0,
    jobParams: { videoIds, changes } as Record<string, unknown>,
  }).returning();

  setTimeout(async () => {
    await db.update(bulkJobsTable).set({ status: "completed", processedVideos: videoIds.length, completedAt: new Date() }).where(eq(bulkJobsTable.id, job.id));
  }, 2000);

  res.status(201).json({
    id: job.id, channelId: job.channelId, userId: job.userId, operationType: job.operationType,
    status: job.status, totalVideos: job.totalVideos, processedVideos: job.processedVideos,
    errors: null, createdAt: job.createdAt, completedAt: null,
  });
});

router.post("/bulk/find-replace", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = SubmitBulkFindReplaceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { channelId, search, replace, scope, isRegex } = parsed.data;
  const [job] = await db.insert(bulkJobsTable).values({
    channelId,
    userId: req.userId!,
    operationType: "find_replace",
    status: "pending",
    totalVideos: 0,
    processedVideos: 0,
    jobParams: { search, replace, scope, isRegex } as Record<string, unknown>,
  }).returning();

  setTimeout(async () => {
    await db.update(bulkJobsTable).set({ status: "completed", totalVideos: 10, processedVideos: 10, completedAt: new Date() }).where(eq(bulkJobsTable.id, job.id));
  }, 1500);

  res.status(201).json({
    id: job.id, channelId: job.channelId, userId: job.userId, operationType: job.operationType,
    status: job.status, totalVideos: job.totalVideos, processedVideos: job.processedVideos,
    errors: null, createdAt: job.createdAt, completedAt: null,
  });
});

router.get("/bulk/jobs", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = ListBulkJobsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const jobs = await db.select().from(bulkJobsTable).where(eq(bulkJobsTable.channelId, params.data.channelId));
  res.json(jobs.map(j => ({
    id: j.id, channelId: j.channelId, userId: j.userId, operationType: j.operationType,
    status: j.status, totalVideos: j.totalVideos, processedVideos: j.processedVideos,
    errors: j.errors ? (j.errors as { message: string }[]).length : null,
    createdAt: j.createdAt, completedAt: j.completedAt,
  })));
});

router.get("/bulk/jobs/:jobId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = GetBulkJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [job] = await db.select().from(bulkJobsTable).where(eq(bulkJobsTable.id, params.data.jobId));
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json({
    id: job.id, channelId: job.channelId, userId: job.userId, operationType: job.operationType,
    status: job.status, totalVideos: job.totalVideos, processedVideos: job.processedVideos,
    errors: job.errors ? (job.errors as { message: string }[]).length : null,
    createdAt: job.createdAt, completedAt: job.completedAt,
  });
});

export default router;
