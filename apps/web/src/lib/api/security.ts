import { NextResponse } from "next/server";
import { getRedis } from "@/lib/db/redis";

// ─── CSRF (double-submit cookie) ──────────────────────────────────
//
// Defense-in-depth on top of SameSite=Strict. The flow is:
//   1. /api/auth/session writes a random `vyne-csrf` cookie alongside
//      the auth cookie. This cookie is NOT HttpOnly (intentional) so
//      same-origin JS can read it.
//   2. Clients copy the cookie value into the `X-CSRF-Token` header on
//      every state-changing request.
//   3. Server-side `requireCsrf` confirms the header matches the
//      cookie. A cross-site attacker cannot read the cookie (same-
//      origin policy), so they cannot forge the header.
//
// We intentionally accept the request when neither cookie nor header
// is present and the route is also gated by `requireAuth` — that case
// is already a 401, not a CSRF concern. If the cookie exists but the
// header is missing/mismatched, that IS a CSRF attempt, and we 403.

export function generateCsrfToken(): string {
  // crypto is available in both edge and node runtimes on Vercel.
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function csrfCookieAttrs(maxAgeSec: number): string {
  // NOT HttpOnly — JS must be able to read this on the client.
  // SameSite=Strict + Secure still keeps it from leaking cross-site.
  return ["Path=/", `Max-Age=${maxAgeSec}`, "Secure", "SameSite=Strict"].join(
    "; ",
  );
}

export function requireCsrf(req: Request): NextResponse | null {
  // GET/HEAD/OPTIONS are safe by HTTP semantics — never require CSRF.
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS")
    return null;

  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookies = parseCookies(cookieHeader);
  const cookieToken = cookies["vyne-csrf"];
  const headerToken = req.headers.get("x-csrf-token");

  // No cookie means the user has never visited an authenticated page.
  // For CSRF we must reject — but routes meant to be callable
  // anonymously (e.g. /api/waitlist) shouldn't call requireCsrf at all.
  if (!cookieToken || !headerToken) {
    return NextResponse.json({ error: "Missing CSRF token" }, { status: 403 });
  }

  // Constant-time comparison.
  if (!safeEqual(cookieToken, headerToken)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  return null;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= (a.codePointAt(i) ?? 0) ^ (b.codePointAt(i) ?? 0);
  }
  return mismatch === 0;
}

// ─── Auth gate ───────────────────────────────────────────────────
// Lightweight session check for API routes. Honors the same cookies
// the dashboard middleware uses: real JWT (`vyne-token`) or demo mode
// (`vyne-demo`). Doesn't validate the JWT signature here — that is
// the backend's job — but blocks fully unauthenticated callers from
// hitting expensive or destructive endpoints.

export interface RequireAuthResult {
  ok: boolean;
  response?: NextResponse;
  isDemo: boolean;
  token?: string;
}

export function requireAuth(req: Request): RequireAuthResult {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookies = parseCookies(cookieHeader);
  const token = cookies["vyne-token"];
  const demo = cookies["vyne-demo"];

  if (!token && !demo) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
      isDemo: false,
    };
  }

  return { ok: true, isDemo: !token && demo === "1", token };
}

function parseCookies(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (name) out[name] = decodeURIComponent(value);
  }
  return out;
}

// ─── Rate limit ──────────────────────────────────────────────────
// Per-IP fixed-window counter. Uses Upstash Redis when configured
// (KV_REST_API_URL/TOKEN) so limits are shared across all serverless
// instances. Falls back to an in-memory Map per instance — better than
// nothing for low-traffic and demo deployments.

interface RateLimitOptions {
  /** Stable identifier for this limiter (e.g., "ai-ask"). */
  key: string;
  /** Allowed requests per window. */
  limit: number;
  /** Window length in seconds. */
  windowSec: number;
  /** Incoming request — used to extract the caller IP. */
  req: Request;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetInSec: number;
  response?: NextResponse;
}

const memoryStore = new Map<string, { count: number; expiresAt: number }>();

export async function rateLimit(
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  const ip = clientIp(opts.req);
  const bucketKey = `rl:${opts.key}:${ip}`;
  const now = Math.floor(Date.now() / 1000);

  const redis = getRedis();
  let count: number;
  let ttl: number;

  if (redis) {
    count = (await redis.incr(bucketKey)) ?? 1;
    if (count === 1) {
      await redis.expire(bucketKey, opts.windowSec);
      ttl = opts.windowSec;
    } else {
      const t = await redis.ttl(bucketKey);
      ttl = typeof t === "number" && t > 0 ? t : opts.windowSec;
    }
  } else {
    const existing = memoryStore.get(bucketKey);
    if (!existing || existing.expiresAt <= now) {
      memoryStore.set(bucketKey, { count: 1, expiresAt: now + opts.windowSec });
      count = 1;
      ttl = opts.windowSec;
    } else {
      existing.count += 1;
      count = existing.count;
      ttl = existing.expiresAt - now;
    }
    // Crude memory cleanup so the Map doesn't grow unbounded across cold starts.
    if (memoryStore.size > 1000) {
      for (const [k, v] of memoryStore) {
        if (v.expiresAt <= now) memoryStore.delete(k);
      }
    }
  }

  const remaining = Math.max(0, opts.limit - count);
  if (count > opts.limit) {
    return {
      ok: false,
      remaining: 0,
      resetInSec: ttl,
      response: NextResponse.json(
        {
          error: "Rate limit exceeded. Slow down.",
          retryAfterSec: ttl,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(ttl),
            "X-RateLimit-Limit": String(opts.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(now + ttl),
          },
        },
      ),
    };
  }

  return { ok: true, remaining, resetInSec: ttl };
}

function clientIp(req: Request): string {
  // Vercel sets x-forwarded-for / x-real-ip on every request. Fall back
  // to a static bucket so dev requests still rate-limit.
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
