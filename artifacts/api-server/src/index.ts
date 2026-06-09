try {
  console.log("Attempting to load .env from current working directory:", process.cwd());
  process.loadEnvFile(".env");
  console.log("Successfully loaded .env from current directory");
} catch (e: any) {
  console.log("Could not load .env from current directory:", e.message);
  try {
    process.loadEnvFile("../../.env");
    console.log("Successfully loaded .env from '../../.env'");
  } catch (err2: any) {
    console.log("Could not load .env from '../../.env' either:", err2.message);
  }
}

console.log("Loaded GOOGLE_CLIENT_ID status:", !!process.env.GOOGLE_CLIENT_ID);

import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"] ?? "5000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, () => {
  logger.info({ port }, "Server listening");
});

server.on("error", (err) => {
  logger.error({ err }, "Error starting server");
  process.exit(1);
});
