import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import type { EmbeddingJobData } from '../types/index.js';
import { logger } from '../utils/logger.js';

// ─── Redis Connection ─────────────────────────────────────────────────────────

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  lazyConnect: false,
});

redisConnection.on('connect', () => {
  logger.info('Redis connected (queue)');
});

redisConnection.on('error', (err) => {
  logger.error('Redis connection error (queue)', { error: err.message });
});

// ─── Queue Definitions ────────────────────────────────────────────────────────

export const EMBEDDING_QUEUE_NAME = 'message-embedding';

export const embeddingQueue = new Queue<EmbeddingJobData>(EMBEDDING_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2_000,
    },
    removeOnComplete: {
      count: 1_000,
      age: 24 * 3600, // 24 hours
    },
    removeOnFail: {
      count: 500,
    },
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Enqueue a message embedding job.
 * Silently logs errors so a Redis outage never crashes a message send.
 */
export async function enqueueEmbedding(
  messageId: string,
  content: string,
): Promise<void> {
  try {
    await embeddingQueue.add(
      'embed',
      { messageId, content },
      { jobId: `embed:${messageId}` }, // Deduplicate by messageId
    );
    logger.debug('Embedding job enqueued', { messageId });
  } catch (err) {
    logger.error('Failed to enqueue embedding job', {
      messageId,
      error: (err as Error).message,
    });
  }
}
