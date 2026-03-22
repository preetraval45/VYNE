/**
 * VYNE Notification Service — entry point
 *
 * Starts:
 *   1. Fastify HTTP server (port 5007)
 *   2. BullMQ notification worker
 *   3. SQS consumer (skipped in dev when SQS_QUEUE_URL is not set)
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";

import { config } from "./config.js";
import { logger } from "./logger.js";
import { notificationRoutes } from "./routes/notifications.js";
import { startNotificationWorker } from "./workers/notification.worker.js";
import { startSqsConsumer } from "./sqs/consumer.js";

// ---------------------------------------------------------------------------
// Build the Fastify app
// ---------------------------------------------------------------------------

const app = Fastify({
  logger: false, // We use Winston instead
  trustProxy: true,
});

// CORS
await app.register(cors, {
  origin: config.corsOrigins,
  credentials: true,
});

// JWT
await app.register(jwt, {
  secret: config.jwtSecret,
  sign: { algorithm: "HS256" },
});

// Health check (no auth required)
app.get("/health", async () => ({
  status: "healthy",
  service: "notification-service",
  timestamp: new Date().toISOString(),
  version: "0.1.0",
}));

// Notification routes
await app.register(notificationRoutes);

// Global error handler
app.setErrorHandler((error, request, reply) => {
  logger.error("fastify_error", {
    path: request.url,
    error: error.message,
    stack: error.stack,
  });
  const statusCode = error.statusCode ?? 500;
  void reply.status(statusCode).send({
    error: statusCode >= 500 ? "Internal Server Error" : error.message,
  });
});

// ---------------------------------------------------------------------------
// Start everything
// ---------------------------------------------------------------------------

async function start(): Promise<void> {
  try {
    // 1. HTTP server
    await app.listen({ port: config.port, host: "0.0.0.0" });
    logger.info("notification_service_started", {
      port: config.port,
      environment: config.environment,
    });

    // 2. BullMQ worker
    startNotificationWorker();

    // 3. SQS consumer
    startSqsConsumer();
  } catch (err) {
    logger.error("startup_error", { error: String(err) });
    process.exit(1);
  }
}

// Handle clean shutdown
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    logger.info("shutdown_signal_received", { signal });
    await app.close();
    process.exit(0);
  });
}

await start();
