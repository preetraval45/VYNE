import rateLimit from 'express-rate-limit';

/**
 * Standard rate limiter — applied to all API routes.
 * 200 req/min per IP (doubled from original 100 to support real usage).
 */
export const standardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please slow down and try again in a minute.',
  },
  skip: (req) => req.path === '/health',
});

/**
 * Strict rate limiter — authentication endpoints only.
 * 10 req/min per IP to prevent brute-force / credential stuffing.
 * (Halved from 20 for better security.)
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts. Please wait a minute and try again.',
  },
  // Key by IP + user-agent to catch credential-stuffing from rotating IPs
  keyGenerator: (req) => `${req.ip}-${req.headers['user-agent'] ?? 'unknown'}`,
});

/**
 * AI query limiter — /api/ai/* endpoints.
 * AI inference is expensive; cap at 60 req/min per IP.
 * This aligns with the Free plan's 50 queries/day budget
 * (allowing short bursts while the backend enforces daily quotas).
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'AI query rate limit exceeded. Please wait a minute.',
  },
});

/**
 * Upload limiter — file/image upload endpoints.
 * 20 uploads/min per IP to prevent storage abuse.
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Upload rate limit exceeded. Please wait a minute.',
  },
});

/**
 * WebSocket upgrade limiter — applied at the connection level.
 * 200 upgrade requests per minute per IP.
 */
export const wsUpgradeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many WebSocket connections. Please try again shortly.',
  },
});
