/**
 * BullMQ worker — processes the 'notifications' queue.
 *
 * Job types:
 *   email  — { to, subject, body, htmlBody? }
 *   push   — { userId, deviceToken, title, body, data? }
 *   inapp  — { userId, title, body, type, link? }
 */

import { Worker, type Job } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { sendEmail } from '../channels/email.js';
import { sendPushNotification } from '../channels/push.js';
import { storeNotification } from '../channels/inapp.js';

// ---------------------------------------------------------------------------
// Job payload types
// ---------------------------------------------------------------------------

export interface EmailJob {
  type: 'email';
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
}

export interface PushJob {
  type: 'push';
  userId: string;
  deviceToken: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface InAppJob {
  type: 'inapp';
  userId: string;
  title: string;
  body: string;
  notifType: string; // e.g. 'issue_assigned', 'mention'
  link?: string;
}

export type NotificationJob = EmailJob | PushJob | InAppJob;

// ---------------------------------------------------------------------------
// Processor
// ---------------------------------------------------------------------------

async function processJob(job: Job<NotificationJob>): Promise<void> {
  const { data } = job;
  logger.info('notification_job_start', { id: job.id, type: data.type });

  switch (data.type) {
    case 'email': {
      await sendEmail(data.to, data.subject, data.body, data.htmlBody);
      break;
    }

    case 'push': {
      await sendPushNotification(data.deviceToken, data.title, data.body, data.data);
      break;
    }

    case 'inapp': {
      await storeNotification(data.userId, {
        id: randomUUID(),
        title: data.title,
        body: data.body,
        type: data.notifType,
        link: data.link,
      });
      break;
    }

    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = data;
      logger.warn('notification_job_unknown_type', { job: _exhaustive });
    }
  }

  logger.info('notification_job_done', { id: job.id, type: data.type });
}

// ---------------------------------------------------------------------------
// Worker factory
// ---------------------------------------------------------------------------

export function startNotificationWorker(): Worker<NotificationJob> {
  const worker = new Worker<NotificationJob>(
    config.bullQueueName,
    processJob,
    {
      connection: {
        host: new URL(config.redisUrl).hostname,
        port: parseInt(new URL(config.redisUrl).port || '6379', 10),
      },
      concurrency: 10,
    },
  );

  worker.on('completed', (job) => {
    logger.info('worker_job_completed', { id: job.id });
  });

  worker.on('failed', (job, err) => {
    logger.error('worker_job_failed', { id: job?.id, error: String(err) });
  });

  worker.on('error', (err) => {
    logger.error('worker_error', { error: String(err) });
  });

  logger.info('notification_worker_started', { queue: config.bullQueueName });
  return worker;
}
