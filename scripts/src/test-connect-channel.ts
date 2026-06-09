import app from "../../artifacts/api-server/src/app";
import { Server } from "http";

const PORT = 5002;
const BASE_URL = `http://localhost:${PORT}/api`;

async function makeRequest(
  path: string,
  options: { method?: string; body?: any; token?: string } = {}
): Promise<{ status: number; data: any }> {
  const url = `${BASE_URL}${path}`;
  const method = options.method ?? "GET";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    let data = null;
    try {
      data = await response.json();
    } catch {
      // Not JSON or empty body
    }
    return { status: response.status, data };
  } catch (err: any) {
    return { status: 500, data: { error: err.message } };
  }
}

async function main() {
  console.log("==================================================");
  console.log("     LAUNCHING TUBEPUSE TEST SERVER (PORT 5002)   ");
  console.log("==================================================");

  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(PORT, () => {
      console.log(`[x] Server listening on port ${PORT}`);
      resolve(s);
    });
  });

  try {
    console.log("\n[Step 1] Logging in as Demo Creator...");
    const loginRes = await makeRequest("/auth/login", {
      method: "POST",
      body: { email: "demo@tubepulse.app", password: "password123" },
    });

    if (loginRes.status !== 200 || !loginRes.data?.token) {
      throw new Error(`Login failed with status ${loginRes.status}`);
    }

    const token = loginRes.data.token;
    console.log("[x] Successfully logged in. Token obtained.");

    console.log("\n[Step 2] Retrieving current channels...");
    const getChannelsRes = await makeRequest("/channels", { token });
    if (getChannelsRes.status !== 200) {
      throw new Error(`Get channels failed with status ${getChannelsRes.status}`);
    }
    console.log(`[x] Channels list retrieved. Count: ${getChannelsRes.data.length}`);
    console.log(JSON.stringify(getChannelsRes.data, null, 2));

    console.log("\n[Step 3] Simulating connecting a YouTube channel...");
    const mockChannel = {
      youtubeChannelId: "UCTestConnectionChannelId",
      name: "Test Connection Channel",
      handle: "@testconnect",
      thumbnailUrl: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=128&h=128&fit=crop",
      subscriberCount: 1500,
      videoCount: 12,
    };

    const connectRes = await makeRequest("/channels", {
      method: "POST",
      token,
      body: mockChannel,
    });

    if (connectRes.status !== 201) {
      throw new Error(`Connect channel failed with status ${connectRes.status}: ${JSON.stringify(connectRes.data)}`);
    }

    const connectedChannel = connectRes.data;
    console.log(`[x] Channel connected successfully:`);
    console.log(JSON.stringify(connectedChannel, null, 2));

    if (connectedChannel.youtubeChannelId !== mockChannel.youtubeChannelId || connectedChannel.name !== mockChannel.name) {
      throw new Error("Connected channel properties do not match mock data!");
    }

    console.log("\n[Step 4] Re-fetching channels list to verify insertion...");
    const getChannelsRes2 = await makeRequest("/channels", { token });
    if (getChannelsRes2.status !== 200) {
      throw new Error("Failed to re-fetch channels list");
    }

    const channelInList = getChannelsRes2.data.find((c: any) => c.id === connectedChannel.id);
    if (!channelInList) {
      throw new Error("New channel was not found in the fetched list!");
    }
    console.log(`[x] Verified: Newly connected channel is present in list (ID: ${channelInList.id})`);

    console.log("\n[Step 5] Simulating disconnecting the channel...");
    const disconnectRes = await makeRequest(`/channels/${connectedChannel.id}`, {
      method: "DELETE",
      token,
    });

    if (disconnectRes.status !== 204) {
      throw new Error(`Disconnect failed with status ${disconnectRes.status}`);
    }
    console.log(`[x] Channel disconnected successfully (Status 204).`);

    console.log("\n[Step 6] Re-fetching channels to verify removal...");
    const getChannelsRes3 = await makeRequest("/channels", { token });
    const channelStillInList = getChannelsRes3.data.find((c: any) => c.id === connectedChannel.id);
    if (channelStillInList) {
      throw new Error("New channel is still present in the list after deletion!");
    }
    console.log("[x] Verified: Channel removed successfully.");
    console.log("\n==================================================");
    console.log("     TEST RESULTS: ALL API CONNECTIONS SUCCESSFUL ");
    console.log("==================================================");

  } catch (err: any) {
    console.error("\n❌ Test failed with error:", err.message);
  } finally {
    console.log("\nClosing test server...");
    await new Promise<void>((resolve) => {
      server.close(() => {
        console.log("[x] Server shut down successfully.");
        resolve();
      });
    });
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
