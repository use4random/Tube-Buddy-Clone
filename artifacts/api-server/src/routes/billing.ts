import { Router, type IRouter } from "express";
import { db, subscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

const PLANS = [
  {
    id: "free",
    name: "Free",
    tier: "free" as const,
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      "Basic SEO checklist",
      "Limited keyword research (5/day)",
      "Basic tag suggestions",
      "Thumbnail preview tools",
      "Video upload checklist",
      "Comment keyword filters",
      "Basic channel analytics",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tier: "pro" as const,
    monthlyPrice: 4.5,
    annualPrice: 3.6,
    features: [
      "Everything in Free",
      "Full Keyword Explorer",
      "SEO Studio (real-time scoring)",
      "Best Time to Publish heatmap",
      "Tag Rankings Tracker",
      "Enhanced Analytics (CTR, revenue)",
      "Competitor tracking (2 channels)",
      "Playlist management",
      "Comment canned responses",
    ],
  },
  {
    id: "legend",
    name: "Legend",
    tier: "legend" as const,
    monthlyPrice: 28.99,
    annualPrice: 23.19,
    features: [
      "Everything in Pro",
      "A/B Testing Suite (thumbnails + titles)",
      "Unlimited Bulk Editing (up to 1,500 videos)",
      "Bulk Find & Replace with regex",
      "Advanced competitor analysis (10 channels)",
      "12-month historical data",
      "AI Title Generator",
      "AI Description Writer",
      "AI Tag Suggester",
      "AI Video Idea Planner",
      "Priority support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tier: "enterprise" as const,
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      "Everything in Legend",
      "Multi-Channel Dashboard (unlimited)",
      "Role-Based Access Control",
      "Centralized cross-channel reporting",
      "Dedicated account manager",
      "Early access to AI features",
      "White-label / agency mode",
      "Team collaboration tools",
    ],
  },
];

router.get("/billing/plans", async (_req, res): Promise<void> => {
  res.json(PLANS);
});

router.get("/billing/subscription", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, req.userId!));
  if (!sub) {
    res.json({ id: 0, userId: req.userId!, tier: "free", status: "active", currentPeriodEnd: null, createdAt: new Date() });
    return;
  }
  res.json({
    id: sub.id, userId: sub.userId, tier: sub.tier, status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null, createdAt: sub.createdAt,
  });
});

export default router;
