import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import type { Request, Response } from 'express';
import logger from '../logger.js';

// ── Service target URLs (with sensible local-dev defaults) ────────────────────

const CORE_SERVICE_URL =
  process.env['CORE_SERVICE_URL'] ?? 'http://core-service:5001';
const PROJECTS_SERVICE_URL =
  process.env['PROJECTS_SERVICE_URL'] ?? 'http://projects-service:5002';
const MESSAGING_SERVICE_URL =
  process.env['MESSAGING_SERVICE_URL'] ?? 'http://messaging-service:5003';
const AI_SERVICE_URL =
  process.env['AI_SERVICE_URL'] ?? 'http://ai-service:5004';
const ERP_SERVICE_URL =
  process.env['ERP_SERVICE_URL'] ?? 'http://erp-service:5005';

// ── Shared proxy factory ───────────────────────────────────────────────────────

/**
 * Builds a proxy middleware for a given upstream service.
 *
 * @param target    - Full base URL of the upstream service.
 * @param pathPrefix - The path segment to strip before forwarding
 *                    (e.g. '/api/core' → upstream receives everything after).
 * @param serviceName - Human-readable label used in log messages.
 */
function makeProxy(target: string, pathPrefix: string, serviceName: string) {
  return createProxyMiddleware<Request, Response>({
    target,
    changeOrigin: true,

    // Strip the gateway prefix so upstream services see clean paths.
    // e.g. /api/projects/123  →  /123  (when prefix is /api/projects)
    pathRewrite: { [`^${pathPrefix}`]: '' },

    // Ensure body (already parsed by Express) is re-serialised for upstream.
    on: {
      proxyReq: (proxyReq, req) => {
        // Forward the original Authorization header verbatim so upstream
        // services can optionally re-verify the JWT.
        const auth = (req as Request).headers['authorization'];
        if (auth) {
          proxyReq.setHeader('Authorization', auth);
        }

        // Forward tenant context headers injected by tenantContext middleware.
        const orgId = (req as Request).headers['x-org-id'];
        if (orgId) proxyReq.setHeader('X-Org-ID', orgId);

        const userId = (req as Request).headers['x-user-id'];
        if (userId) proxyReq.setHeader('X-User-ID', userId);

        // Re-serialise any body that Express already parsed (json/urlencoded).
        fixRequestBody(proxyReq, req as Request);
      },

      error: (err, req, res) => {
        logger.error(`Proxy error — ${serviceName}`, {
          message: (err as Error).message,
          path: (req as Request).path,
        });
        // Only write a response if headers haven't been sent yet.
        if (!(res as Response).headersSent) {
          (res as Response).status(502).json({
            error: `Upstream service "${serviceName}" is unavailable`,
          });
        }
      },
    },
  });
}

// ── Public proxy instances ─────────────────────────────────────────────────────

/** /api/core/** → core-service:5001 */
export const proxyToCore = makeProxy(CORE_SERVICE_URL, '/api/core', 'core-service');

/** /api/projects/** (and /api/issues/**, /api/sprints/**, /api/search/**) → projects-service:5002 */
export const proxyToProjects = makeProxy(
  PROJECTS_SERVICE_URL,
  '/api/projects',
  'projects-service',
);

/** Also proxy sub-routes that belong to projects-service under different prefixes */
export const proxyIssuesToProjects = makeProxy(
  PROJECTS_SERVICE_URL,
  '/api/issues',
  'projects-service',
);
export const proxySprintsToProjects = makeProxy(
  PROJECTS_SERVICE_URL,
  '/api/sprints',
  'projects-service',
);
export const proxySearchToProjects = makeProxy(
  PROJECTS_SERVICE_URL,
  '/api/search',
  'projects-service',
);

/** /api/messaging/** → messaging-service:5003 */
export const proxyToMessaging = makeProxy(
  MESSAGING_SERVICE_URL,
  '/api/messaging',
  'messaging-service',
);

/** Channels + Messages also route to messaging-service */
export const proxyChannelsToMessaging = makeProxy(
  MESSAGING_SERVICE_URL,
  '/api/channels',
  'messaging-service',
);
export const proxyMessagesToMessaging = makeProxy(
  MESSAGING_SERVICE_URL,
  '/api/messages',
  'messaging-service',
);

/** /api/ai/** → ai-service:5004 */
export const proxyToAI = makeProxy(AI_SERVICE_URL, '/api/ai', 'ai-service');

/** /api/erp/** → erp-service:5005 */
export const proxyToERP = makeProxy(ERP_SERVICE_URL, '/api/erp', 'erp-service');
