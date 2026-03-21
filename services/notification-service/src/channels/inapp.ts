/**
 * In-app notification channel — stores notifications in Redis sorted sets.
 *
 * Data model:
 *   ZADD  vyne:notifications:{userId}  <timestamp>  <serialised Notification JSON>
 *   HSET  vyne:notif-meta:{userId}:{id}  read  "0"
 *
 * We use a sorted set keyed by timestamp so that pagination and ordered
 * retrieval are O(log N).  The unread count is maintained in a separate
 * Redis counter key for O(1) reads.
 */

import Redis from 'ioredis';
import { config } from '../config.js';
import { logger } from '../logger.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  link?: string;
  read: boolean;
  createdAt: string; // ISO timestamp
}

// ---------------------------------------------------------------------------
// Redis client (lazy singleton)
// ---------------------------------------------------------------------------

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    _redis.on('error', (err: Error) => {
      logger.error('redis_error', { error: String(err) });
    });
  }
  return _redis;
}

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

const listKey = (userId: string) => `vyne:notifications:${userId}`;
const countKey = (userId: string) => `vyne:notif-unread:${userId}`;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Store a new in-app notification for a user.
 */
export async function storeNotification(
  userId: string,
  notification: Omit<Notification, 'userId' | 'read' | 'createdAt'>,
): Promise<Notification> {
  const now = new Date();
  const full: Notification = {
    ...notification,
    userId,
    read: false,
    createdAt: now.toISOString(),
  };

  const redis = getRedis();
  const score = now.getTime(); // millisecond timestamp as sort score

  try {
    await redis.zadd(listKey(userId), score, JSON.stringify(full));
    await redis.incr(countKey(userId));
    // Keep only the latest 500 notifications per user
    await redis.zremrangebyrank(listKey(userId), 0, -501);
  } catch (err) {
    logger.error('inapp_store_error', { userId, error: String(err) });
    throw err;
  }

  return full;
}

/**
 * Retrieve the most recent `limit` notifications for a user (newest first).
 */
export async function getNotifications(
  userId: string,
  limit: number = 50,
): Promise<Notification[]> {
  const redis = getRedis();
  try {
    // ZREVRANGE returns highest-scored (newest) elements first
    const raw = await redis.zrevrange(listKey(userId), 0, limit - 1);
    return raw.map((item) => JSON.parse(item) as Notification);
  } catch (err) {
    logger.error('inapp_get_error', { userId, error: String(err) });
    return [];
  }
}

/**
 * Mark a specific notification as read.
 * We re-serialise the item in the sorted set with read = true.
 */
export async function markRead(userId: string, notificationId: string): Promise<boolean> {
  const redis = getRedis();
  try {
    // Scan all notifications for the user to find and update the target
    const raw = await redis.zrange(listKey(userId), 0, -1, 'WITHSCORES');
    // raw = [member, score, member, score, ...]
    for (let i = 0; i < raw.length; i += 2) {
      const member = raw[i] as string;
      const score = raw[i + 1] as string;
      const notif = JSON.parse(member) as Notification;
      if (notif.id === notificationId && !notif.read) {
        const updated: Notification = { ...notif, read: true };
        const pipeline = redis.pipeline();
        pipeline.zrem(listKey(userId), member);
        pipeline.zadd(listKey(userId), parseFloat(score), JSON.stringify(updated));
        // Decrement unread counter, guarding against going below 0
        pipeline.decr(countKey(userId));
        await pipeline.exec();
        // Guard: ensure counter never goes negative
        await redis.eval(
          `local v = redis.call('GET', KEYS[1]) if v and tonumber(v) < 0 then redis.call('SET', KEYS[1], 0) end return 1`,
          1,
          countKey(userId),
        );
        return true;
      }
    }
    return false;
  } catch (err) {
    logger.error('inapp_markread_error', { userId, notificationId, error: String(err) });
    return false;
  }
}

/**
 * Return the number of unread notifications for a user.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const redis = getRedis();
  try {
    const val = await redis.get(countKey(userId));
    const n = parseInt(val ?? '0', 10);
    return isNaN(n) || n < 0 ? 0 : n;
  } catch (err) {
    logger.error('inapp_unread_count_error', { userId, error: String(err) });
    return 0;
  }
}
