import { Router, type Response } from "express";
import { verifyToken } from "../lib/auth";
import { db, channelsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

router.get("/auth/google/status", (_req, res): void => {
  res.json({
    isConfigured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  });
});

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:5000/api/auth/google/callback";

router.get("/auth/google/url", async (req, res): Promise<void> => {
  const token = req.query.token as string;
  if (!token) {
    res.status(400).json({ error: "Authentication token is required" });
    return;
  }

  let userId: number;
  try {
    const payload = verifyToken(token);
    userId = payload.userId;
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired session token" });
    return;
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    logger.info({ userId }, "Google OAuth credentials not configured. Falling back to sandbox.");
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173/dashboard";
    res.json({ url: frontendUrl });
    return;
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent("https://www.googleapis.com/auth/youtube.readonly")}&access_type=offline&prompt=consent&state=${encodeURIComponent(token)}`;
  res.json({ url: authUrl });
});

router.get("/auth/google", async (req, res): Promise<void> => {
  const token = req.query.token as string;
  if (!token) {
    res.status(400).send("Authentication token is required");
    return;
  }

  let userId: number;
  try {
    const payload = verifyToken(token);
    userId = payload.userId;
  } catch (err) {
    res.status(401).send("Invalid or expired session token");
    return;
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    logger.info({ userId }, "Google OAuth credentials not configured. Falling back to sandbox/mock channel creation.");
    try {
      const mockChannelId = "UC_mock_sandbox";
      const [existing] = await db.select().from(channelsTable).where(
        and(eq(channelsTable.youtubeChannelId, mockChannelId), eq(channelsTable.userId, userId))
      );

      if (!existing) {
        await db.insert(channelsTable).values({
          userId,
          youtubeChannelId: mockChannelId,
          name: "Lofi Girl Beats (Sandbox)",
          handle: "@lofigirlbeats",
          thumbnailUrl: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=128&h=128&fit=crop",
          subscriberCount: 14300000,
          videoCount: 120,
          isActive: true,
        });
      }
      
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173/dashboard";
      res.redirect(frontendUrl);
    } catch (err: any) {
      logger.error({ err }, "Failed to create mock sandbox channel");
      res.status(500).send(`Failed to create mock sandbox channel: ${err.message}`);
    }
    return;
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent("https://www.googleapis.com/auth/youtube.readonly")}&access_type=offline&prompt=consent&state=${encodeURIComponent(token)}`;
  res.redirect(authUrl);
});

router.get("/auth/google/callback", async (req, res): Promise<void> => {
  const code = req.query.code as string;
  const token = req.query.state as string;

  if (!code || !token) {
    res.status(400).send("Authorization code and state are required");
    return;
  }

  let userId: number;
  try {
    const payload = verifyToken(token);
    userId = payload.userId;
  } catch (err) {
    res.status(401).send("Invalid callback session token");
    return;
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID!,
        client_secret: CLIENT_SECRET!,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      logger.error({ errBody }, "Failed to exchange authorization code");
      res.status(500).send("Failed to retrieve Google token");
      return;
    }

    const tokens = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token || null;
    const expiresIn = tokens.expires_in;
    const tokenExpiresAt = new Date(Date.now() + (expiresIn * 1000));

    const ytRes = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!ytRes.ok) {
      const errBody = await ytRes.text();
      logger.error({ errBody }, "Failed to fetch YouTube channel info");
      res.status(500).send("Failed to retrieve YouTube channel info");
      return;
    }

    const ytData = (await ytRes.json()) as {
      items?: Array<{
        id: string;
        snippet: {
          title: string;
          customUrl?: string;
          thumbnails?: {
            default?: {
              url?: string;
            };
          };
        };
        statistics?: {
          subscriberCount?: string;
          videoCount?: string;
        };
      }>;
    };

    if (!ytData.items || ytData.items.length === 0) {
      res.status(404).send("No YouTube channel found associated with this Google Account");
      return;
    }

    const channelItem = ytData.items[0];
    const youtubeChannelId = channelItem.id;
    const name = channelItem.snippet.title;
    const handle = channelItem.snippet.customUrl || null;
    const thumbnailUrl = channelItem.snippet.thumbnails?.default?.url || null;
    const subscriberCount = parseInt(channelItem.statistics?.subscriberCount || "0", 10);
    const videoCount = parseInt(channelItem.statistics?.videoCount || "0", 10);

    const [existing] = await db.select().from(channelsTable).where(
      and(eq(channelsTable.youtubeChannelId, youtubeChannelId), eq(channelsTable.userId, userId))
    );

    if (existing) {
      await db.update(channelsTable).set({
        name,
        handle,
        thumbnailUrl,
        subscriberCount,
        videoCount,
        accessToken,
        refreshToken: refreshToken || existing.refreshToken,
        tokenExpiresAt,
        isActive: true,
      }).where(eq(channelsTable.id, existing.id));
    } else {
      await db.insert(channelsTable).values({
        userId,
        youtubeChannelId,
        name,
        handle,
        thumbnailUrl,
        subscriberCount,
        videoCount,
        accessToken,
        refreshToken,
        tokenExpiresAt,
        isActive: true,
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173/dashboard";
    res.redirect(frontendUrl);

  } catch (err: any) {
    logger.error({ err }, "Google OAuth callback error");
    res.status(500).send(`Authentication error: ${err.message}`);
  }
});

export default router;
