import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { enqueueEmbedding } from '../workers/queue.js';
import type {
  MessageRow,
  MessageReactions,
  UserPresenceRow,
} from '../types/index.js';
import { logger } from '../utils/logger.js';
import type { Server as SocketServer } from 'socket.io';

// ─── S3 Client ────────────────────────────────────────────────────────────────

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? 'us-east-1',
});

const S3_BUCKET = process.env.S3_BUCKET ?? 'vyne-attachments';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const sendMessageSchema = z.object({
  content: z.string().min(1).max(10_000).optional(),
  contentRich: z.record(z.unknown()).optional(),
  type: z.enum(['text', 'system', 'ai_bot', 'rich_embed']).default('text'),
  threadId: z.string().uuid().optional(),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        filename: z.string(),
        contentType: z.string(),
        size: z.number(),
        url: z.string(),
        key: z.string(),
      }),
    )
    .optional(),
  richEmbed: z.record(z.unknown()).optional(),
});

const editMessageSchema = z.object({
  content: z.string().min(1).max(10_000),
});

const reactionSchema = z.object({
  emoji: z.string().min(1).max(20),
});

const searchSchema = z.object({
  query: z.string().min(1).max(500),
  channelId: z.string().uuid().optional(),
});

const uploadUrlSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
});

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Ensure a user is a member of a channel before operating on its messages. */
async function assertChannelMember(channelId: string, userId: string, orgId: string): Promise<boolean> {
  const { rows } = await query(
    `SELECT 1
       FROM channel_members cm
       JOIN channels c ON c.id = cm.channel_id
      WHERE cm.channel_id = $1
        AND cm.user_id    = $2
        AND c.org_id      = $3
        AND c.archived_at IS NULL`,
    [channelId, userId, orgId],
  );
  return rows.length > 0;
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default async function messagesRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authenticate);

  // ── GET /channels/:id/messages ────────────────────────────────────────────
  fastify.get('/channels/:id/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: channelId } = request.params as { id: string };
    const { before, limit } = request.query as { before?: string; limit?: string };
    const { id: userId, orgId } = request.user;

    const isMember = await assertChannelMember(channelId, userId, orgId);
    if (!isMember) {
      return reply.status(403).send({ error: 'You are not a member of this channel' });
    }

    const pageLimit = Math.min(Number(limit ?? 50), 100);

    let cursorClause = '';
    const params: unknown[] = [channelId, pageLimit + 1];

    if (before) {
      cursorClause = `AND m.created_at < (SELECT created_at FROM messages WHERE id = $3)`;
      params.push(before);
    }

    const { rows } = await query<MessageRow>(
      `SELECT m.*
         FROM messages m
        WHERE m.channel_id  = $1
          AND m.deleted_at IS NULL
          ${cursorClause}
        ORDER BY m.created_at DESC
        LIMIT $2`,
      params,
    );

    const hasMore = rows.length > pageLimit;
    const messages = rows.slice(0, pageLimit).reverse(); // chronological order
    const nextCursor = hasMore ? messages[0]?.id ?? null : null;

    return reply.send({ messages, hasMore, nextCursor });
  });

  // ── POST /channels/:id/messages ───────────────────────────────────────────
  fastify.post('/channels/:id/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: channelId } = request.params as { id: string };
    const { id: userId, orgId } = request.user;

    const parsed = sendMessageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation error', details: parsed.error.flatten() });
    }

    const isMember = await assertChannelMember(channelId, userId, orgId);
    if (!isMember) {
      return reply.status(403).send({ error: 'You are not a member of this channel' });
    }

    const { content, contentRich, type, threadId, attachments, richEmbed } = parsed.data;

    if (!content && !contentRich && (!attachments || attachments.length === 0)) {
      return reply.status(400).send({ error: 'Message must have content, rich content, or attachments' });
    }

    const { rows } = await query<MessageRow>(
      `INSERT INTO messages
         (org_id, channel_id, user_id, content, content_rich, type, thread_id, attachments, rich_embed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        orgId,
        channelId,
        userId,
        content ?? null,
        contentRich ? JSON.stringify(contentRich) : null,
        type,
        threadId ?? null,
        attachments ? JSON.stringify(attachments) : JSON.stringify([]),
        richEmbed ? JSON.stringify(richEmbed) : null,
      ],
    );

    const message = rows[0];

    // If this is a thread reply, increment the parent reply_count
    if (threadId) {
      await query(
        `UPDATE messages SET reply_count = reply_count + 1 WHERE id = $1`,
        [threadId],
      );
    }

    // Broadcast via Socket.io to channel room
    const io = (fastify as unknown as { io: SocketServer }).io;
    if (io) {
      io.to(`channel:${channelId}`).emit('message:new', message);
    }

    // Enqueue embedding generation (non-blocking)
    if (content && content.trim().length > 0) {
      await enqueueEmbedding(message.id, content);
    }

    logger.info('Message sent', { messageId: message.id, channelId, userId });
    return reply.status(201).send({ message });
  });

  // ── PATCH /messages/:id ───────────────────────────────────────────────────
  fastify.patch('/messages/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: messageId } = request.params as { id: string };
    const { id: userId } = request.user;

    const parsed = editMessageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation error', details: parsed.error.flatten() });
    }

    const { rows } = await query<MessageRow>(
      `UPDATE messages
          SET content   = $1,
              is_edited = true,
              edited_at = NOW()
        WHERE id        = $2
          AND user_id   = $3
          AND deleted_at IS NULL
       RETURNING *`,
      [parsed.data.content, messageId, userId],
    );

    if (!rows[0]) {
      return reply.status(404).send({ error: 'Message not found or you are not the author' });
    }

    const message = rows[0];

    // Re-enqueue embedding for updated content
    await enqueueEmbedding(message.id, parsed.data.content);

    const io = (fastify as unknown as { io: SocketServer }).io;
    if (io) {
      io.to(`channel:${message.channel_id}`).emit('message:updated', message);
    }

    return reply.send({ message });
  });

  // ── DELETE /messages/:id ──────────────────────────────────────────────────
  fastify.delete('/messages/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: messageId } = request.params as { id: string };
    const { id: userId, role } = request.user;

    // Owners/admins can delete any message; regular members only their own
    const isAdmin = role === 'owner' || role === 'admin';
    const whereClause = isAdmin ? 'id = $1' : 'id = $1 AND user_id = $2';
    const params = isAdmin ? [messageId] : [messageId, userId];

    const { rows } = await query<MessageRow>(
      `UPDATE messages
          SET deleted_at = NOW()
        WHERE ${whereClause}
          AND deleted_at IS NULL
       RETURNING *`,
      params,
    );

    if (!rows[0]) {
      return reply.status(404).send({ error: 'Message not found or already deleted' });
    }

    const message = rows[0];
    const io = (fastify as unknown as { io: SocketServer }).io;
    if (io) {
      io.to(`channel:${message.channel_id}`).emit('message:deleted', {
        id: messageId,
        channelId: message.channel_id,
      });
    }

    logger.info('Message soft-deleted', { messageId, userId });
    return reply.status(204).send();
  });

  // ── POST /messages/:id/reactions ──────────────────────────────────────────
  fastify.post('/messages/:id/reactions', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: messageId } = request.params as { id: string };
    const { id: userId } = request.user;

    const parsed = reactionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation error', details: parsed.error.flatten() });
    }

    const { emoji } = parsed.data;

    // Toggle: add if not present, remove if already reacted
    const { rows } = await query<MessageRow>(
      `UPDATE messages
          SET reactions = CASE
            WHEN reactions->$2 IS NULL THEN
              jsonb_set(reactions, ARRAY[$2], to_jsonb(ARRAY[$3::text]))
            WHEN reactions->$2 @> to_jsonb($3::text) THEN
              CASE
                WHEN jsonb_array_length(reactions->$2) = 1 THEN
                  reactions - $2
                ELSE
                  jsonb_set(reactions, ARRAY[$2],
                    (SELECT jsonb_agg(v)
                       FROM jsonb_array_elements(reactions->$2) AS v
                      WHERE v <> to_jsonb($3::text)))
              END
            ELSE
              jsonb_set(reactions, ARRAY[$2],
                (reactions->$2) || to_jsonb(ARRAY[$3::text]))
          END
        WHERE id = $1
          AND deleted_at IS NULL
       RETURNING *`,
      [messageId, emoji, userId],
    );

    if (!rows[0]) {
      return reply.status(404).send({ error: 'Message not found' });
    }

    const message = rows[0];
    const io = (fastify as unknown as { io: SocketServer }).io;
    if (io) {
      io.to(`channel:${message.channel_id}`).emit('message:reaction_added', {
        messageId,
        reactions: message.reactions,
      });
    }

    return reply.send({ reactions: message.reactions });
  });

  // ── DELETE /messages/:id/reactions/:emoji ─────────────────────────────────
  fastify.delete(
    '/messages/:id/reactions/:emoji',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: messageId, emoji } = request.params as { id: string; emoji: string };
      const { id: userId } = request.user;

      const decodedEmoji = decodeURIComponent(emoji);

      const { rows } = await query<MessageRow>(
        `UPDATE messages
            SET reactions = CASE
              WHEN reactions->$2 IS NULL THEN reactions
              WHEN jsonb_array_length(reactions->$2) <= 1 THEN reactions - $2
              ELSE jsonb_set(reactions, ARRAY[$2],
                     (SELECT jsonb_agg(v)
                        FROM jsonb_array_elements(reactions->$2) AS v
                       WHERE v <> to_jsonb($3::text)))
            END
          WHERE id = $1
            AND deleted_at IS NULL
         RETURNING *`,
        [messageId, decodedEmoji, userId],
      );

      if (!rows[0]) {
        return reply.status(404).send({ error: 'Message not found' });
      }

      const message = rows[0];
      const io = (fastify as unknown as { io: SocketServer }).io;
      if (io) {
        io.to(`channel:${message.channel_id}`).emit('message:reaction_added', {
          messageId,
          reactions: message.reactions,
        });
      }

      return reply.send({ reactions: message.reactions });
    },
  );

  // ── GET /messages/:id/thread ──────────────────────────────────────────────
  fastify.get('/messages/:id/thread', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: threadId } = request.params as { id: string };
    const { id: userId, orgId } = request.user;

    // Verify the parent message exists and the user has access to its channel
    const { rows: parentRows } = await query<MessageRow>(
      `SELECT m.*
         FROM messages m
         JOIN channel_members cm ON cm.channel_id = m.channel_id
        WHERE m.id       = $1
          AND m.org_id   = $2
          AND cm.user_id = $3`,
      [threadId, orgId, userId],
    );

    if (!parentRows[0]) {
      return reply.status(404).send({ error: 'Thread parent message not found' });
    }

    const { rows: replies } = await query<MessageRow>(
      `SELECT * FROM messages
        WHERE thread_id  = $1
          AND deleted_at IS NULL
        ORDER BY created_at ASC`,
      [threadId],
    );

    return reply.send({ parent: parentRows[0], replies });
  });

  // ── POST /messages/search ─────────────────────────────────────────────────
  fastify.post('/messages/search', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: userId, orgId } = request.user;

    const parsed = searchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation error', details: parsed.error.flatten() });
    }

    const { query: searchQuery, channelId } = parsed.data;

    let sql = `
      SELECT m.*,
             ts_rank(to_tsvector('english', coalesce(m.content, '')),
                     plainto_tsquery('english', $1)) AS rank
        FROM messages m
        JOIN channel_members cm ON cm.channel_id = m.channel_id
       WHERE m.org_id     = $2
         AND cm.user_id   = $3
         AND m.deleted_at IS NULL
         AND to_tsvector('english', coalesce(m.content, ''))
               @@ plainto_tsquery('english', $1)
    `;

    const params: unknown[] = [searchQuery, orgId, userId];

    if (channelId) {
      sql += ` AND m.channel_id = $${params.length + 1}`;
      params.push(channelId);
    }

    sql += ` ORDER BY rank DESC, m.created_at DESC LIMIT 50`;

    const { rows } = await query<MessageRow>(sql, params);

    return reply.send({ messages: rows });
  });

  // ── GET /attachments/upload-url ───────────────────────────────────────────
  fastify.get('/attachments/upload-url', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: userId } = request.user;

    const parsed = uploadUrlSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation error', details: parsed.error.flatten() });
    }

    const { filename, contentType } = parsed.data;
    const key = `uploads/${userId}/${uuidv4()}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 }); // 15 minutes

    return reply.send({
      uploadUrl,
      key,
      expiresIn: 900,
    });
  });

  // ── GET /presence ─────────────────────────────────────────────────────────
  fastify.get('/presence', async (request: FastifyRequest, reply: FastifyReply) => {
    const { orgId } = request.user;
    const { userIds } = request.query as { userIds?: string };

    if (!userIds) {
      return reply.status(400).send({ error: 'userIds query parameter is required' });
    }

    const ids = userIds
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (ids.length === 0) {
      return reply.send({ presence: [] });
    }

    if (ids.length > 100) {
      return reply.status(400).send({ error: 'Cannot query more than 100 users at once' });
    }

    const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');

    const { rows } = await query<UserPresenceRow>(
      `SELECT user_id, org_id, status, last_seen_at
         FROM user_presence
        WHERE org_id  = $1
          AND user_id IN (${placeholders})`,
      [orgId, ...ids],
    );

    return reply.send({ presence: rows });
  });
}
