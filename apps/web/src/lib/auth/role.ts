// Server-side role resolution (UI_UPGRADE_PLAN.md 7.2).
//
// Reads the session cookie + verifies the HMAC, then returns the user's
// role. Falls back to a DB lookup if the token doesn't carry the role
// (legacy tokens issued before role-in-session shipped). Module is
// node-runtime only — uses prisma.

import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth/server";

export type WorkspaceRole =
  | "owner"
  | "admin"
  | "manager"
  | "member"
  | "guest";

const ROLE_RANK: Record<WorkspaceRole, number> = {
  owner: 100,
  admin: 80,
  manager: 60,
  member: 40,
  guest: 20,
};

export const WRITE_ROLES: WorkspaceRole[] = [
  "owner",
  "admin",
  "manager",
  "member",
];

export const ADMIN_ROLES: WorkspaceRole[] = ["owner", "admin"];

function parseCookie(header: string, name: string): string | null {
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    if (k === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

export interface ResolvedSession {
  uid: string;
  email: string;
  role: WorkspaceRole;
}

/**
 * Pulls the current user from the session cookie, returns null when
 * missing/invalid. The role lookup falls back to the DB when the token
 * doesn't carry it — costs one Prisma round-trip on legacy tokens.
 */
export async function resolveSession(
  req: Request,
): Promise<ResolvedSession | null> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const token = parseCookie(cookieHeader, "vyne-token");
  if (!token) return null;
  const payload = verifySessionToken(token);
  if (!payload) return null;

  // Token-carried role wins.
  const tokenRole = (payload as Partial<{ role: string }>).role;
  if (tokenRole && isWorkspaceRole(tokenRole)) {
    return { uid: payload.uid, email: payload.email, role: tokenRole };
  }

  // Fall back to DB.
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.uid },
      select: { role: true },
    });
    const role: WorkspaceRole =
      user?.role && isWorkspaceRole(user.role) ? user.role : "owner";
    return { uid: payload.uid, email: payload.email, role };
  } catch {
    // DB unreachable — keep the user authenticated but downgrade to
    // "member" so unsafe writes get blocked.
    return { uid: payload.uid, email: payload.email, role: "member" };
  }
}

function isWorkspaceRole(s: string): s is WorkspaceRole {
  return s === "owner" || s === "admin" || s === "manager" || s === "member" || s === "guest";
}

/** Returns true when the role meets at least the required role's rank. */
export function roleAtLeast(
  role: WorkspaceRole,
  atLeast: WorkspaceRole,
): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[atLeast];
}

/**
 * Gate helper for API routes. Returns a Response when the request should
 * be rejected, or null when the role is sufficient.
 *
 * Three accepted paths:
 *   1. Real session (`vyne-token`) — verify + check role against `allowed`
 *   2. Demo session (`vyne-demo=1` cookie set by /login demo button) —
 *      treated as implicit owner so demo workspaces stay editable after
 *      `NEXT_PUBLIC_DEMO_MODE` is flipped off (UI_UPGRADE_PLAN.md 1.6)
 *   3. `NEXT_PUBLIC_DEMO_MODE=true` — legacy global bypass (kept so
 *      preview / staging deploys can opt back in via env)
 */
export async function requireRole(
  req: Request,
  allowed: WorkspaceRole[],
): Promise<Response | null> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const hasRealToken = /(?:^|;\s*)vyne-token=/.test(cookieHeader);
  const hasDemoCookie = /(?:^|;\s*)vyne-demo=1\b/.test(cookieHeader);

  // Path 2: demo cookie → permit as implicit owner.
  if (hasDemoCookie && !hasRealToken) {
    return null;
  }

  // Path 3: legacy global bypass.
  if (!hasRealToken && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    return null;
  }

  // No real token → 401.
  if (!hasRealToken) {
    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }

  // Path 1: real session.
  const session = await resolveSession(req);
  if (!session) {
    return new Response(
      JSON.stringify({ error: "Invalid session" }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }
  if (!allowed.includes(session.role)) {
    return new Response(
      JSON.stringify({
        error: `Role "${session.role}" can't perform this action`,
        required: allowed,
      }),
      { status: 403, headers: { "content-type": "application/json" } },
    );
  }
  return null;
}
