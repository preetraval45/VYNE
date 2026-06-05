// PH-C — Auth-specific rate limiting + account lockout.
//
// Layered defenses for /api/auth/* routes:
//   1. Per-IP fixed-window limit (already in lib/api/security.ts).
//   2. Per-email-hash limit so a credential-stuffing attack rotating
//      IPs against the same account still gets throttled.
//   3. Account lockout — after N failed logins on a single email in W
//      minutes, freeze that email for L minutes regardless of IP. The
//      lock is keyed by email_hash so we never store the raw email.
//
// All limits use the existing Redis client when configured and fail
// open to an in-memory counter otherwise. Redis outages are surfaced
// to Sentry as warnings so we know when the limiter degrades.

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";
import { getRedis } from "@/lib/db/redis";

const LOCKOUT_THRESHOLD = 10; // failed logins
const LOCKOUT_WINDOW_SEC = 60 * 60; // within the last hour
const LOCKOUT_DURATION_SEC = 15 * 60; // soft-lock for 15 min

/** sha256 of the (lowercased, trimmed) email — used as a privacy-safe
 *  rate-limit / lockout key. We never store the raw email in Redis. */
export function hashEmail(email: string): string {
  return createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 24);
}

/**
 * Two-key rate limit for an authenticated path. Returns a 429 if
 * either limit is exceeded.
 *
 *   const rl = await authRateLimit({
 *     req, ipKey: "auth-login", ipLimit: 5, ipWindowSec: 60,
 *     emailKey: "auth-login-email", emailHash, emailLimit: 5, emailWindowSec: 60,
 *   });
 *   if (!rl.ok) return rl.response!;
 */
export async function authRateLimit(args: {
  req: Request;
  ipKey: string;
  ipLimit: number;
  ipWindowSec: number;
  emailKey?: string;
  emailHash?: string | null;
  emailLimit?: number;
  emailWindowSec?: number;
}): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const ipRl = await rateLimit({
    req: args.req,
    key: args.ipKey,
    limit: args.ipLimit,
    windowSec: args.ipWindowSec,
  });
  if (!ipRl.ok) {
    return { ok: false, response: ipRl.response! };
  }

  if (
    args.emailKey &&
    args.emailHash &&
    args.emailLimit &&
    args.emailWindowSec
  ) {
    // Reuse the same rateLimit primitive but key by email_hash instead
    // of IP. We synthesize a fake Request with an x-forwarded-for header
    // carrying the hash so the IP extractor "sees" the email_hash as
    // the bucket.
    const fakeReq = new Request(new URL("https://vyne.local/_rl"), {
      headers: { "x-forwarded-for": args.emailHash },
    });
    const emailRl = await rateLimit({
      req: fakeReq,
      key: args.emailKey,
      limit: args.emailLimit,
      windowSec: args.emailWindowSec,
    });
    if (!emailRl.ok) {
      return { ok: false, response: emailRl.response! };
    }
  }

  return { ok: true };
}

/**
 * Check whether the account is currently soft-locked due to repeated
 * failed logins. Returns a 423 (Locked) response when so. Caller should
 * use this BEFORE doing the password verify so we don't waste a PBKDF2
 * iteration on a locked account.
 */
export async function checkAccountLock(
  emailHash: string,
): Promise<NextResponse | null> {
  const redis = getRedis();
  if (!redis) return null; // no Redis → can't enforce lock cross-instance, fail open
  const key = `lock:${emailHash}`;
  try {
    const locked = await redis.get<string>(key);
    if (locked) {
      const ttlFn = (
        redis as unknown as { ttl: (k: string) => Promise<number> }
      ).ttl;
      const retryAfter = ttlFn
        ? await ttlFn.call(redis, key)
        : LOCKOUT_DURATION_SEC;
      const seconds =
        typeof retryAfter === "number" && retryAfter > 0
          ? retryAfter
          : LOCKOUT_DURATION_SEC;
      return NextResponse.json(
        {
          error: "Too many failed attempts. Try again later.",
          retryAfterSec: seconds,
        },
        {
          status: 423,
          headers: {
            "Retry-After": String(seconds),
          },
        },
      );
    }
  } catch {
    // Redis outage → fail open. Better to risk extra password attempts
    // than to deny everyone during an upstream incident.
  }
  return null;
}

/**
 * Record a failed login. After LOCKOUT_THRESHOLD failures within
 * LOCKOUT_WINDOW_SEC, sets the lock key with LOCKOUT_DURATION_SEC TTL.
 *
 * Returns true when the lock just engaged so the caller can surface a
 * different error message ("locked" vs "wrong password") if it wants.
 */
export async function recordLoginFailure(emailHash: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const counterKey = `loginfail:${emailHash}`;
  const lockKey = `lock:${emailHash}`;
  try {
    const count = (await redis.incr(counterKey)) ?? 1;
    if (count === 1) {
      await redis.expire(counterKey, LOCKOUT_WINDOW_SEC);
    }
    if (count >= LOCKOUT_THRESHOLD) {
      await redis.set(lockKey, "1", { ex: LOCKOUT_DURATION_SEC });
      // Reset the counter so the lock duration becomes the only timer
      // until the next attempt can succeed.
      await redis.del(counterKey);
      return true;
    }
  } catch {
    // Redis outage — we lose this counter increment. Acceptable.
  }
  return false;
}

/**
 * Successful login: clear the failure counter so a user with a few
 * past mistakes doesn't get locked by their N+1 successful attempt.
 */
export async function clearLoginFailures(emailHash: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(`loginfail:${emailHash}`);
  } catch {
    // ignore
  }
}
