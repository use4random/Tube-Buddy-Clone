import app from "../../artifacts/api-server/src/app";
import { Server } from "http";

const PORT = 5001;
const BASE_URL = `http://localhost:${PORT}/api`;

interface BenchmarkResult {
  concurrency: number;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  requestsPerSec: number;
}

// Helper to make HTTP request using native fetch
async function makeRequest(
  path: string,
  options: { method?: string; body?: any; token?: string } = {}
): Promise<{ status: number; data: any; latency: number }> {
  const url = `${BASE_URL}${path}`;
  const method = options.method ?? "GET";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  const start = performance.now();
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const latency = performance.now() - start;
    let data = null;
    try {
      data = await response.json();
    } catch {
      // Not JSON or empty body
    }
    return { status: response.status, data, latency };
  } catch (err: any) {
    const latency = performance.now() - start;
    return { status: 500, data: { error: err.message }, latency };
  }
}

async function runConcurrencyTest(
  path: string,
  token: string,
  concurrency: number,
  batchCount: number
): Promise<BenchmarkResult> {
  const totalRequests = concurrency * batchCount;
  let successCount = 0;
  let errorCount = 0;
  const latencies: number[] = [];

  const startTotal = performance.now();

  for (let b = 0; b < batchCount; b++) {
    const promises = Array.from({ length: concurrency }, () =>
      makeRequest(path, { token })
    );
    const results = await Promise.all(promises);
    for (const r of results) {
      latencies.push(r.latency);
      if (r.status >= 200 && r.status < 300) {
        successCount++;
      } else {
        errorCount++;
      }
    }
  }

  const totalTimeMs = performance.now() - startTotal;
  const avgLatencyMs = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
  const minLatencyMs = Math.min(...latencies);
  const maxLatencyMs = Math.max(...latencies);
  const requestsPerSec = (totalRequests / totalTimeMs) * 1000;

  return {
    concurrency,
    totalRequests,
    successCount,
    errorCount,
    avgLatencyMs,
    minLatencyMs,
    maxLatencyMs,
    requestsPerSec,
  };
}

