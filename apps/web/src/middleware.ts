import { NextResponse, type NextRequest } from "next/server";

// ─── PH-C — Generic /api/* backstop rate limit ───────────────────
// Edge-compatible per-IP fixed-window counter held in-process. This
// is a backstop only — per-route limits in lib/api/security.ts (Redis-
// backed when configured) catch credential stuffing / brute force on
// the hot paths. This catches a single IP fanning out at >100 req/min
// across many routes. In-memory means cold starts reset the counter,
// which is acceptable for the backstop case (a real attacker would
// still trip per-route limits). Vercel routes most traffic to a small
// pool of warm functions, so 100 req/min/IP catches obvious abuse.

interface ApiRlEntry {
  count: number;
  expiresAt: number;
}
const API_RL_LIMIT = 100;
const API_RL_WINDOW_SEC = 60;
const apiRl = new Map<string, ApiRlEntry>();

function apiBackstop(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/api/")) return null;
  // Static assets sit on a different path; webhook events come from
  // Stripe and must NOT be throttled.
  if (pathname.startsWith("/api/stripe/webhook")) return null;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const key = `api:${ip}`;
  const now = Math.floor(Date.now() / 1000);
  const existing = apiRl.get(key);
  if (!existing || existing.expiresAt <= now) {
    apiRl.set(key, { count: 1, expiresAt: now + API_RL_WINDOW_SEC });
    if (apiRl.size > 2000) {
      // Crude eviction so the Map doesn't grow unbounded.
      for (const [k, v] of apiRl) {
        if (v.expiresAt <= now) apiRl.delete(k);
      }
    }
    return null;
  }
  existing.count += 1;
  if (existing.count > API_RL_LIMIT) {
    const retryAfter = Math.max(1, existing.expiresAt - now);
    return new NextResponse(
      JSON.stringify({
        error: "Too many requests. Please slow down.",
        retryAfterSec: retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(API_RL_LIMIT),
          "X-RateLimit-Window": String(API_RL_WINDOW_SEC),
        },
      },
    );
  }
  return null;
}

// ─── Auth guard ───────────────────────────────────────────────────
// The dashboard relied on a client-side Zustand check, so any visitor
// could hit /home directly and see the layout flash before the client
// redirect fired. Guard all authenticated routes server-side.
//
// We look for either:
//   - a real JWT cookie set by the backend (`vyne-token`)
//   - or the demo-mode client flag (`vyne-demo=1`) which the login page
//     writes when the user clicks "Try instant demo" — demo users have
//     a valid UX without a real account.
//
// Unauthenticated visitors are redirected to /login with `?next=` so
// they return to their intended destination after signing in.

const AUTH_PATHS = [
  "/home",
  "/dashboard",
  "/projects",
  "/chat",
  "/docs",
  "/ops",
  "/crm",
  "/hr",
  "/sales",
  "/finance",
  "/invoicing",
  "/purchase",
  "/manufacturing",
  "/maintenance",
  "/marketing",
  "/expenses",
  "/reporting",
  "/observe",
  "/ai",
  "/automations",
  "/code",
  "/roadmap",
  "/contacts",
  "/timesheet",
  "/training",
  "/playbooks",
  "/help",
  "/activity",
  "/settings",
  "/admin",
];

function isAuthPath(pathname: string) {
  return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // PH-C backstop runs first — fastest reject if IP is hammering.
  const rl = apiBackstop(req);
  if (rl) return rl;

  if (!isAuthPath(pathname)) return NextResponse.next();

  const token = req.cookies.get("vyne-token")?.value;
  const demo = req.cookies.get("vyne-demo")?.value;
  if (token || demo) return NextResponse.next();

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Run on /api/* (PH-C backstop) AND on dashboard paths (auth guard).
    // Static assets + Next.js internals are still excluded.
    "/((?!_next/static|_next/image|favicon.ico|brand/|images/|icons/).*)",
  ],
};
