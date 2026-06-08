import { Router, type IRouter } from "express";
import { GetChannelAnalyticsQueryParams, GetVideoAnalyticsQueryParams, GetBestPublishTimeQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min) + min);
}

router.get("/analytics/channel", requireAuth, async (req, res): Promise<void> => {
  const params = GetChannelAnalyticsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { channelId, range = "30d" } = params.data;
  const days = range === "7d" ? 7 : range === "90d" ? 90 : range === "1y" ? 365 : 30;

  const dailyMetrics = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - i));
    return {
      date: d.toISOString().split("T")[0],
      views: randomBetween(1000, 15000),
      watchTimeHours: randomBetween(50, 800),
      subscribers: randomBetween(-20, 120),
    };
  });

  const totalViews = dailyMetrics.reduce((s, d) => s + d.views, 0);
  const totalWatchTime = dailyMetrics.reduce((s, d) => s + d.watchTimeHours, 0);
  const subscriberGain = dailyMetrics.reduce((s, d) => s + d.subscribers, 0);

  const topVideos = Array.from({ length: 5 }, (_, i) => ({
    videoId: `vid_${channelId}_${i}`,
    title: `Top Video #${i + 1} — Channel ${channelId}`,
    views: randomBetween(5000, 100000),
    ctr: parseFloat((Math.random() * 10 + 2).toFixed(1)),
    thumbnailUrl: null,
  })).sort((a, b) => b.views - a.views);

  res.json({
    channelId,
    range,
    views: totalViews,
    watchTimeHours: parseFloat(totalWatchTime.toFixed(1)),
    subscribers: randomBetween(500, 50000),
    subscriberGain,
    averageCtr: parseFloat((Math.random() * 8 + 3).toFixed(1)),
    estimatedRevenue: parseFloat((totalViews * 0.003).toFixed(2)),
    topVideos,
    dailyMetrics,
  });
});

router.get("/analytics/video", requireAuth, async (req, res): Promise<void> => {
  const params = GetVideoAnalyticsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { videoId } = params.data;
  const views = randomBetween(10000, 500000);
  res.json({
    videoId,
    title: `Video ${videoId}`,
    views,
    watchTimeHours: parseFloat((views * 0.05).toFixed(1)),
    averageViewDuration: parseFloat((Math.random() * 400 + 60).toFixed(0)),
    ctr: parseFloat((Math.random() * 10 + 2).toFixed(1)),
    impressions: randomBetween(50000, 2000000),
    likes: randomBetween(100, 10000),
    comments: randomBetween(10, 2000),
    estimatedRevenue: parseFloat((views * 0.003).toFixed(2)),
  });
});

router.get("/analytics/best-time", requireAuth, async (req, res): Promise<void> => {
  const params = GetBestPublishTimeQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const heatmap = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const isPeak = (day >= 1 && day <= 5 && hour >= 12 && hour <= 20) ||
        ((day === 0 || day === 6) && hour >= 10 && hour <= 22);
      heatmap.push({
        dayOfWeek: day,
        hourOfDay: hour,
        score: isPeak ? parseFloat((Math.random() * 0.5 + 0.5).toFixed(2)) : parseFloat((Math.random() * 0.4).toFixed(2)),
      });
    }
  }
  res.json({ heatmap });
});

export default router;
