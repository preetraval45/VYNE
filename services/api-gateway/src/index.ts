import http from 'http';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { createClient } from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';

import logger from './logger.js';
import { standardLimiter, wsUpgradeLimiter } from './middleware/rateLimit.js';
import routes from './routes/index.js';
import { createWebSocketServer } from './websocket/index.js';

// ── App bootstrap ─────────────────────────────────────────────────────────────

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────

app.use(
  helmet({
    // Allow same-origin framing in dev; tighten in production via env
    contentSecurityPolicy: process.env['NODE_ENV'] === 'production',
    crossOriginEmbedderPolicy: process.env['NODE_ENV'] === 'production',
  }),
);

// ── CORS ──────────────────────────────────────────────────────────────────────

const allowedOrigins = [
  'http://localhost:3000',
  ...(process.env['CORS_ORIGINS']?.split(',').map((o) => o.trim()).filter(Boolean) ?? []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests (no Origin header) and listed origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin "${origin}" not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Org-ID', 'X-User-ID'],
    exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  }),
);

// ── Request parsing ───────────────────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── HTTP request logging ──────────────────────────────────────────────────────

const morganFormat =
  process.env['NODE_ENV'] === 'production' ? 'combined' : 'dev';

app.use(
  morgan(morganFormat, {
    stream: {
      write: (message: string) =>
        logger.http(message.trim()),
    },
    // Skip health check noise in logs
    skip: (req, _res) => req.path === '/health',
  }),
);

// ── Rate limiting ─────────────────────────────────────────────────────────────

// Apply the standard limiter globally (health check is skipped inside limiter)
app.use(standardLimiter);

// WebSocket upgrade path gets its own higher-capacity limiter
app.use('/socket.io', wsUpgradeLimiter);

// ── Health check (public — no auth, no rate limit) ────────────────────────────

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  });
});

// ── API routes ────────────────────────────────────────────────────────────────

app.use(routes);

// ── 404 catch-all ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// ── HTTP server ───────────────────────────────────────────────────────────────

const httpServer = http.createServer(app);

// ── Socket.io ─────────────────────────────────────────────────────────────────

const socketServer = createWebSocketServer(httpServer);

// ── Redis adapter for Socket.io (enables multi-instance pub/sub) ──────────────

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

async function connectRedisAdapter(): Promise<void> {
  try {
    const pubClient = createClient(REDIS_URL);
    const subClient = pubClient.duplicate();

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        pubClient.once('ready', resolve);
        pubClient.once('error', reject);
      }),
      new Promise<void>((resolve, reject) => {
        subClient.once('ready', resolve);
        subClient.once('error', reject);
      }),
    ]);

    socketServer.adapter(createAdapter(pubClient, subClient));
    logger.info('Socket.io Redis adapter connected', { url: REDIS_URL });
  } catch (err) {
    logger.warn('Could not connect Socket.io Redis adapter — running without pub/sub', {
      message: (err as Error).message,
    });
  }
}

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env['PORT'] ?? '4000', 10);

async function start(): Promise<void> {
  await connectRedisAdapter();

  httpServer.listen(PORT, () => {
    logger.info(`API Gateway listening`, {
      port: PORT,
      env: process.env['NODE_ENV'] ?? 'development',
      corsOrigins: allowedOrigins,
    });
  });
}

start().catch((err: Error) => {
  logger.error('Fatal startup error', { message: err.message, stack: err.stack });
  process.exit(1);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────

function shutdown(signal: string): void {
  logger.info(`Received ${signal} — shutting down gracefully`);
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
