import { db, channelsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

/**
 * Returns a valid, active access token for the given channel database ID.
 * If the access token is expired or close to expiring (within 5 minutes),
 * it automatically refreshes it using the stored refresh token.
 */
export async function getValidAccessToken(channelId: number): Promise<string> {
  const [channel] = await db.select().from(channelsTable).where(eq(channelsTable.id, channelId));
  if (!channel) {
    throw new Error(`Channel with ID ${channelId} not found`);
  }

  // If we are in sandbox/mock mode (or credentials not configured)
  if (!CLIENT_ID || !CLIENT_SECRET) {
    logger.info({ channelId }, "Google OAuth credentials not configured. Returning stored or mock token.");
    return channel.accessToken || "mock_sandbox_token";
  }

  const tokenExpiresAt = channel.tokenExpiresAt;
  const now = new Date();

  // If token is still valid (with 5 minutes buffer), return it
  if (tokenExpiresAt && tokenExpiresAt.getTime() > now.getTime() + 5 * 60 * 1000 && channel.accessToken) {
    return channel.accessToken;
  }

  // If no refresh token, we cannot refresh the access token
  if (!channel.refreshToken) {
    throw new Error(`No refresh token available for channel ID ${channelId}. User must re-authenticate.`);
  }

  logger.info({ channelId }, "YouTube access token expired or expiring soon. Refreshing...");

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: channel.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.error({ channelId, errText }, "Failed to refresh YouTube access token");
      throw new Error(`Failed to refresh YouTube access token: ${errText}`);
    }

    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
    };

    const newAccessToken = data.access_token;
    const newExpiresIn = data.expires_in;
    const newTokenExpiresAt = new Date(Date.now() + newExpiresIn * 1000);
    
    // Save updated tokens
    const updateData: Partial<typeof channelsTable.$inferInsert> = {
      accessToken: newAccessToken,
      tokenExpiresAt: newTokenExpiresAt,
    };
    if (data.refresh_token) {
      updateData.refreshToken = data.refresh_token;
    }

    await db.update(channelsTable).set(updateData).where(eq(channelsTable.id, channelId));
    logger.info({ channelId }, "YouTube access token successfully refreshed.");

    return newAccessToken;
  } catch (err: any) {
    logger.error({ channelId, err }, "Error during YouTube token refresh");
    throw err;
  }
}
