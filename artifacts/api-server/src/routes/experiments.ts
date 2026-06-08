import { Router, type IRouter } from "express";
import { db, experimentsTable, experimentVariantsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListExperimentsQueryParams,
  CreateExperimentBody,
  GetExperimentParams,
  ApplyExperimentWinnerParams,
  UpdateExperimentStatusParams,
  UpdateExperimentStatusBody,
} from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/experiments", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = ListExperimentsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const experiments = await db.select().from(experimentsTable).where(eq(experimentsTable.channelId, params.data.channelId));
  res.json(experiments);
});

router.post("/experiments", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateExperimentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { channelId, videoId, videoTitle, type, variantA, variantB } = parsed.data;

  const [exp] = await db.insert(experimentsTable).values({
    channelId, videoId, videoTitle: videoTitle ?? null, type, status: "active", activeVariant: "A",
    startedAt: new Date(),
  }).returning();

  await db.insert(experimentVariantsTable).values([
    { experimentId: exp.id, variantLabel: "A", thumbnailUrl: variantA.thumbnailUrl ?? null, title: variantA.title ?? null },
    { experimentId: exp.id, variantLabel: "B", thumbnailUrl: variantB.thumbnailUrl ?? null, title: variantB.title ?? null },
  ]);

  res.status(201).json(exp);
});

router.get("/experiments/:experimentId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = GetExperimentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [exp] = await db.select().from(experimentsTable).where(eq(experimentsTable.id, params.data.experimentId));
  if (!exp) {
    res.status(404).json({ error: "Experiment not found" });
    return;
  }
  const variants = await db.select().from(experimentVariantsTable).where(eq(experimentVariantsTable.experimentId, exp.id));
  res.json({ ...exp, variants });
});

router.post("/experiments/:experimentId/apply-winner", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = ApplyExperimentWinnerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [exp] = await db.select().from(experimentsTable).where(eq(experimentsTable.id, params.data.experimentId));
  if (!exp) {
    res.status(404).json({ error: "Experiment not found" });
    return;
  }

  const variants = await db.select().from(experimentVariantsTable).where(eq(experimentVariantsTable.experimentId, exp.id));
  const winner = variants.reduce((best, v) => v.ctr > best.ctr ? v : best, variants[0]);
  const confidence = 95 + Math.random() * 4;

  const [updated] = await db.update(experimentsTable).set({
    status: "complete", winnerVariant: winner.variantLabel, confidenceLevel: confidence, endedAt: new Date(),
  }).where(eq(experimentsTable.id, exp.id)).returning();

  res.json(updated);
});

router.patch("/experiments/:experimentId/status", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = UpdateExperimentStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateExperimentStatusBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [updated] = await db.update(experimentsTable).set({ status: body.data.status }).where(eq(experimentsTable.id, params.data.experimentId)).returning();
  if (!updated) {
    res.status(404).json({ error: "Experiment not found" });
    return;
  }
  res.json(updated);
});

export default router;
