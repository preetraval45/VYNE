/**
 * SQS consumer — polls 'vyne-notifications.fifo' and enqueues BullMQ jobs.
 *
 * In development (no SQS_QUEUE_URL configured) the consumer is skipped and
 * only the handler functions are exported for direct use.
 *
 * Supported event types:
 *   issue_assigned      → email + inapp to assignee
 *   issue_mentioned     → inapp to mentioned user
 *   message_mention     → push + inapp to mentioned user
 *   deployment_failed   → email + inapp to on-call user
 */

import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  type Message,
} from '@aws-sdk/client-sqs';
import { Queue } from 'bullmq';
import { config, isDev } from '../config.js';
import { logger } from '../logger.js';
import type { NotificationJob } from '../workers/notification.worker.js';

// ---------------------------------------------------------------------------
// SQS event payload shapes
// ---------------------------------------------------------------------------

interface IssueAssignedEvent {
  type: 'issue_assigned';
  issueId: string;
  issueTitle: string;
  assigneeId: string;
  assigneeEmail: string;
  assignerName: string;
  issueUrl: string;
}

interface IssueMentionedEvent {
  type: 'issue_mentioned';
  issueId: string;
  issueTitle: string;
  mentionedUserId: string;
  mentionerName: string;
  issueUrl: string;
}

interface MessageMentionEvent {
  type: 'message_mention';
  messageId: string;
  channelName: string;
  mentionedUserId: string;
  mentionedDeviceToken?: string;
  mentionerName: string;
  messagePreview: string;
  messageUrl: string;
}

interface DeploymentFailedEvent {
  type: 'deployment_failed';
  service: string;
  environment: string;
  commitSha: string;
  errorSummary: string;
  onCallEmail: string;
  onCallUserId: string;
  dashboardUrl: string;
}

type SqsEvent =
  | IssueAssignedEvent
  | IssueMentionedEvent
  | MessageMentionEvent
  | DeploymentFailedEvent;

// ---------------------------------------------------------------------------
// BullMQ queue (lazy singleton)
// ---------------------------------------------------------------------------

let _queue: Queue<NotificationJob> | null = null;

