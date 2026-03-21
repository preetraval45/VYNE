import type { FastifyRequest, FastifyReply } from 'fastify';

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token.' } });
  }
}

// Extract org_id from JWT claims
export function getOrgId(request: FastifyRequest): string | null {
  const payload = request.user as Record<string, unknown>;
  return (
    (payload['custom:org_id'] as string | undefined) ??
    (payload['org_id'] as string | undefined) ??
    null
  );
}

// Extract user sub from JWT
export function getUserId(request: FastifyRequest): string | null {
  const payload = request.user as Record<string, unknown>;
  return (payload['sub'] as string | undefined) ?? null;
}
