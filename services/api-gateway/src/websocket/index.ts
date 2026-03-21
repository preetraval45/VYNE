import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import logger from '../logger.js';
import type { JwtPayload } from '../middleware/auth.js';

// ── JWKS client (mirrors auth middleware — shared logic without coupling) ──────

const cognitoRegion = process.env['AWS_REGION'] ?? 'us-east-1';
const cognitoUserPoolId = process.env['COGNITO_USER_POOL_ID'];
const cognitoJwksUri = cognitoUserPoolId
  ? `https://cognito-idp.${cognitoRegion}.amazonaws.com/${cognitoUserPoolId}/.well-known/jwks.json`
  : undefined;

const jwks = cognitoJwksUri
  ? jwksClient({
      jwksUri: cognitoJwksUri,
      cache: true,
      cacheMaxAge: 600_000,
      rateLimit: true,
    })
  : null;

// ── Token verification (HS256 dev / RS256 prod) ───────────────────────────────

function verifySocketToken(token: string): Promise<JwtPayload> {
  return new Promise((resolve, reject) => {
    const isProd = process.env['NODE_ENV'] === 'production';

    if (isProd && jwks) {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string') {
        return reject(new Error('Invalid JWT format'));
      }
      const kid = decoded.header.kid;
      if (!kid) return reject(new Error('JWT missing kid header'));

      jwks.getSigningKey(kid, (err, key) => {
        if (err) return reject(err);
        jwt.verify(token, key!.getPublicKey(), { algorithms: ['RS256'] }, (verifyErr, payload) => {
          if (verifyErr) return reject(verifyErr);
          const raw = payload as Record<string, unknown>;
          resolve({
            sub: raw['sub'] as string,
            email: (raw['email'] ?? raw['cognito:username']) as string,
            orgId: (raw['custom:orgId'] ?? raw['orgId']) as string,
            role: (raw['custom:role'] ?? raw['role'] ?? 'member') as string,
            permissions:
              (raw['custom:permissions'] as string | undefined)?.split(',').filter(Boolean) ??
              (raw['permissions'] as string[] | undefined) ?? [],
          });
        });
      });
    } else {
      const secret = process.env['JWT_SECRET'];
      if (!secret) return reject(new Error('JWT_SECRET not configured'));
      jwt.verify(token, secret, { algorithms: ['HS256'] }, (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded as JwtPayload);
      });
    }
  });
}

// ── Socket.io server ──────────────────────────────────────────────────────────

let io: SocketIOServer;

export function createWebSocketServer(httpServer: HttpServer): SocketIOServer {
  const corsOrigins = [
    'http://localhost:3000',
    ...(process.env['CORS_ORIGINS']?.split(',').map((o) => o.trim()) ?? []),
    ...(process.env['SOCKET_IO_CORS_ORIGIN']?.split(',').map((o) => o.trim()) ?? []),
  ];

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Allow the client to pass a token in the handshake auth object:
    // socket = io('ws://...', { auth: { token: '<jwt>' } })
    transports: ['websocket', 'polling'],
  });

  // ── Connection handler ──────────────────────────────────────────────────────

  io.on('connection', async (socket: Socket) => {
    const token =
      (socket.handshake.auth as Record<string, unknown>)['token'] as string | undefined ??
      (socket.handshake.query['token'] as string | undefined);

    if (!token) {
      logger.warn('WebSocket connection rejected — no token', {
        socketId: socket.id,
        ip: socket.handshake.address,
      });
      socket.emit('error', { message: 'Authentication required' });
      socket.disconnect(true);
      return;
    }

    let user: JwtPayload;
    try {
      user = await verifySocketToken(token);
    } catch (err) {
      logger.warn('WebSocket connection rejected — invalid token', {
        socketId: socket.id,
        ip: socket.handshake.address,
        message: (err as Error).message,
      });
      socket.emit('error', { message: 'Invalid or expired token' });
      socket.disconnect(true);
      return;
    }

    // Store user on socket data for use in event handlers
    socket.data['user'] = user;

    // Auto-join org room so broadcasts to the whole org land here
    const orgRoom = `org:${user.orgId}`;
    await socket.join(orgRoom);

    logger.info('WebSocket connected', {
      socketId: socket.id,
      sub: user.sub,
      orgId: user.orgId,
    });

    // ── Event: subscribe:project ──────────────────────────────────────────────
    socket.on('subscribe:project', async (projectId: string) => {
      if (typeof projectId !== 'string' || !projectId) {
        socket.emit('error', { message: 'subscribe:project requires a projectId string' });
        return;
      }
      const room = `project:${projectId}`;
      await socket.join(room);
      logger.debug('Socket subscribed to project', { socketId: socket.id, projectId });
      socket.emit('subscribed', { room });
    });

    // ── Event: subscribe:channel ──────────────────────────────────────────────
    socket.on('subscribe:channel', async (channelId: string) => {
      if (typeof channelId !== 'string' || !channelId) {
        socket.emit('error', { message: 'subscribe:channel requires a channelId string' });
        return;
      }
      const room = `channel:${channelId}`;
      await socket.join(room);
      logger.debug('Socket subscribed to channel', { socketId: socket.id, channelId });
      socket.emit('subscribed', { room });
    });

    // ── Event: unsubscribe:project ────────────────────────────────────────────
    socket.on('unsubscribe:project', async (projectId: string) => {
      if (typeof projectId !== 'string' || !projectId) return;
      const room = `project:${projectId}`;
      await socket.leave(room);
      logger.debug('Socket unsubscribed from project', { socketId: socket.id, projectId });
      socket.emit('unsubscribed', { room });
    });

    // ── Event: unsubscribe:channel ────────────────────────────────────────────
    socket.on('unsubscribe:channel', async (channelId: string) => {
      if (typeof channelId !== 'string' || !channelId) return;
      const room = `channel:${channelId}`;
      await socket.leave(room);
      logger.debug('Socket unsubscribed from channel', { socketId: socket.id, channelId });
      socket.emit('unsubscribed', { room });
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      logger.info('WebSocket disconnected', {
        socketId: socket.id,
        sub: user.sub,
        reason,
      });
    });
  });

  return io;
}

// ── Emit helpers (called by other services / event consumers) ─────────────────

/**
 * Broadcast an event to every socket in the organisation's room.
 */
export function emitToOrg(orgId: string, event: string, data: unknown): void {
  if (!io) {
    logger.warn('emitToOrg called before Socket.io server was initialised');
    return;
  }
  io.to(`org:${orgId}`).emit(event, data);
}

/**
 * Broadcast an event to every socket subscribed to a project room.
 */
export function emitToProject(projectId: string, event: string, data: unknown): void {
  if (!io) {
    logger.warn('emitToProject called before Socket.io server was initialised');
    return;
  }
  io.to(`project:${projectId}`).emit(event, data);
}

/**
 * Broadcast an event to every socket subscribed to a messaging channel room.
 */
export function emitToChannel(channelId: string, event: string, data: unknown): void {
  if (!io) {
    logger.warn('emitToChannel called before Socket.io server was initialised');
    return;
  }
  io.to(`channel:${channelId}`).emit(event, data);
}

export { io };
