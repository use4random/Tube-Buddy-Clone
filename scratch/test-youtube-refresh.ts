import { getValidAccessToken } from "../artifacts/api-server/src/lib/youtube";
import { db, channelsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function run() {
  console.log("=== Testing getValidAccessToken ===");

  // Find a channel in the db
  const [channel] = await db.select().from(channelsTable).limit(1);
  if (!channel) {
    console.log("❌ No channels found in the database. Creating a mock one first...");
    const [newChannel] = await db.insert(channelsTable).values({
      userId: 1,
      youtubeChannelId: "UC_test_refresh",
      name: "Refresh Test Channel",
      accessToken: "initial_access_token",
      refreshToken: "initial_refresh_token",
      tokenExpiresAt: new Date(Date.now() - 1000 * 60 * 10), // expired 10 mins ago
      isActive: true,
    }).returning();
    console.log("Mock channel created:", newChannel);
    await testChannelToken(newChannel.id);
  } else {
    console.log("Found existing channel:", channel);
    await testChannelToken(channel.id);
  }
}

async function testChannelToken(channelId: number) {
  try {
    console.log(`\nCalling getValidAccessToken for channelId: ${channelId}...`);
    const token = await getValidAccessToken(channelId);
    console.log(`✅ Token returned: ${token}`);
    
    // Check if the channel token was updated
    const [updatedChannel] = await db.select().from(channelsTable).where(eq(channelsTable.id, channelId));
    console.log("Updated channel state in DB:", updatedChannel);
  } catch (err: any) {
    console.error("❌ Error during test:", err.message);
  }
}

run().catch(console.error);
