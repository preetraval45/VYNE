import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { createServer } from "http";
import type { Server as SocketServer } from "socket.io";

import { connectDB } from "./db/index.js";
import { createSocketServer } from "./socket/index.js";
import { startEmbeddingWorker } from "./workers/embedding.worker.js";
import channelsRoutes from "./routes/channels.js";
import messagesRoutes from "./routes/messages.js";
import { logger } from "./utils/logger.js";

// ─── Fastify Instance ─────────────────────────────────────────────────────────

const fastify = Fastify({
  logger: false, // We use Winston instead
  trustProxy: true,
});

// ─── Plugin Registration ──────────────────────────────────────────────────────

await fastify.register(helmet, {
  contentSecurityPolicy: false, // Allow WebSocket upgrades without CSP conflicts
});

await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN ?? "*",
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
});

await fastify.register(rateLimit, {
  global: true,
  max: Number(process.env.RATE_LIMIT_MAX ?? 500),
  timeWindow: "1 minute",
  errorResponseBuilder: (_request, context) => ({
    statusCode: 429,
    error: "Too Many Requests",
    message: `Rate limit exceeded. Retry after ${context.after}.`,
  }),
});

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET ?? "dev-secret",
  sign: {
    algorithm: "HS256",
    expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  },
});

// ─── Health Check ─────────────────────────────────────────────────────────────

fastify.get("/health", async (_request, reply) => {
  let database: "connected" | "disconnected" = "disconnected";
  try {
    const client = await (await import("./db/index.js")).pool.connect();
    await client.query("SELECT 1");
    client.release();
    database = "connected";
  } catch {
    // DB not reachable
  }

  return reply.send({
    status: "healthy",
    service: "messaging-service",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
    database,
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────

await fastify.register(channelsRoutes, { prefix: "/api/v1" });
await fastify.register(messagesRoutes, { prefix: "/api/v1" });

// ─── HTTP Server + Socket.io ──────────────────────────────────────────────────

const httpServer = createServer(fastify.server);
const io: SocketServer = createSocketServer(httpServer);

// Expose Socket.io instance on the Fastify instance so route handlers can emit
(fastify as unknown as { io: SocketServer }).io = io;

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal} — shutting down gracefully`);
  try {
    await fastify.close();
    io.close();
    logger.info("Server closed");
    process.exit(0);
  } catch (err) {
    logger.error("Error during shutdown", { error: (err as Error).message });
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// ─── Startup ──────────────────────────────────────────────────────────────────

async function start(): Promise<void> {
  const PORT = Number(process.env.PORT ?? 5003);
  const HOST = process.env.HOST ?? "0.0.0.0";

  try {
    // Verify database connectivity
    await connectDB();

    // Start the BullMQ embedding worker
    startEmbeddingWorker();

    // Attach Fastify's routing layer to the shared HTTP server
    await fastify.ready();

    // Start listening — bind to the shared httpServer, not fastify's own server
    await new Promise<void>((resolve, reject) => {
      httpServer.listen(PORT, HOST, (err?: Error) => {
        if (err) return reject(err);
        resolve();
      });
    });

    logger.info(`Messaging service running`, {
      host: HOST,
      port: PORT,
      env: process.env.NODE_ENV ?? "development",
    });
  } catch (err) {
    logger.error("Failed to start messaging service", {
      error: (err as Error).message,
    });
    process.exit(1);
  }
}

start();
