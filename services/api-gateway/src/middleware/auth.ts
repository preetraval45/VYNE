import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import logger from '../logger.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;
  email: string;
  orgId: string;
  role: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// ── JWKS client (used in production against Cognito) ──────────────────────────

const cognitoRegion = process.env['AWS_REGION'] ?? 'us-east-1';
const cognitoUserPoolId = process.env['COGNITO_USER_POOL_ID'];
const cognitoJwksUri = cognitoUserPoolId
  ? `https://cognito-idp.${cognitoRegion}.amazonaws.com/${cognitoUserPoolId}/.well-known/jwks.json`
  : undefined;

const jwks = cognitoJwksUri
  ? jwksClient({
      jwksUri: cognitoJwksUri,
      cache: true,
      cacheMaxAge: 600_000, // 10 min
      rateLimit: true,
    })
  : null;

// ── Token extraction ──────────────────────────────────────────────────────────

function extractToken(req: Request): string | null {
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  // Allow token in query string for WebSocket upgrade handshakes
  if (typeof req.query['token'] === 'string') {
    return req.query['token'];
  }
  return null;
}

// ── Dev verification (HS256 with JWT_SECRET) ──────────────────────────────────

function verifyDev(token: string): Promise<JwtPayload> {
  return new Promise((resolve, reject) => {
    const secret = process.env['JWT_SECRET'];
    if (!secret) {
      return reject(new Error('JWT_SECRET not configured'));
    }
    jwt.verify(token, secret, { algorithms: ['HS256'] }, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded as JwtPayload);
    });
  });
}

// ── Prod verification (RS256 with Cognito JWKS) ───────────────────────────────

function getSigningKey(header: jwt.JwtHeader): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!jwks) return reject(new Error('JWKS client not initialised'));
    if (!header.kid) return reject(new Error('JWT missing kid header'));
    jwks.getSigningKey(header.kid, (err, key) => {
      if (err) return reject(err);
      resolve(key!.getPublicKey());
    });
  });
}

function verifyProd(token: string): Promise<JwtPayload> {
  return new Promise((resolve, reject) => {
    // Decode header first to get kid for JWKS lookup
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string') {
      return reject(new Error('Invalid JWT format'));
    }
    getSigningKey(decoded.header)
      .then((signingKey) => {
        jwt.verify(token, signingKey, { algorithms: ['RS256'] }, (err, payload) => {
          if (err) return reject(err);

          const raw = payload as Record<string, unknown>;
          // Cognito custom attributes are prefixed with "custom:"
          const jwtPayload: JwtPayload = {
            sub: raw['sub'] as string,
            email: (raw['email'] ?? raw['cognito:username']) as string,
            orgId: (raw['custom:orgId'] ?? raw['orgId']) as string,
            role: (raw['custom:role'] ?? raw['role'] ?? 'member') as string,
            permissions: (raw['custom:permissions'] as string | undefined)
              ?.split(',')
              .filter(Boolean) ?? (raw['permissions'] as string[] | undefined) ?? [],
          };
          resolve(jwtPayload);
        });
      })
      .catch(reject);
  });
}

// ── Core verify function ──────────────────────────────────────────────────────

async function verifyToken(token: string): Promise<JwtPayload> {
  const isProd = process.env['NODE_ENV'] === 'production';
  if (isProd && jwks) {
    return verifyProd(token);
  }
  return verifyDev(token);
}

// ── Middleware: authenticateJwt (strict — always requires valid token) ─────────

export function authenticateJwt(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({ error: 'No authorization token provided' });
    return;
  }

  verifyToken(token)
    .then((payload) => {
      req.user = payload;
      next();
    })
    .catch((err: Error) => {
      logger.warn('JWT verification failed', { message: err.message, path: req.path });
      res.status(401).json({ error: 'Invalid or expired token' });
    });
}

// ── Middleware: optionalAuthenticateJwt (soft — skips if no token present) ────

export function optionalAuthenticateJwt(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token = extractToken(req);

  if (!token) {
    next();
    return;
  }

  verifyToken(token)
    .then((payload) => {
      req.user = payload;
      next();
    })
    .catch((err: Error) => {
      logger.warn('Optional JWT verification failed — continuing unauthenticated', {
        message: err.message,
        path: req.path,
      });
      next();
    });
}
