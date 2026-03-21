import rateLimit from 'express-rate-limit';

/**
 * Standard rate limiter — applied to all API routes.
 * Allows 100 requests per minute per IP address.
 */
export const standardLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: 'draft-7', // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please slow down and try again in a minute.',
  },
  // Use X-Forwarded-For when behind a trusted reverse proxy / load balancer
  // (set to the number of trusted proxies in front of the gateway)
  skip: (req) => req.path === '/health',
});

/**
 * Strict rate limiter — applied to authentication endpoints.
 * Allows 20 requests per minute per IP address to prevent brute-force attacks.
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts. Please try again in a minute.',
  },
});

/**
 * Websocket upgrade limiter — applied at the connection level.
 * Allows 1000 upgrade requests per minute per IP address.
 */
export const wsUpgradeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many WebSocket connections. Please try again shortly.',
  },
});
