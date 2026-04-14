/**
 * Notification routes:
 *   GET  /notifications              — list in-app notifications for current user
 *   PUT  /notifications/:id/read     — mark a notification as read
 *   GET  /notifications/unread-count — get unread count
 *   POST /notifications/preferences  — update notification preferences
 *   POST /notifications/register-device — register Expo push token for user
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  getNotifications,
  markRead,
  getUnreadCount,
} from '../channels/inapp.js';
import { logger } from '../logger.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const registerDeviceSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android']),
  deviceName: z.string().optional(),
});

// In-memory device token store (keyed by userId → set of tokens).
// In production this would be persisted to a database table.
const deviceTokens = new Map<string, Set<string>>();

export function getDeviceTokensForUser(userId: string): string[] {
  const tokens = deviceTokens.get(userId);
  return tokens ? Array.from(tokens) : [];
}

const preferencesSchema = z.object({
  email: z
    .object({
      issueAssigned: z.boolean().optional(),
      issueMentioned: z.boolean().optional(),
      deploymentFailed: z.boolean().optional(),
    })
    .optional(),
  push: z
    .object({
      messageMention: z.boolean().optional(),
      issueAssigned: z.boolean().optional(),
    })
    .optional(),
  inapp: z
    .object({
      all: z.boolean().optional(),
    })
    .optional(),
});

// ---------------------------------------------------------------------------
// JWT user helper (populated by @fastify/jwt verify)
// ---------------------------------------------------------------------------

interface JwtUser {
  id: string;
  email: string;
  org_id: string;
  role: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: JwtUser;
  }
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export async function notificationRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes in this plugin require authentication
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      await reply.status(401).send({ error: 'Unauthorized', message: String(err) });
    }
  });

  // -------------------------------------------------------------------------
  // GET /notifications
  // -------------------------------------------------------------------------
  fastify.get(
    '/notifications',
    async (request: FastifyRequest<{ Querystring: { limit?: string } }>, reply) => {
      const user = request.user as JwtUser;
      const limit = Math.min(Number.parseInt(request.query.limit ?? '50', 10), 200);

      const notifications = await getNotifications(user.id, limit);
      return reply.send({ notifications, userId: user.id });
    },
  );

  // -------------------------------------------------------------------------
  // PUT /notifications/:id/read
  // -------------------------------------------------------------------------
  fastify.put(
    '/notifications/:id/read',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
      const user = request.user as JwtUser;
      const { id } = request.params;

      const updated = await markRead(user.id, id);
      if (!updated) {
        return reply.status(404).send({ error: 'Notification not found or already read' });
      }
      return reply.send({ id, read: true });
    },
  );

  // -------------------------------------------------------------------------
  // GET /notifications/unread-count
  // NOTE: must be registered BEFORE /notifications/:id/read so that
  //       'unread-count' is not matched as an :id param.
  // -------------------------------------------------------------------------
  fastify.get('/notifications/unread-count', async (request, reply) => {
    const user = request.user as JwtUser;
    const count = await getUnreadCount(user.id);
    return reply.send({ count });
  });

  // -------------------------------------------------------------------------
  // POST /notifications/preferences
  // -------------------------------------------------------------------------
  fastify.post(
    '/notifications/preferences',
    async (request: FastifyRequest<{ Body: unknown }>, reply) => {
      const user = request.user as JwtUser;

      const parsed = preferencesSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(422).send({ error: 'Validation error', issues: parsed.error.issues });
      }

      // In a full implementation these preferences would be persisted to the
      // database.  For now we acknowledge the update and log it.
      logger.info('notification_preferences_updated', {
        userId: user.id,
        preferences: parsed.data,
      });

      return reply.send({
        message: 'Preferences updated',
        userId: user.id,
        preferences: parsed.data,
      });
    },
  );

  // -------------------------------------------------------------------------
  // POST /notifications/register-device
  // -------------------------------------------------------------------------
  fastify.post(
    '/notifications/register-device',
    async (request: FastifyRequest<{ Body: unknown }>, reply) => {
      const user = request.user as JwtUser;

      const parsed = registerDeviceSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(422).send({ error: 'Validation error', issues: parsed.error.issues });
      }

      const { token, platform, deviceName } = parsed.data;

      if (!deviceTokens.has(user.id)) {
        deviceTokens.set(user.id, new Set());
      }
      deviceTokens.get(user.id)!.add(token);

      logger.info('device_registered', {
        userId: user.id,
        platform,
        deviceName: deviceName ?? 'unknown',
        tokenPrefix: token.slice(0, 20),
      });

      return reply.send({ registered: true, token });
    },
  );
}
