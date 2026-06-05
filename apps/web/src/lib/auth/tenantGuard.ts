// Server-side tenant + auth resolver. Every /api/<resource> route that
// touches user data should `await tenantGuard(req)` first — it returns
// the active session's userId / orgId / role, or a 401/403 Response that
// the route must return as-is.
//
// PH-A — "Postgres-back every Zustand store" — depends on this helper.
// Without it, every Prisma query is effectively single-tenant.
//
// Three paths:
//   1. Real session (`vyne-token` cookie) → looks up the User row to read
//      orgId. Cached per-request via a WeakMap so multiple guard() calls
//      on the same Request don't re-roundtrip the DB.
//   2. Demo session (`vyne-demo=1` cookie) → fixed `org-demo` tenant. UI
//      keeps working without an account; data is shared across all demo
//      visitors and routinely wiped.
//   3. No cookies → 401.
//
// Module is node-runtime only — uses prisma.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth/server";

export type WorkspaceRole = "owner" | "admin" | "manager" | "member" | "guest";

export interface TenantContext {
  userId: string;
  orgId: string;
  email: string;
  role: WorkspaceRole;
  /** True when the caller is in the read-only demo path. Routes can
   *  refuse risky mutations for demo users by checking this. */
  demo: boolean;
}

const DEMO_ORG_ID = "org-demo";
const DEMO_EMAIL = "demo@vyne.app";
const DEMO_USER_ID = "user-demo";

// Per-request cache so a route handler can call guard() in helpers
// without paying the cookie+DB cost multiple times.
const requestCache = new WeakMap<Request, TenantContext | null>();

function parseCookie(header: string, name: string): string | null {
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    if (k === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

function isWorkspaceRole(s: string | undefined): s is WorkspaceRole {
  return (
    s === "owner" ||
    s === "admin" ||
    s === "manager" ||
    s === "member" ||
    s === "guest"
  );
}

/**
 * Returns the caller's tenant context or null when not authenticated.
 * Most routes should prefer `requireTenant()` instead — it returns a
 * ready-made 401 Response on failure.
 */
export async function resolveTenant(
  req: Request,
): Promise<TenantContext | null> {
  if (requestCache.has(req)) return requestCache.get(req) ?? null;

  const cookies = req.headers.get("cookie") ?? "";
  const sessionToken = parseCookie(cookies, "vyne-token");
  const demoCookie = parseCookie(cookies, "vyne-demo");

  // Path 1 — real session.
  if (sessionToken) {
    const payload = verifySessionToken(sessionToken);
    if (payload) {
      // The token may already carry role + orgId (newer issuances). If
      // not, fall back to a single Prisma round-trip.
      const tokenRole = (payload as Partial<{ role: string }>).role;
      const tokenOrg = (payload as Partial<{ orgId: string }>).orgId;
      let role: WorkspaceRole = isWorkspaceRole(tokenRole)
        ? tokenRole
        : "owner";
      let orgId = tokenOrg ?? "";

      if (!orgId) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: payload.uid },
            select: { orgId: true, role: true },
          });
          if (user) {
            orgId = user.orgId ?? `org-${payload.uid}`;
            if (isWorkspaceRole(user.role)) role = user.role;
          } else {
            // Token validated but user row gone — treat as invalid.
            requestCache.set(req, null);
            return null;
          }
        } catch {
          // DB unreachable. We still trust the verified session token,
          // but isolate the caller to their per-user org so they don't
          // accidentally see another tenant's data on degraded paths.
          orgId = `org-${payload.uid}`;
          role = "member";
        }
      }

      const ctx: TenantContext = {
        userId: payload.uid,
        orgId,
        email: payload.email,
        role,
        demo: false,
      };
      requestCache.set(req, ctx);
      return ctx;
    }
    // Token present but invalid — fall through to demo / null.
  }

  // Path 2 — demo cookie.
  if (demoCookie === "1") {
    const ctx: TenantContext = {
      userId: DEMO_USER_ID,
      orgId: DEMO_ORG_ID,
      email: DEMO_EMAIL,
      role: "owner",
      demo: true,
    };
    requestCache.set(req, ctx);
    return ctx;
  }

  // Path 3 — unauthenticated.
  requestCache.set(req, null);
  return null;
}

/**
 * Use this in route handlers. On success returns the tenant context.
 * On failure returns a 401 Response which the route must return directly.
 *
 *   const ctx = await requireTenant(req);
 *   if (ctx instanceof Response) return ctx;
 *
 * Then every Prisma call uses `orgId: ctx.orgId` for the tenant filter.
 */
export async function requireTenant(
  req: Request,
): Promise<TenantContext | Response> {
  const ctx = await resolveTenant(req);
  if (!ctx) {
    return NextResponse.json(
      { error: "Unauthorized — sign in or enable demo mode" },
      { status: 401 },
    );
  }
  return ctx;
}

/**
 * Stronger guard for write paths. Returns a 403 Response when a demo
 * user attempts a write that would taint shared demo data. Demo
 * mutations are still allowed by default (so the showcase is fully
 * interactive); set `blockDemo: true` for paths that must persist real
 * data only (billing, MFA setup, audit-log writes).
 */
export async function requireRealTenant(
  req: Request,
): Promise<TenantContext | Response> {
  const ctx = await requireTenant(req);
  if (ctx instanceof Response) return ctx;
  if (ctx.demo) {
    return NextResponse.json(
      { error: "This action is not available in demo mode" },
      { status: 403 },
    );
  }
  return ctx;
}

/** Constant tenant id for demo workspaces. Exported for seed scripts. */
export const VYNE_DEMO_ORG_ID = DEMO_ORG_ID;