function getQueue(): Queue<NotificationJob> {
  if (!_queue) {
    const url = new URL(config.redisUrl);
    _queue = new Queue<NotificationJob>(config.bullQueueName, {
      connection: {
        host: url.hostname,
        port: parseInt(url.port || '6379', 10),
      },
    });
  }
  return _queue;
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

export async function handleIssueAssigned(event: IssueAssignedEvent): Promise<void> {
  const queue = getQueue();
  await Promise.all([
    queue.add('email', {
      type: 'email',
      to: event.assigneeEmail,
      subject: `[VYNE] Issue assigned: ${event.issueTitle}`,
      body: `Hi,\n\n${event.assignerName} assigned you to "${event.issueTitle}".\n\nView it here: ${event.issueUrl}\n\n— VYNE`,
      htmlBody: `<p>${event.assignerName} assigned you to <strong>${event.issueTitle}</strong>.</p><p><a href="${event.issueUrl}">View issue</a></p>`,
    } satisfies NotificationJob),
    queue.add('inapp', {
      type: 'inapp',
      userId: event.assigneeId,
      title: 'Issue assigned to you',
      body: `${event.assignerName} assigned "${event.issueTitle}" to you`,
      notifType: 'issue_assigned',
      link: event.issueUrl,
    } satisfies NotificationJob),
  ]);
}

export async function handleIssueMentioned(event: IssueMentionedEvent): Promise<void> {
  const queue = getQueue();
  await queue.add('inapp', {
    type: 'inapp',
    userId: event.mentionedUserId,
    title: 'You were mentioned in an issue',
    body: `${event.mentionerName} mentioned you in "${event.issueTitle}"`,
    notifType: 'issue_mentioned',
    link: event.issueUrl,
  } satisfies NotificationJob);
}

export async function handleMessageMention(event: MessageMentionEvent): Promise<void> {
  const queue = getQueue();
  const jobs: Promise<unknown>[] = [
    queue.add('inapp', {
      type: 'inapp',
      userId: event.mentionedUserId,
      title: `Mention in #${event.channelName}`,
      body: `${event.mentionerName}: ${event.messagePreview}`,
      notifType: 'message_mention',
      link: event.messageUrl,
    } satisfies NotificationJob),
  ];

  if (event.mentionedDeviceToken) {
    jobs.push(
      queue.add('push', {
        type: 'push',
        userId: event.mentionedUserId,
        deviceToken: event.mentionedDeviceToken,
        title: `Mention in #${event.channelName}`,
        body: `${event.mentionerName}: ${event.messagePreview}`,
        data: { url: event.messageUrl, type: 'message_mention' },
      } satisfies NotificationJob),
    );
  }

  await Promise.all(jobs);
}

export async function handleDeploymentFailed(event: DeploymentFailedEvent): Promise<void> {
  const queue = getQueue();
  const subject = `[VYNE ALERT] Deployment failed — ${event.service} (${event.environment})`;
  const body =
    `Deployment of ${event.service} to ${event.environment} failed.\n\n` +
    `Commit: ${event.commitSha}\n` +
    `Error: ${event.errorSummary}\n\n` +
    `Dashboard: ${event.dashboardUrl}`;
  const htmlBody =
    `<h2>Deployment Failed</h2>` +
    `<p><strong>Service:</strong> ${event.service} (${event.environment})</p>` +
    `<p><strong>Commit:</strong> <code>${event.commitSha}</code></p>` +
    `<p><strong>Error:</strong> ${event.errorSummary}</p>` +
    `<p><a href="${event.dashboardUrl}">Open Dashboard</a></p>`;

  await Promise.all([
    queue.add('email', {
      type: 'email',
      to: event.onCallEmail,
      subject,
      body,
      htmlBody,
    } satisfies NotificationJob),
    queue.add('inapp', {
      type: 'inapp',
      userId: event.onCallUserId,
      title: `Deployment failed: ${event.service}`,
      body: event.errorSummary,
      notifType: 'deployment_failed',
      link: event.dashboardUrl,
    } satisfies NotificationJob),
  ]);
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

async function dispatchEvent(raw: string): Promise<void> {
  let event: SqsEvent;
  try {
    event = JSON.parse(raw) as SqsEvent;
  } catch {
    logger.warn('sqs_invalid_json', { raw: raw.slice(0, 200) });
    return;
  }

  logger.info('sqs_event_received', { type: event.type });

  switch (event.type) {
    case 'issue_assigned':
      await handleIssueAssigned(event);
      break;
    case 'issue_mentioned':
      await handleIssueMentioned(event);
      break;
    case 'message_mention':
      await handleMessageMention(event);
      break;
    case 'deployment_failed':
      await handleDeploymentFailed(event);
      break;
    default: {
      const _exhaustive: never = event;
      logger.warn('sqs_unknown_event_type', { event: _exhaustive });
    }
  }
}

// ---------------------------------------------------------------------------
// Polling loop
// ---------------------------------------------------------------------------

async function pollOnce(client: SQSClient, queueUrl: string): Promise<void> {
  const resp = await client.send(
    new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20, // long polling
      MessageAttributeNames: ['All'],
    }),
  );

  const messages: Message[] = resp.Messages ?? [];
  await Promise.all(
    messages.map(async (msg) => {
      if (!msg.Body) return;
      try {
        await dispatchEvent(msg.Body);
      } catch (err) {
        logger.error('sqs_dispatch_error', { messageId: msg.MessageId, error: String(err) });
        return; // do not delete — will be redelivered
      }
      // Delete after successful processing
      await client.send(
        new DeleteMessageCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: msg.ReceiptHandle!,
        }),
      );
    }),
  );
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function startSqsConsumer(): void {
  if (isDev && !config.sqsQueueUrl) {
    logger.info('sqs_consumer_skipped', {
      reason: 'SQS_QUEUE_URL not set — running in dev mode without SQS polling',
    });
    return;
  }

  const client = new SQSClient({ region: config.awsRegion });
  const queueUrl = config.sqsQueueUrl;

  logger.info('sqs_consumer_starting', { queueUrl });

  // Continuous long-poll loop — runs until the process exits
  const loop = async (): Promise<void> => {
    while (true) {
      try {
        await pollOnce(client, queueUrl);
      } catch (err) {
        logger.error('sqs_poll_error', { error: String(err) });
        // Back-off briefly before retrying
        await new Promise((r) => setTimeout(r, 5_000));
      }
    }
  };

  // Fire-and-forget; errors are caught inside the loop
  loop().catch((err) => {
    logger.error('sqs_consumer_fatal', { error: String(err) });
  });
}
