import { Router, type IRouter } from "express";
import { db, competitorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ListCompetitorsQueryParams, AddCompetitorBody, RemoveCompetitorParams } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/competitors", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = ListCompetitorsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const competitors = await db.select().from(competitorsTable).where(eq(competitorsTable.channelId, params.data.channelId));
  res.json(competitors);
});

router.post("/competitors", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = AddCompetitorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { channelId, youtubeChannelId, name, handle, thumbnailUrl } = parsed.data;
  const [competitor] = await db.insert(competitorsTable).values({
    channelId,
    youtubeChannelId,
    name,
    handle: handle ?? null,
    thumbnailUrl: thumbnailUrl ?? null,
    subscriberCount: Math.floor(Math.random() * 1000000) + 1000,
    averageViews: Math.floor(Math.random() * 50000) + 500,
    uploadFrequency: parseFloat((Math.random() * 4 + 0.5).toFixed(1)),
    lastFetchedAt: new Date(),
  }).returning();
  res.status(201).json(competitor);
});

router.delete("/competitors/:competitorId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = RemoveCompetitorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(competitorsTable).where(eq(competitorsTable.id, params.data.competitorId));
  res.sendStatus(204);
});

export default router;
