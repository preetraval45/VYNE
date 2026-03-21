import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthUser, JwtPayload } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Fastify preHandler that verifies the Bearer JWT on every request.
 *
 * In development (NODE_ENV !== 'production') the token is verified with HS256
 * using the JWT_SECRET environment variable (falls back to 'dev-secret').
 *
 * On success  → sets request.user = { id, email, orgId, role }
 * On failure  → replies 401 Unauthorized
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    // @fastify/jwt decorates the instance with request.jwtVerify()
    const payload = await request.jwtVerify<JwtPayload>();

    const user: AuthUser = {
      id: payload.sub,
      email: payload.email,
      orgId: payload.orgId,
      role: payload.role,
    };

    request.user = user;
  } catch (err) {
    logger.warn('JWT verification failed', {
      error: (err as Error).message,
      path: request.url,
    });
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid or missing authentication token',
    });
  }
}

/**
 * Convenience preHandler that only allows requests from users with the
 * 'owner' or 'admin' role within the organisation.
 * Must be used AFTER `authenticate`.
 */
export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { role } = request.user;
  if (role !== 'owner' && role !== 'admin') {
    return reply.status(403).send({
      statusCode: 403,
      error: 'Forbidden',
      message: 'This action requires admin or owner privileges',
    });
  }
}
