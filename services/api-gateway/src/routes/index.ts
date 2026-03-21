import { Router } from 'express';
import { authenticateJwt } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenant.js';
import { strictLimiter } from '../middleware/rateLimit.js';
import {
  proxyToCore,
  proxyToProjects,
  proxyIssuesToProjects,
  proxySprintsToProjects,
  proxySearchToProjects,
  proxyChannelsToMessaging,
  proxyMessagesToMessaging,
  proxyToAI,
  proxyToERP,
} from '../proxy/index.js';

const router = Router();

// ── Public routes (no authentication required) ────────────────────────────────

/**
 * Auth endpoints go directly to core-service.
 * Apply the strict rate limiter to prevent brute-force attacks.
 */
router.post('/api/auth/login', strictLimiter, proxyToCore);
router.post('/api/auth/register', strictLimiter, proxyToCore);

// ── Protected route middleware ─────────────────────────────────────────────────

/**
 * All routes mounted after this point require a valid JWT.
 * The tenantContext middleware injects X-Org-ID and X-User-ID headers so every
 * downstream service receives a consistent trusted tenant context.
 */
const protect = [authenticateJwt, tenantContext];

// ── Auth & User management → core-service ─────────────────────────────────────
router.use('/api/auth', ...protect, proxyToCore);
router.use('/api/users', ...protect, proxyToCore);
router.use('/api/orgs', ...protect, proxyToCore);

// ── Project management → projects-service ─────────────────────────────────────
router.use('/api/projects', ...protect, proxyToProjects);
router.use('/api/issues', ...protect, proxyIssuesToProjects);
router.use('/api/sprints', ...protect, proxySprintsToProjects);
router.use('/api/search', ...protect, proxySearchToProjects);

// ── Messaging → messaging-service ─────────────────────────────────────────────
router.use('/api/channels', ...protect, proxyChannelsToMessaging);
router.use('/api/messages', ...protect, proxyMessagesToMessaging);

// ── AI → ai-service ───────────────────────────────────────────────────────────
router.use('/api/ai', ...protect, proxyToAI);

// ── ERP → erp-service ─────────────────────────────────────────────────────────
router.use('/api/erp', ...protect, proxyToERP);

export default router;
