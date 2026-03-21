import { Request, Response, NextFunction } from 'express';
import logger from '../logger.js';

/**
 * Tenant context middleware.
 *
 * Reads the authenticated user from `req.user` (set by authenticateJwt) and
 * injects X-Org-ID and X-User-ID request headers so that every downstream
 * microservice receives a consistent, trusted tenant context without having to
 * re-parse the JWT themselves.
 *
 * This middleware must be mounted AFTER authenticateJwt.
 */
export function tenantContext(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    // No authenticated user — nothing to inject.  Downstream services will
    // handle the missing headers as unauthenticated requests.
    next();
    return;
  }

  const { sub, orgId } = req.user;

  if (orgId) {
    req.headers['x-org-id'] = orgId;
  } else {
    logger.warn('Authenticated user has no orgId in JWT payload', { sub });
  }

  req.headers['x-user-id'] = sub;

  next();
}
