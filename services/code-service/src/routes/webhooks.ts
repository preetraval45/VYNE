import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import pool from '../db/index.js';
import { publishEvent } from '../utils/eventbridge.js';
import { logger } from '../utils/logger.js';

// ── Signature Verification ────────────────────────────────────────────────────

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex')}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export default async function webhooksRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /webhooks/github
  fastify.post(
    '/webhooks/github',
    {
      config: { rawBody: true },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const secret = process.env.GITHUB_WEBHOOK_SECRET ?? '';
      const signature = (request.headers['x-hub-signature-256'] as string | undefined) ?? '';
      const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody?.toString('utf8') ?? JSON.stringify(request.body);

      if (secret && !verifySignature(rawBody, signature, secret)) {
        logger.warn('GitHub webhook signature verification failed');
        return reply.status(401).send({ error: 'Invalid signature' });
      }

      // Return 200 immediately — process async
      reply.status(200).send({ received: true });

      const eventType = (request.headers['x-github-event'] as string | undefined) ?? 'unknown';
      const payload = request.body as Record<string, unknown>;

      // Resolve org_id from query param or a header set by API gateway mapping
      const orgId =
        (request.headers['x-vyne-org-id'] as string | undefined) ??
        (request.query as Record<string, string>)['orgId'] ??
        null;

      if (!orgId) {
        logger.warn('GitHub webhook received without org_id context');
        return;
      }

      setImmediate(() => handleWebhookAsync(eventType, payload, orgId));
    }
  );
}

// ── Async Processing ──────────────────────────────────────────────────────────

async function handleWebhookAsync(
  eventType: string,
  payload: Record<string, unknown>,
  orgId: string
): Promise<void> {
  try {
    // Log raw event
    await pool.query(
      `INSERT INTO github_events (org_id, event_type, payload) VALUES ($1, $2, $3)`,
      [orgId, eventType, JSON.stringify(payload)]
    );

    switch (eventType) {
      case 'push':
        await handlePush(payload, orgId);
        break;
      case 'pull_request':
        await handlePullRequest(payload, orgId);
        break;
      case 'deployment_status':
        await handleDeploymentStatus(payload, orgId);
        break;
      case 'workflow_run':
        await handleWorkflowRun(payload, orgId);
        break;
      default:
        logger.debug('Unhandled GitHub event type', { eventType });
    }
  } catch (err) {
    logger.error('Error processing GitHub webhook', { eventType, error: (err as Error).message });
  }
}

async function handlePush(payload: Record<string, unknown>, orgId: string): Promise<void> {
  const ref = payload['ref'] as string | undefined;
  const branch = ref?.replace('refs/heads/', '') ?? null;
  const commits = (payload['commits'] as Array<Record<string, unknown>> | undefined) ?? [];
  const pusher = (payload['pusher'] as Record<string, string> | undefined)?.['name'] ?? null;

  logger.info('Push event', { orgId, branch, commitCount: commits.length, pusher });

  await publishEvent('code.push', {
    orgId,
    branch,
    commitCount: commits.length,
    triggeredBy: pusher,
    payload,
  });
}

async function handlePullRequest(payload: Record<string, unknown>, orgId: string): Promise<void> {
  const action = payload['action'] as string | undefined;
  const pr = payload['pull_request'] as Record<string, unknown> | undefined;
  const repo = (payload['repository'] as Record<string, unknown> | undefined)?.['full_name'] as string | undefined;

  if (!pr || !repo) return;

  const prNumber = pr['number'] as number;
  const state = action === 'closed' && pr['merged'] ? 'merged' : action === 'closed' ? 'closed' : 'open';

  await pool.query(
    `INSERT INTO pull_requests (org_id, repo_name, pr_number, title, state, author, base_branch, head_branch, url, opened_at, merged_at, closed_at, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (org_id, repo_name, pr_number) DO UPDATE
     SET state=$5, merged_at=$11, closed_at=$12, metadata=$13, title=$4`,
    [
      orgId,
      repo,
      prNumber,
      pr['title'] as string | null,
      state,
      (pr['user'] as Record<string, string> | undefined)?.['login'] ?? null,
      (pr['base'] as Record<string, string> | undefined)?.['ref'] ?? null,
      (pr['head'] as Record<string, string> | undefined)?.['ref'] ?? null,
      pr['html_url'] as string | null,
      pr['created_at'] as string | null,
      state === 'merged' ? pr['merged_at'] as string | null : null,
      state === 'closed' ? pr['closed_at'] as string | null : null,
      JSON.stringify({}),
    ]
  ).catch((err) => {
    // Retry without ON CONFLICT if the table constraint isn't set
    logger.error('PR upsert failed', { error: (err as Error).message });
  });

  await publishEvent('code.pull_request', { orgId, repo, prNumber, state, action });
}

async function handleDeploymentStatus(payload: Record<string, unknown>, orgId: string): Promise<void> {
  const deploymentStatus = payload['deployment_status'] as Record<string, unknown> | undefined;
  const deployment = payload['deployment'] as Record<string, unknown> | undefined;
  const repo = (payload['repository'] as Record<string, unknown> | undefined)?.['full_name'] as string | undefined;

  if (!deploymentStatus || !deployment) return;

  const state = deploymentStatus['state'] as string;
  const environment = deploymentStatus['environment'] as string ?? 'production';
  const dbStatus = state === 'success' ? 'success' : state === 'failure' ? 'failed' : 'in_progress';

  await pool.query(
    `INSERT INTO deployments (org_id, service_name, environment, status, commit_sha, branch, completed_at, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      orgId,
      repo ?? 'unknown',
      environment,
      dbStatus,
      deployment['sha'] as string | null,
      deployment['ref'] as string | null,
      ['success', 'failure'].includes(state) ? new Date().toISOString() : null,
      JSON.stringify({ creator: (deploymentStatus['creator'] as Record<string, string> | undefined)?.['login'] }),
    ]
  );

  if (state === 'failure') {
    await publishEvent('deployment_failed', {
      orgId,
      serviceName: repo,
      environment,
      commitSha: deployment['sha'],
      branch: deployment['ref'],
    });
  }

  await publishEvent('code.deployment_status', { orgId, repo, state, environment });
}

async function handleWorkflowRun(payload: Record<string, unknown>, orgId: string): Promise<void> {
  const run = payload['workflow_run'] as Record<string, unknown> | undefined;
  const repo = (payload['repository'] as Record<string, unknown> | undefined)?.['full_name'] as string | undefined;

  if (!run) return;

  const conclusion = run['conclusion'] as string | null;

  if (conclusion === 'failure') {
    await publishEvent('deployment_failed', {
      orgId,
      serviceName: repo,
      workflowName: run['name'],
      branch: run['head_branch'],
      commitSha: run['head_sha'],
    });

    await pool.query(
      `INSERT INTO deployments (org_id, service_name, environment, status, commit_sha, branch, completed_at, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7)`,
      [
        orgId,
        repo ?? 'unknown',
        'ci',
        'failed',
        run['head_sha'] as string | null,
        run['head_branch'] as string | null,
        JSON.stringify({ workflowName: run['name'], runId: run['id'] }),
      ]
    );
  }
}
