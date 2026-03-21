import { Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { query } from '../db/index.js';
import type { EmbeddingJobData } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { EMBEDDING_QUEUE_NAME } from './queue.js';

// ─── Redis connection for the worker (separate from queue producer) ───────────

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

const workerRedis = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// ─── Mock Embedding Generator ─────────────────────────────────────────────────

/**
 * Returns a 1536-dimension zero vector as a PostgreSQL array literal.
 *
 * In production this would call AWS Bedrock Titan Embed:
 *
 *   const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
 *   const response = await bedrock.send(new InvokeModelCommand({
 *     modelId: 'amazon.titan-embed-text-v1',
 *     contentType: 'application/json',
 *     accept: 'application/json',
 *     body: JSON.stringify({ inputText: content }),
 *   }));
 *   const body = JSON.parse(new TextDecoder().decode(response.body));
 *   return body.embedding as number[];
 */
function generateMockEmbedding(): number[] {
  // 1536-dimension zero vector — placeholder until Bedrock is wired in
  return Array(1536).fill(0);
}

// ─── Worker ───────────────────────────────────────────────────────────────────

async function processEmbeddingJob(job: Job<EmbeddingJobData>): Promise<void> {
  const { messageId, content } = job.data;

  logger.info('Processing embedding job', { jobId: job.id, messageId });

  const embedding = generateMockEmbedding();

  // Format as PostgreSQL vector literal: '[0,0,...,0]'
  const vectorLiteral = `[${embedding.join(',')}]`;

  // NOTE: The embedding column is commented out in the migration until the
  // pgvector extension is enabled. This update is a no-op until then but
  // will work transparently once the extension + column are added.
  try {
    await query(
      `UPDATE messages
          SET embedding  = $1::vector
        WHERE id = $2`,
      [vectorLiteral, messageId],
    );

    logger.info('Embedding saved', { messageId });
  } catch (err) {
    const error = err as Error;
    // If the vector column does not exist yet, log and skip gracefully
    if (error.message.includes('column "embedding" of relation')) {
      logger.warn('embedding column not yet available — skipping update', { messageId });
      return;
    }
    throw err;
  }
}

// ─── Worker Bootstrap ─────────────────────────────────────────────────────────

export function startEmbeddingWorker(): Worker<EmbeddingJobData> {
  const worker = new Worker<EmbeddingJobData>(
    EMBEDDING_QUEUE_NAME,
    processEmbeddingJob,
    {
      connection: workerRedis,
      concurrency: Number(process.env.EMBEDDING_CONCURRENCY ?? 5),
    },
  );

  worker.on('completed', (job) => {
    logger.info('Embedding job completed', { jobId: job.id, messageId: job.data.messageId });
  });

  worker.on('failed', (job, err) => {
    logger.error('Embedding job failed', {
      jobId: job?.id,
      messageId: job?.data.messageId,
      error: err.message,
      attemptsMade: job?.attemptsMade,
    });
  });

  worker.on('error', (err) => {
    logger.error('Embedding worker error', { error: err.message });
  });

  logger.info('Embedding worker started', { queue: EMBEDDING_QUEUE_NAME });

  return worker;
}
