import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { query, withTransaction } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import type {
  ChannelRow,
  ChannelMemberRow,
  DmConversationRow,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const createChannelSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9_-]+$/, 'Channel name may only contain lowercase letters, numbers, hyphens, and underscores'),
  description: z.string().max(500).optional(),
  type: z.enum(['public', 'private']).default('public'),
});

const updateChannelSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9_-]+$/)
    .optional(),
  description: z.string().max(500).optional(),
  topic: z.string().max(250).optional(),
});

const addMemberSchema = z.object({
  userId: z.string().uuid(),
});

const createDmSchema = z.object({
  userId: z.string().uuid(),
});

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default async function channelsRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // ── GET /channels ──────────────────────────────────────────────────────────
  fastify.get('/channels', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: userId, orgId } = request.user;

    const result = await query<ChannelRow & { member_role: string; last_read_at: Date }>(
      `SELECT c.*,
              cm.role  AS member_role,
              cm.last_read_at
         FROM channels c
         JOIN channel_members cm ON cm.channel_id = c.id
        WHERE cm.user_id  = $1
          AND c.org_id    = $2
          AND c.archived_at IS NULL
        ORDER BY c.created_at ASC`,
      [userId, orgId],
    );

    return reply.send({ channels: result.rows });
  });

  // ── POST /channels ─────────────────────────────────────────────────────────
  fastify.post('/channels', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = createChannelSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation error', details: parsed.error.flatten() });
    }

    const { name, description, type } = parsed.data;
    const { id: userId, orgId } = request.user;

    const channel = await withTransaction(async (txQuery) => {
      const { rows } = await txQuery<ChannelRow>(
        `INSERT INTO channels (org_id, name, description, type, created_by)
              VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
        [orgId, name, description ?? null, type, userId],
      );
      const newChannel = rows[0];

      // Auto-join the creator as owner
      await txQuery(
        `INSERT INTO channel_members (channel_id, user_id, role)
              VALUES ($1, $2, 'owner')`,
        [newChannel.id, userId],
      );

      return newChannel;
    });

    logger.info('Channel created', { channelId: channel.id, userId, orgId });

    // Broadcast channel:new to the org room via Socket.io (accessed through fastify instance)
    const io = (fastify as unknown as { io: import('socket.io').Server }).io;
    if (io) {
      io.to(`org:${orgId}`).emit('channel:new', channel);
    }

    return reply.status(201).send({ channel });
  });

  // ── GET /channels/:id ──────────────────────────────────────────────────────
  fastify.get('/channels/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { id: userId, orgId } = request.user;

    const { rows } = await query<ChannelRow>(
      `SELECT c.*
         FROM channels c
         JOIN channel_members cm ON cm.channel_id = c.id
        WHERE c.id      = $1
          AND c.org_id  = $2
          AND cm.user_id = $3`,
      [id, orgId, userId],
    );

    if (!rows[0]) {
      return reply.status(404).send({ error: 'Channel not found' });
    }

    return reply.send({ channel: rows[0] });
  });

  // ── PATCH /channels/:id ────────────────────────────────────────────────────
  fastify.patch('/channels/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { id: userId, orgId } = request.user;

    const parsed = updateChannelSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation error', details: parsed.error.flatten() });
    }

    // Verify membership and role (only owner/admin can update)
    const { rows: memberRows } = await query<ChannelMemberRow>(
      `SELECT role FROM channel_members WHERE channel_id = $1 AND user_id = $2`,
      [id, userId],
    );
    const member = memberRows[0];
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return reply.status(403).send({ error: 'Insufficient permissions to update this channel' });
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    const { name, description, topic } = parsed.data;

    if (name !== undefined) {
      updates.push(`name = $${paramIdx++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIdx++}`);
      values.push(description);
    }
    if (topic !== undefined) {
      updates.push(`topic = $${paramIdx++}`);
      values.push(topic);
    }

    if (updates.length === 0) {
      return reply.status(400).send({ error: 'No fields to update' });
    }

    values.push(id, orgId);
    const { rows } = await query<ChannelRow>(
      `UPDATE channels
          SET ${updates.join(', ')}
        WHERE id     = $${paramIdx++}
          AND org_id = $${paramIdx}
      RETURNING *`,
      values,
    );

    return reply.send({ channel: rows[0] });
  });

  // ── DELETE /channels/:id (archive) ────────────────────────────────────────
  fastify.delete('/channels/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { id: userId, orgId } = request.user;

    const { rows: memberRows } = await query<ChannelMemberRow>(
      `SELECT role FROM channel_members WHERE channel_id = $1 AND user_id = $2`,
      [id, userId],
    );
    const member = memberRows[0];
    if (!member || member.role !== 'owner') {
      return reply.status(403).send({ error: 'Only channel owners can archive a channel' });
    }

    await query(
      `UPDATE channels SET archived_at = NOW() WHERE id = $1 AND org_id = $2`,
      [id, orgId],
    );

    logger.info('Channel archived', { channelId: id, userId });
    return reply.status(204).send();
  });

  // ── POST /channels/dm ─────────────────────────────────────────────────────
  fastify.post('/channels/dm', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = createDmSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation error', details: parsed.error.flatten() });
    }

    const { userId: targetUserId } = parsed.data;
    const { id: currentUserId, orgId } = request.user;

    if (currentUserId === targetUserId) {
      return reply.status(400).send({ error: 'Cannot start a DM with yourself' });
    }

    // Check if a DM conversation already exists between these two users in this org
    const { rows: existing } = await query<DmConversationRow>(
      `SELECT dc.id
         FROM dm_conversations dc
         JOIN dm_participants p1 ON p1.conversation_id = dc.id AND p1.user_id = $1
         JOIN dm_participants p2 ON p2.conversation_id = dc.id AND p2.user_id = $2
        WHERE dc.org_id = $3
        LIMIT 1`,
      [currentUserId, targetUserId, orgId],
    );

    if (existing[0]) {
      return reply.send({ conversation: existing[0], isNew: false });
    }

    // Create new DM conversation
    const conversation = await withTransaction(async (txQuery) => {
      const { rows } = await txQuery<DmConversationRow>(
        `INSERT INTO dm_conversations (org_id) VALUES ($1) RETURNING *`,
        [orgId],
      );
      const conv = rows[0];

      await txQuery(
        `INSERT INTO dm_participants (conversation_id, user_id)
              VALUES ($1, $2), ($1, $3)`,
        [conv.id, currentUserId, targetUserId],
      );

      return conv;
    });

    logger.info('DM conversation created', { conversationId: conversation.id, currentUserId, targetUserId });
    return reply.status(201).send({ conversation, isNew: true });
  });

  // ── POST /channels/:id/members ────────────────────────────────────────────
  fastify.post('/channels/:id/members', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: channelId } = request.params as { id: string };
    const { id: requesterId, orgId } = request.user;

    const parsed = addMemberSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation error', details: parsed.error.flatten() });
    }

    const { userId } = parsed.data;

    // Verify channel exists and requester has permission
    const { rows: channelRows } = await query<ChannelMemberRow>(
      `SELECT cm.role
         FROM channel_members cm
         JOIN channels c ON c.id = cm.channel_id
        WHERE cm.channel_id = $1
          AND cm.user_id    = $2
          AND c.org_id      = $3`,
      [channelId, requesterId, orgId],
    );

    if (!channelRows[0]) {
      return reply.status(404).send({ error: 'Channel not found or you are not a member' });
    }

    const requesterRole = channelRows[0].role;
    if (requesterRole !== 'owner' && requesterRole !== 'admin') {
      return reply.status(403).send({ error: 'Only admins and owners can add members' });
    }

    // Upsert — silently succeed if already a member
    await query(
      `INSERT INTO channel_members (channel_id, user_id, role)
            VALUES ($1, $2, 'member')
       ON CONFLICT (channel_id, user_id) DO NOTHING`,
      [channelId, userId],
    );

    logger.info('Member added to channel', { channelId, userId, requesterId });
    return reply.status(201).send({ message: 'Member added successfully' });
  });

  // ── DELETE /channels/:id/members/:userId ──────────────────────────────────
  fastify.delete(
    '/channels/:id/members/:userId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: channelId, userId: targetUserId } = request.params as {
        id: string;
        userId: string;
      };
      const { id: requesterId, orgId } = request.user;

      // Verify requester is admin/owner OR is removing themselves
      const isSelf = requesterId === targetUserId;

      if (!isSelf) {
        const { rows: roleRows } = await query<ChannelMemberRow>(
          `SELECT cm.role
             FROM channel_members cm
             JOIN channels c ON c.id = cm.channel_id
            WHERE cm.channel_id = $1
              AND cm.user_id    = $2
              AND c.org_id      = $3`,
          [channelId, requesterId, orgId],
        );
        const requester = roleRows[0];
        if (!requester || (requester.role !== 'owner' && requester.role !== 'admin')) {
          return reply.status(403).send({ error: 'Insufficient permissions to remove members' });
        }
      }

      await query(
        `DELETE FROM channel_members WHERE channel_id = $1 AND user_id = $2`,
        [channelId, targetUserId],
      );

      logger.info('Member removed from channel', { channelId, targetUserId, requesterId });
      return reply.status(204).send();
    },
  );

  // ── PUT /channels/:id/read ────────────────────────────────────────────────
  fastify.put('/channels/:id/read', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: channelId } = request.params as { id: string };
    const { id: userId } = request.user;

    await query(
      `UPDATE channel_members
          SET last_read_at = NOW()
        WHERE channel_id = $1
          AND user_id    = $2`,
      [channelId, userId],
    );

    return reply.status(204).send();
  });
}
