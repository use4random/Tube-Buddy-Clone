import { Router, type IRouter } from "express";
import { db, subscriptionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";
import Stripe from "stripe";

const router: IRouter = Router();

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-01-27.acacia" as any })
  : null;

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
    id: sub.id,
    userId: sub.userId,
    tier: sub.tier,
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toISOString() : null,
    createdAt: sub.createdAt,
  });
});

router.post("/billing/subscribe", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const { tier } = req.body;
    if (!["pro", "legend"].includes(tier)) {
      res.status(400).json({ error: "Invalid subscription tier" });
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173/dashboard";
    const frontendBillingUrl = frontendUrl.replace(/\/dashboard\/?$/, "") + "/billing";

    if (!stripe) {
      // Offline/Mock Mode: redirect to frontend mock checkout page
      res.json({ url: `/billing/mock-checkout?tier=${tier}` });
      return;
    }

    // Stripe Mode
    let priceId = tier === "pro" ? process.env.STRIPE_PRO_PRICE_ID : process.env.STRIPE_LEGEND_PRICE_ID;
    if (!priceId) {
      // Dynamically create or retrieve standard test price to avoid manual setup friction
      const prices = await stripe.prices.list({ active: true, limit: 100 });
      const found = prices.data.find(p => p.nickname === `TubePulse ${tier.toUpperCase()}`);
      if (found) {
        priceId = found.id;
      } else {
        const product = await stripe.products.create({
          name: `TubePulse ${tier.toUpperCase()}`,
        });
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: tier === "pro" ? 450 : 2899,
          currency: "usd",
          recurring: { interval: "month" },
          nickname: `TubePulse ${tier.toUpperCase()}`,
        });
        priceId = price.id;
      }
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${frontendBillingUrl}?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendBillingUrl}?status=cancel`,
      metadata: {
        userId: req.userId!.toString(),
        tier,
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

router.post("/billing/portal", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, req.userId!));

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173/dashboard";
    const frontendBillingUrl = frontendUrl.replace(/\/dashboard\/?$/, "") + "/billing";

    if (!stripe || !sub?.stripeSubscriptionId) {
      // In mock mode or if no active stripe subscription, redirect back to billing page
      res.json({ url: "/billing" });
      return;
    }

    const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeSub.customer as string,
      return_url: frontendBillingUrl,
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

// Mock endpoints for local testing/development
router.post("/billing/mock-checkout-success", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const { tier } = req.body;
    if (!["pro", "legend"].includes(tier)) {
      res.status(400).json({ error: "Invalid subscription tier" });
      return;
    }

    const [existing] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, req.userId!));
    const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    if (existing) {
      await db
        .update(subscriptionsTable)
        .set({
          stripeSubscriptionId: null,
          tier: tier as any,
          status: "active",
          currentPeriodEnd,
        })
        .where(eq(subscriptionsTable.userId, req.userId!));
    } else {
      await db.insert(subscriptionsTable).values({
        userId: req.userId!,
        stripeSubscriptionId: null,
        tier: tier as any,
        status: "active",
        currentPeriodEnd,
      });
    }

    await db
      .update(usersTable)
      .set({ tier: tier as any })
      .where(eq(usersTable.id, req.userId!));

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post("/billing/mock-cancel", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    await db
      .update(subscriptionsTable)
      .set({
        tier: "free",
        status: "canceled",
        currentPeriodEnd: null,
      })
      .where(eq(subscriptionsTable.userId, req.userId!));

    await db
      .update(usersTable)
      .set({ tier: "free" })
      .where(eq(usersTable.id, req.userId!));

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Stripe Webhook Endpoint (does not require Auth)
router.post("/billing/webhook", async (req: any, res, next): Promise<void> => {
  try {
    if (!stripe) {
      res.status(400).json({ error: "Stripe is not configured" });
      return;
    }

    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      res.status(400).json({ error: "Missing webhook secret or signature" });
      return;
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody || "", sig, webhookSecret);
    } catch (err: any) {
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = session.subscription as string;
      const userId = Number(session.metadata?.userId);
      const tier = session.metadata?.tier;

      if (userId && tier && subscriptionId) {
        const stripeSub = await stripe.subscriptions.retrieve(subscriptionId) as any;
        const currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);

        const [existing] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
        if (existing) {
          await db
            .update(subscriptionsTable)
            .set({
              stripeSubscriptionId: subscriptionId,
              tier: tier as any,
              status: "active",
              currentPeriodEnd,
            })
            .where(eq(subscriptionsTable.userId, userId));
        } else {
          await db.insert(subscriptionsTable).values({
            userId,
            stripeSubscriptionId: subscriptionId,
            tier: tier as any,
            status: "active",
            currentPeriodEnd,
          });
        }

        await db
          .update(usersTable)
          .set({ tier: tier as any })
          .where(eq(usersTable.id, userId));
      }
    } else if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const stripeSub = event.data.object as any;
      const subscriptionId = stripeSub.id;
      const status = stripeSub.status;
      const currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);

      const [existing] = await db
        .select()
        .from(subscriptionsTable)
        .where(eq(subscriptionsTable.stripeSubscriptionId, subscriptionId));

      if (existing) {
        let dbStatus: "active" | "canceled" | "past_due" | "trialing" = "active";
        if (status === "canceled" || status === "unpaid") {
          dbStatus = "canceled";
        } else if (status === "past_due") {
          dbStatus = "past_due";
        } else if (status === "trialing") {
          dbStatus = "trialing";
        }

        await db
          .update(subscriptionsTable)
          .set({
            status: dbStatus,
            currentPeriodEnd,
          })
          .where(eq(subscriptionsTable.stripeSubscriptionId, subscriptionId));

        if (dbStatus === "canceled") {
          await db
            .update(usersTable)
            .set({ tier: "free" })
            .where(eq(usersTable.id, existing.userId));
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

export default router;
