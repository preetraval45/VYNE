import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import pool from '../db/index.js';
import { authenticate, getOrgId } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const CreateDeploymentSchema = z.object({
  serviceName: z.string().min(1),
  version: z.string().optional(),
  environment: z.string().default('production'),
  branch: z.string().optional(),
  commitSha: z.string().optional(),
  commitMessage: z.string().optional(),
  triggeredBy: z.string().optional(),
});

const UpdateStatusSchema = z.object({
  status: z.enum(['success', 'failed', 'rolled_back']),
});

export default async function deploymentsRoutes(fastify: FastifyInstance): Promise<void> {
  // ── GET /deployments ───────────────────────────────────────────────────────

  fastify.get(
    '/deployments',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const orgId = getOrgId(request);
      if (!orgId) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Tenant context not available.' } });

      const query = request.query as {
        service?: string;
        environment?: string;
        status?: string;
        limit?: string;
      };

      const limit = Math.min(Number(query.limit ?? 20), 100);

      let sql = `SELECT * FROM deployments WHERE org_id = $1`;
      const params: unknown[] = [orgId];
      let idx = 2;

      if (query.service) { sql += ` AND service_name = $${idx++}`; params.push(query.service); }
      if (query.environment) { sql += ` AND environment = $${idx++}`; params.push(query.environment); }
      if (query.status) { sql += ` AND status = $${idx++}`; params.push(query.status); }

      sql += ` ORDER BY started_at DESC LIMIT $${idx}`;
      params.push(limit);

      const result = await pool.query(sql, params);
      return reply.send(result.rows);
    }
  );

  // ── POST /deployments ──────────────────────────────────────────────────────

  fastify.post(
    '/deployments',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const orgId = getOrgId(request);
      if (!orgId) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Tenant context not available.' } });

      const parsed = CreateDeploymentSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      }

      const { serviceName, version, environment, branch, commitSha, commitMessage, triggeredBy } = parsed.data;

      const result = await pool.query(
        `INSERT INTO deployments (org_id, service_name, version, environment, status, branch, commit_sha, commit_message, triggered_by)
         VALUES ($1,$2,$3,$4,'in_progress',$5,$6,$7,$8)
         RETURNING *`,
        [orgId, serviceName, version ?? null, environment, branch ?? null, commitSha ?? null, commitMessage ?? null, triggeredBy ?? null]
      );

      logger.info('Deployment created', { orgId, serviceName, environment });
      return reply.status(201).send(result.rows[0]);
    }
  );

  // ── GET /deployments/stats ─────────────────────────────────────────────────

  fastify.get(
    '/deployments/stats',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const orgId = getOrgId(request);
      if (!orgId) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Tenant context not available.' } });

      const [totalWeek, successRate, avgDuration] = await Promise.all([
        pool.query(
          `SELECT COUNT(*) AS total FROM deployments WHERE org_id=$1 AND started_at >= NOW() - INTERVAL '7 days'`,
          [orgId]
        ),
        pool.query(
          `SELECT
            COUNT(*) FILTER (WHERE status='success') AS successes,
            COUNT(*) AS total
           FROM deployments WHERE org_id=$1 AND started_at >= NOW() - INTERVAL '30 days'`,
          [orgId]
        ),
        pool.query(
          `SELECT AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) AS avg_seconds
           FROM deployments WHERE org_id=$1 AND completed_at IS NOT NULL AND started_at >= NOW() - INTERVAL '30 days'`,
          [orgId]
        ),
      ]);

      const totalSuccesses = Number(successRate.rows[0]?.successes ?? 0);
      const totalDeployments = Number(successRate.rows[0]?.total ?? 0);

      return reply.send({
        totalThisWeek: Number(totalWeek.rows[0]?.total ?? 0),
        successRate: totalDeployments > 0 ? Math.round((totalSuccesses / totalDeployments) * 100) : null,
        avgDurationSeconds: avgDuration.rows[0]?.avg_seconds
          ? Math.round(Number(avgDuration.rows[0].avg_seconds))
          : null,
      });
    }
  );

  // ── GET /deployments/:id ───────────────────────────────────────────────────

  fastify.get(
    '/deployments/:id',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const orgId = getOrgId(request);
      if (!orgId) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Tenant context not available.' } });

      const { id } = request.params as { id: string };
      const result = await pool.query(
        `SELECT * FROM deployments WHERE id=$1 AND org_id=$2`,
        [id, orgId]
      );

      if (result.rowCount === 0) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: `Deployment '${id}' not found.` } });
      }

      return reply.send(result.rows[0]);
    }
  );

  // ── PATCH /deployments/:id/status ─────────────────────────────────────────

  fastify.patch(
    '/deployments/:id/status',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const orgId = getOrgId(request);
      if (!orgId) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Tenant context not available.' } });

      const { id } = request.params as { id: string };
      const parsed = UpdateStatusSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      }

      const { status } = parsed.data;

      const result = await pool.query(
        `UPDATE deployments SET status=$1, completed_at=NOW()
         WHERE id=$2 AND org_id=$3
         RETURNING *`,
        [status, id, orgId]
      );

      if (result.rowCount === 0) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: `Deployment '${id}' not found.` } });
      }

      return reply.send(result.rows[0]);
    }
  );
}
