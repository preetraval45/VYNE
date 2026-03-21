import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { connectDB } from './db/index.js';
import { logger } from './utils/logger.js';
import webhooksRoutes from './routes/webhooks.js';
import deploymentsRoutes from './routes/deployments.js';
import pullRequestsRoutes from './routes/pullRequests.js';
import repositoriesRoutes from './routes/repositories.js';

// ── Fastify Instance ──────────────────────────────────────────────────────────

const fastify = Fastify({
  logger: false, // Winston handles logging
  trustProxy: true,
  // Enable raw body for webhook signature verification
  bodyLimit: 1048576, // 1 MB
});

// ── Plugin Registration ───────────────────────────────────────────────────────

await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN ?? '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Hub-Signature-256', 'X-GitHub-Event', 'X-Vyne-Org-Id'],
  credentials: true,
});

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET ?? 'dev-secret',
  sign: {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
});

// Add rawBody support for webhook signature verification
fastify.addContentTypeParser(
  'application/json',
  { parseAs: 'buffer' },
  (req, body, done) => {
    try {
      (req as typeof req & { rawBody: Buffer }).rawBody = body as Buffer;
      const json = JSON.parse((body as Buffer).toString('utf8'));
      done(null, json);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
);

// ── Health Check ──────────────────────────────────────────────────────────────

fastify.get('/health', async (_request, reply) => {
  return reply.send({
    status: 'ok',
    service: 'code-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────

await fastify.register(webhooksRoutes);
await fastify.register(deploymentsRoutes, { prefix: '/api/v1' });
await fastify.register(pullRequestsRoutes, { prefix: '/api/v1' });
await fastify.register(repositoriesRoutes, { prefix: '/api/v1' });

// ── Error Handler ─────────────────────────────────────────────────────────────

fastify.setErrorHandler((error, _request, reply) => {
  logger.error('Unhandled error', { error: error.message, stack: error.stack });
  return reply.status(error.statusCode ?? 500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : error.message,
    },
  });
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal} — shutting down gracefully`);
  try {
    await fastify.close();
    logger.info('Code service closed');
    process.exit(0);
  } catch (err) {
    logger.error('Error during shutdown', { error: (err as Error).message });
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ── Startup ───────────────────────────────────────────────────────────────────

async function start(): Promise<void> {
  const PORT = Number(process.env.PORT ?? 5008);
  const HOST = process.env.HOST ?? '0.0.0.0';

  try {
    await connectDB();
    await fastify.listen({ port: PORT, host: HOST });

    logger.info('Code service running', {
      host: HOST,
      port: PORT,
      env: process.env.NODE_ENV ?? 'development',
    });
  } catch (err) {
    logger.error('Failed to start code service', { error: (err as Error).message });
    process.exit(1);
  }
}

start();
