import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pool from '../db/index.js';
import { authenticate, getOrgId } from '../middleware/auth.js';

export default async function pullRequestsRoutes(fastify: FastifyInstance): Promise<void> {
  // ── GET /pull-requests ─────────────────────────────────────────────────────

  fastify.get(
    '/pull-requests',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const orgId = getOrgId(request);
      if (!orgId) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Tenant context not available.' } });

      const query = request.query as { repo?: string; state?: string; limit?: string };
      const limit = Math.min(Number(query.limit ?? 20), 100);

      let sql = `SELECT * FROM pull_requests WHERE org_id=$1`;
      const params: unknown[] = [orgId];
      let idx = 2;

      if (query.repo) { sql += ` AND repo_name=$${idx++}`; params.push(query.repo); }
      if (query.state) { sql += ` AND state=$${idx++}`; params.push(query.state); }

      sql += ` ORDER BY opened_at DESC LIMIT $${idx}`;
      params.push(limit);

      const result = await pool.query(sql, params);
      return reply.send(result.rows);
    }
  );

  // ── GET /pull-requests/stats ───────────────────────────────────────────────

  fastify.get(
    '/pull-requests/stats',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const orgId = getOrgId(request);
      if (!orgId) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Tenant context not available.' } });

      const [openCount, mergedWeek, avgMergeTime] = await Promise.all([
        pool.query(
          `SELECT COUNT(*) AS count FROM pull_requests WHERE org_id=$1 AND state='open'`,
          [orgId]
        ),
        pool.query(
          `SELECT COUNT(*) AS count FROM pull_requests WHERE org_id=$1 AND state='merged' AND merged_at >= NOW() - INTERVAL '7 days'`,
          [orgId]
        ),
        pool.query(
          `SELECT AVG(EXTRACT(EPOCH FROM (merged_at - opened_at)) / 3600) AS avg_hours
           FROM pull_requests WHERE org_id=$1 AND state='merged' AND merged_at IS NOT NULL AND opened_at IS NOT NULL`,
          [orgId]
        ),
      ]);

      return reply.send({
        openCount: Number(openCount.rows[0]?.count ?? 0),
        mergedThisWeek: Number(mergedWeek.rows[0]?.count ?? 0),
        avgHoursToMerge: avgMergeTime.rows[0]?.avg_hours
          ? Math.round(Number(avgMergeTime.rows[0].avg_hours) * 10) / 10
          : null,
      });
    }
  );
}
