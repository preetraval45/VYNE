import { Server as SocketServer, type Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { Server as HttpServer } from 'http';
import IORedis from 'ioredis';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { enqueueEmbedding } from '../workers/queue.js';
import type {
  JwtPayload,
  AuthUser,
  SocketChannelJoinPayload,
  SocketChannelLeavePayload,
  SocketMessageSendPayload,
  SocketTypingPayload,
  SocketPresenceUpdatePayload,
  MessageRow,
  PresenceStatus,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Typing indicator debounce window: only forward once per 3 s per user per channel */
const TYPING_DEBOUNCE_MS = 3_000;

// ─── In-memory typing debounce tracker ───────────────────────────────────────
// Key: `${userId}:${channelId}`, Value: timestamp of last forwarded event
const typingLastSent = new Map<string, number>();

// ─── Auth helper ─────────────────────────────────────────────────────────────

function verifyToken(token: string): AuthUser | null {
  try {
    const secret = process.env.JWT_SECRET ?? 'dev-secret';
    const payload = jwt.verify(token, secret) as JwtPayload;
    return {
      id: payload.sub,
      email: payload.email,
      orgId: payload.orgId,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

// ─── Presence helpers ─────────────────────────────────────────────────────────

async function upsertPresence(
  userId: string,
  orgId: string,
  status: PresenceStatus,
): Promise<void> {
  await query(
    `INSERT INTO user_presence (user_id, org_id, status, last_seen_at)
          VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, org_id)
     DO UPDATE SET status = EXCLUDED.status, last_seen_at = NOW()`,
    [userId, orgId, status],
  );
}

// ─── Socket.io Server Factory ─────────────────────────────────────────────────

export function createSocketServer(httpServer: HttpServer): SocketServer {
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

  // Separate pub/sub clients required by socket.io redis adapter
  const pubClient = new IORedis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: false });
  const subClient = pubClient.duplicate();

  pubClient.on('error', (err) =>
    logger.error('Socket.io Redis pub error', { error: err.message }),
  );
  subClient.on('error', (err) =>
    logger.error('Socket.io Redis sub error', { error: err.message }),
  );

  const io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN ?? '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 30_000,
    pingInterval: 25_000,
    transports: ['websocket', 'polling'],
  });

  // Wire up horizontal-scaling adapter
  io.adapter(createAdapter(pubClient, subClient));
  logger.info('Socket.io Redis adapter attached');

  // ─── JWT Auth Middleware ──────────────────────────────────────────────────

  io.use((socket, next) => {
    const token =
      (socket.handshake.auth as { token?: string }).token ??
      (socket.handshake.headers['authorization'] as string | undefined)?.replace('Bearer ', '');

    if (!token) {
      logger.warn('Socket connection rejected: no token', { socketId: socket.id });
      return next(new Error('Authentication required'));
    }

    const user = verifyToken(token);
    if (!user) {
      logger.warn('Socket connection rejected: invalid token', { socketId: socket.id });
      return next(new Error('Invalid token'));
    }

    // Attach user to socket data for use in handlers
    socket.data.user = user;
    next();
  });

  // ─── Connection Handler ───────────────────────────────────────────────────

  io.on('connection', async (socket: Socket) => {
    const user: AuthUser = socket.data.user as AuthUser;
    logger.info('Socket connected', { socketId: socket.id, userId: user.id, orgId: user.orgId });

    // Join the org-wide room for broadcasts (channel creation, presence, etc.)
    await socket.join(`org:${user.orgId}`);

    // Mark user as online
    try {
      await upsertPresence(user.id, user.orgId, 'online');
      io.to(`org:${user.orgId}`).emit('user:presence', {
        userId: user.id,
        status: 'online',
        lastSeenAt: new Date().toISOString(),
      });
    } catch (err) {
      logger.error('Failed to set user online', { userId: user.id, error: (err as Error).message });
    }

    // ── channel:join ─────────────────────────────────────────────────────────
    socket.on('channel:join', async (payload: SocketChannelJoinPayload) => {
      if (!payload?.channelId) return;

      // Verify membership before joining the socket room
      const { rows } = await query(
        `SELECT 1
           FROM channel_members cm
           JOIN channels c ON c.id = cm.channel_id
          WHERE cm.channel_id = $1
            AND cm.user_id    = $2
            AND c.org_id      = $3
            AND c.archived_at IS NULL`,
        [payload.channelId, user.id, user.orgId],
      );

      if (rows.length === 0) {
        socket.emit('error', { message: 'Not a member of this channel' });
        return;
      }

      await socket.join(`channel:${payload.channelId}`);
      logger.debug('Socket joined channel room', {
        socketId: socket.id,
        channelId: payload.channelId,
      });
    });

    // ── channel:leave ────────────────────────────────────────────────────────
    socket.on('channel:leave', async (payload: SocketChannelLeavePayload) => {
      if (!payload?.channelId) return;
      await socket.leave(`channel:${payload.channelId}`);
      logger.debug('Socket left channel room', {
        socketId: socket.id,
        channelId: payload.channelId,
      });
    });

    // ── message:send ─────────────────────────────────────────────────────────
    socket.on('message:send', async (payload: SocketMessageSendPayload) => {
      if (!payload?.channelId) {
        socket.emit('error', { message: 'channelId is required' });
        return;
      }

      // Validate at least some content is present
      const hasContent =
        (payload.content && payload.content.trim().length > 0) ||
        payload.contentRich ||
        (payload.attachments && payload.attachments.length > 0);

      if (!hasContent) {
        socket.emit('error', { message: 'Message must have content, richContent, or attachments' });
        return;
      }

      // Verify channel membership
      const { rows: memberRows } = await query(
        `SELECT 1
           FROM channel_members cm
           JOIN channels c ON c.id = cm.channel_id
          WHERE cm.channel_id = $1 AND cm.user_id = $2 AND c.org_id = $3 AND c.archived_at IS NULL`,
        [payload.channelId, user.id, user.orgId],
      );

      if (memberRows.length === 0) {
        socket.emit('error', { message: 'Not a member of this channel' });
        return;
      }

      try {
        const { rows } = await query<MessageRow>(
          `INSERT INTO messages
             (org_id, channel_id, user_id, content, content_rich, type, thread_id, attachments, rich_embed)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [
            user.orgId,
            payload.channelId,
            user.id,
            payload.content ?? null,
            payload.contentRich ? JSON.stringify(payload.contentRich) : null,
            payload.type ?? 'text',
            payload.threadId ?? null,
            payload.attachments ? JSON.stringify(payload.attachments) : JSON.stringify([]),
            payload.richEmbed ? JSON.stringify(payload.richEmbed) : null,
          ],
        );

        const message = rows[0];

        // Increment thread reply count if applicable
        if (payload.threadId) {
          await query(
            `UPDATE messages SET reply_count = reply_count + 1 WHERE id = $1`,
            [payload.threadId],
          );
        }

        // Broadcast to all sockets in the channel room (including sender)
        io.to(`channel:${payload.channelId}`).emit('message:new', message);

        // Enqueue embedding (non-blocking)
        if (payload.content?.trim()) {
          await enqueueEmbedding(message.id, payload.content);
        }

        logger.info('Message sent via socket', { messageId: message.id, userId: user.id });
      } catch (err) {
        logger.error('Failed to save socket message', { error: (err as Error).message });
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ── user:typing ──────────────────────────────────────────────────────────
    socket.on('user:typing', (payload: SocketTypingPayload) => {
      if (!payload?.channelId) return;

      const key = `${user.id}:${payload.channelId}`;
      const now = Date.now();
      const last = typingLastSent.get(key) ?? 0;

      // Only forward if debounce window has elapsed
      if (now - last < TYPING_DEBOUNCE_MS) return;

      typingLastSent.set(key, now);

      // Broadcast to everyone else in the channel room
      socket.to(`channel:${payload.channelId}`).emit('user:typing', {
        userId: user.id,
        channelId: payload.channelId,
      });
    });

    // ── user:presence_update ─────────────────────────────────────────────────
    socket.on('user:presence_update', async (payload: SocketPresenceUpdatePayload) => {
      const validStatuses: PresenceStatus[] = ['online', 'away', 'busy', 'offline'];
      if (!payload?.status || !validStatuses.includes(payload.status)) {
        socket.emit('error', { message: 'Invalid presence status' });
        return;
      }

      try {
        await upsertPresence(user.id, user.orgId, payload.status);

        io.to(`org:${user.orgId}`).emit('user:presence', {
          userId: user.id,
          status: payload.status,
          lastSeenAt: new Date().toISOString(),
        });

        logger.debug('Presence updated via socket', { userId: user.id, status: payload.status });
      } catch (err) {
        logger.error('Failed to update presence', { userId: user.id, error: (err as Error).message });
      }
    });

    // ── disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', async (reason) => {
      logger.info('Socket disconnected', { socketId: socket.id, userId: user.id, reason });

      // Clean up typing debounce entries for this user
      for (const key of typingLastSent.keys()) {
        if (key.startsWith(`${user.id}:`)) {
          typingLastSent.delete(key);
        }
      }

      // Check if user still has other active connections before marking offline
      const sockets = await io.in(`org:${user.orgId}`).fetchSockets();
      const stillConnected = sockets.some(
        (s) => s.id !== socket.id && (s.data.user as AuthUser)?.id === user.id,
      );

      if (!stillConnected) {
        try {
          await upsertPresence(user.id, user.orgId, 'offline');
          io.to(`org:${user.orgId}`).emit('user:presence', {
            userId: user.id,
            status: 'offline',
            lastSeenAt: new Date().toISOString(),
          });
        } catch (err) {
          logger.error('Failed to set user offline', {
            userId: user.id,
            error: (err as Error).message,
          });
        }
      }
    });
  });

  return io;
}