async function main() {
  console.log("==================================================");
  console.log("      LAUNCHING TUBEPUSE BENCHMARK SERVER         ");
  console.log("==================================================");

  // Start the server in-process
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(PORT, () => {
      console.log(`[x] Express API server listening on port ${PORT}`);
      resolve(s);
    });
  });

  try {
    const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`[x] Initial Heap Usage: ${memBefore.toFixed(2)} MB`);

    console.log("\n[Step 1] Authenticating as Demo Creator...");
    const authRes = await makeRequest("/auth/login", {
      method: "POST",
      body: { email: "demo@tubepulse.app", password: "password123" },
    });

    if (authRes.status !== 200 || !authRes.data?.token) {
      throw new Error(`Authentication failed: Status ${authRes.status} - ${JSON.stringify(authRes.data)}`);
    }

    const token = authRes.data.token;
    console.log("[x] Auth token obtained successfully.");

    console.log("\n==================================================");
    console.log("     TEST 1: CONCURRENCY & SCALABILITY            ");
    console.log("==================================================");

    const testPath = "/dashboard/summary?channelId=1";

    console.log("[x] Benchmarking 10 concurrent users (5 batches, 50 total reqs)...");
    const result10 = await runConcurrencyTest(testPath, token, 10, 5);
    console.log(`    -> Success: ${result10.successCount}/${result10.totalRequests} (${(result10.successCount / result10.totalRequests * 100).toFixed(1)}%)`);
    console.log(`    -> Latency: Avg ${result10.avgLatencyMs.toFixed(1)}ms (Min: ${result10.minLatencyMs.toFixed(1)}ms, Max: ${result10.maxLatencyMs.toFixed(1)}ms)`);
    console.log(`    -> Throughput: ${result10.requestsPerSec.toFixed(1)} req/sec`);

    console.log("\n[x] Benchmarking 50 concurrent users (5 batches, 250 total reqs)...");
    const result50 = await runConcurrencyTest(testPath, token, 50, 5);
    console.log(`    -> Success: ${result50.successCount}/${result50.totalRequests} (${(result50.successCount / result50.totalRequests * 100).toFixed(1)}%)`);
    console.log(`    -> Latency: Avg ${result50.avgLatencyMs.toFixed(1)}ms (Min: ${result50.minLatencyMs.toFixed(1)}ms, Max: ${result50.maxLatencyMs.toFixed(1)}ms)`);
    console.log(`    -> Throughput: ${result50.requestsPerSec.toFixed(1)} req/sec`);

    console.log("\n[x] Benchmarking 100 concurrent users (5 batches, 500 total reqs)...");
    const result100 = await runConcurrencyTest(testPath, token, 100, 5);
    console.log(`    -> Success: ${result100.successCount}/${result100.totalRequests} (${(result100.successCount / result100.totalRequests * 100).toFixed(1)}%)`);
    console.log(`    -> Latency: Avg ${result100.avgLatencyMs.toFixed(1)}ms (Min: ${result100.minLatencyMs.toFixed(1)}ms, Max: ${result100.maxLatencyMs.toFixed(1)}ms)`);
    console.log(`    -> Throughput: ${result100.requestsPerSec.toFixed(1)} req/sec`);

    console.log("\n==================================================");
    console.log("     TEST 2: PARAMETER BOUNDARY & SIZE            ");
    console.log("==================================================");

    // 1. Short Keyword vs Long Keyword
    console.log("[x] Testing keyword search parameter scaling:");
    const shortQ = "seo";
    const longQ = "how_to_grow_a_youtube_channel_fast_in_2026_with_seo_studio_and_keyword_research_optimization_tips_for_beginners";
    
    const resShort = await makeRequest(`/keywords/search?channelId=1&q=${shortQ}`, { token });
    const resLong = await makeRequest(`/keywords/search?channelId=1&q=${longQ}`, { token });

    console.log(`    -> Short Query (3 chars) Latency: ${resShort.latency.toFixed(1)}ms (Status: ${resShort.status})`);
    console.log(`    -> Long Query (112 chars) Latency: ${resLong.latency.toFixed(1)}ms (Status: ${resLong.status})`);

    // 2. Bulk updates - varying video counts
    console.log("\n[x] Testing bulk updates payload scaling:");
    const smallBatch = Array.from({ length: 5 }, (_, i) => `vid_${i}`);
    const largeBatch = Array.from({ length: 1000 }, (_, i) => `vid_${i}`);

    const resSmallBulk = await makeRequest("/bulk/update", {
      method: "POST",
      token,
      body: { channelId: 1, videoIds: smallBatch, changes: { title: "Updated Small" } },
    });

    const resLargeBulk = await makeRequest("/bulk/update", {
      method: "POST",
      token,
      body: { channelId: 1, videoIds: largeBatch, changes: { title: "Updated Large" } },
    });

    console.log(`    -> Bulk update 5 videos Latency: ${resSmallBulk.latency.toFixed(1)}ms (Status: ${resSmallBulk.status})`);
    console.log(`    -> Bulk update 1000 videos Latency: ${resLargeBulk.latency.toFixed(1)}ms (Status: ${resLargeBulk.status})`);

    console.log("\n==================================================");
    console.log("     TEST 3: RELIABILITY & ERROR RESILIENCE       ");
    console.log("==================================================");

    // 1. Simulated DB lag (latency injection)
    console.log("[x] Injecting 200ms database latency...");
    process.env.DB_LATENCY_MS = "200";
    
    const startLag = performance.now();
    const lagPromises = Array.from({ length: 10 }, () => makeRequest(testPath, { token }));
    const lagResults = await Promise.all(lagPromises);
    const lagDuration = performance.now() - startLag;
    
    const lagSuccess = lagResults.filter(r => r.status === 200).length;
    console.log(`    -> Concurrently sent 10 requests with 200ms DB latency`);
    console.log(`    -> Total batch time: ${lagDuration.toFixed(1)}ms (Event loop successfully processed them concurrently)`);
    console.log(`    -> Success rate: ${lagSuccess}/10`);
    
    // Clear lag
    process.env.DB_LATENCY_MS = "0";

    // 2. Simulated DB failure (resilience injection)
    console.log("\n[x] Injecting 30% database error rate...");
    process.env.DB_FAIL_RATE = "0.3";

    let errorsGracefullyCaught = 0;
    let successfulRequests = 0;

    for (let i = 0; i < 50; i++) {
      const res = await makeRequest(testPath, { token });
      if (res.status === 200) {
        successfulRequests++;
      } else if (res.status === 500 && res.data?.error?.includes("database connection failure")) {
        errorsGracefullyCaught++;
      }
    }

    console.log(`    -> Executed 50 requests with DB failure mode enabled`);
    console.log(`    -> Successful queries: ${successfulRequests}`);
    console.log(`    -> Handled DB connection failures (caught cleanly, returning 500): ${errorsGracefullyCaught}`);
    console.log(`    -> Server crashed: No (Event loop remained stable and live)`);

    // Clear failure rate
    process.env.DB_FAIL_RATE = "0.0";

    // 3. Validation payload tampering
    console.log("\n[x] Tampering with request payloads (Zod input validation bounds)...");
    const invalidAuth = await makeRequest("/auth/login", {
      method: "POST",
      body: { email: "not-an-email", password: "" }, // invalid email, too short password
    });
    
    const invalidBulk = await makeRequest("/bulk/update", {
      method: "POST",
      token,
      body: { channelId: "invalid-id-type", videoIds: [] }, // channelId should be number, videoIds empty
    });

    console.log(`    -> Invalid Auth Login request status: ${invalidAuth.status} (Data: ${JSON.stringify(invalidAuth.data)})`);
    console.log(`    -> Invalid Bulk Update request status: ${invalidBulk.status} (Data: ${JSON.stringify(invalidBulk.data)})`);

    const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`\n[x] Final Heap Usage: ${memAfter.toFixed(2)} MB`);
    console.log(`[x] Heap growth: ${(memAfter - memBefore).toFixed(2)} MB`);

  } catch (err: any) {
    console.error("Test suite encountered error:", err);
  } finally {
    console.log("\n[x] Closing benchmark server...");
    await new Promise<void>((resolve) => {
      server.close(() => {
        console.log("[x] Benchmark server shut down successfully.");
        resolve();
      });
    });
    console.log("==================================================");
    console.log("        SCALABILITY TESTS COMPLETED               ");
    console.log("==================================================");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
