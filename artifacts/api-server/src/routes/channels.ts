import { Router, type IRouter } from "express";
import { db, channelsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { ConnectChannelBody, GetChannelParams, DisconnectChannelParams } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/channels", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const channels = await db.select().from(channelsTable).where(eq(channelsTable.userId, req.userId!));
  res.json(channels.map(c => ({
    id: c.id, userId: c.userId, youtubeChannelId: c.youtubeChannelId,
    name: c.name, handle: c.handle, thumbnailUrl: c.thumbnailUrl,
    subscriberCount: c.subscriberCount, videoCount: c.videoCount,
    isActive: c.isActive, createdAt: c.createdAt,
  })));
});

router.post("/channels", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = ConnectChannelBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [channel] = await db.insert(channelsTable).values({ ...parsed.data, userId: req.userId! }).returning();
  res.status(201).json({
    id: channel.id, userId: channel.userId, youtubeChannelId: channel.youtubeChannelId,
    name: channel.name, handle: channel.handle, thumbnailUrl: channel.thumbnailUrl,
    subscriberCount: channel.subscriberCount, videoCount: channel.videoCount,
    isActive: channel.isActive, createdAt: channel.createdAt,
  });
});

router.get("/channels/:channelId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = GetChannelParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [channel] = await db.select().from(channelsTable).where(
    and(eq(channelsTable.id, params.data.channelId), eq(channelsTable.userId, req.userId!))
  );
  if (!channel) {
    res.status(404).json({ error: "Channel not found" });
    return;
  }
  res.json({
    id: channel.id, userId: channel.userId, youtubeChannelId: channel.youtubeChannelId,
    name: channel.name, handle: channel.handle, thumbnailUrl: channel.thumbnailUrl,
    subscriberCount: channel.subscriberCount, videoCount: channel.videoCount,
    isActive: channel.isActive, createdAt: channel.createdAt,
  });
});

router.delete("/channels/:channelId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = DisconnectChannelParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(channelsTable).where(
    and(eq(channelsTable.id, params.data.channelId), eq(channelsTable.userId, req.userId!))
  );
  res.sendStatus(204);
});

export default router;
