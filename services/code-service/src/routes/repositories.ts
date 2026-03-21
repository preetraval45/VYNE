import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import pool from '../db/index.js';
import { authenticate, getOrgId } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const ConnectRepoSchema = z.object({
  repoName: z.string().min(1),
  githubUrl: z.string().url().optional(),
  defaultBranch: z.string().default('main'),
});

export default async function repositoriesRoutes(fastify: FastifyInstance): Promise<void> {
  // ── GET /repositories ──────────────────────────────────────────────────────

  fastify.get(
    '/repositories',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const orgId = getOrgId(request);
      if (!orgId) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Tenant context not available.' } });

      // Join with latest deployment to get last deploy date
      const result = await pool.query(
        `SELECT
           r.id, r.org_id, r.repo_name, r.github_url, r.default_branch, r.connected_at,
           d.started_at AS last_deploy_at,
           d.status AS last_deploy_status
         FROM repositories r
         LEFT JOIN LATERAL (
           SELECT started_at, status FROM deployments
           WHERE org_id = r.org_id AND service_name = r.repo_name
           ORDER BY started_at DESC LIMIT 1
         ) d ON true
         WHERE r.org_id = $1
         ORDER BY r.connected_at DESC`,
        [orgId]
      );

      return reply.send(result.rows);
    }
  );

  // ── POST /repositories/connect ─────────────────────────────────────────────

  fastify.post(
    '/repositories/connect',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const orgId = getOrgId(request);
      if (!orgId) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Tenant context not available.' } });

      const parsed = ConnectRepoSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
      }

      const { repoName, githubUrl, defaultBranch } = parsed.data;

      const result = await pool.query(
        `INSERT INTO repositories (org_id, repo_name, github_url, default_branch)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (org_id, repo_name) DO UPDATE
         SET github_url=$3, default_branch=$4
         RETURNING *`,
        [orgId, repoName, githubUrl ?? null, defaultBranch]
      );

      logger.info('Repository connected', { orgId, repoName });
      return reply.status(201).send(result.rows[0]);
    }
  );
}
