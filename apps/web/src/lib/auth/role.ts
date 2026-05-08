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
 * be rejected, or null when the role is sufficient. Demo mode (no token)
 * is treated as the implicit owner so unauthenticated demos still work
 * — flipping `DEMO_MODE: false` in vercel.json closes that hole.
 */
export async function requireRole(
  req: Request,
  allowed: WorkspaceRole[],
): Promise<Response | null> {
  // Demo gate: no cookie + DEMO_MODE on → permit.
  const cookieHeader = req.headers.get("cookie") ?? "";
  if (!cookieHeader.includes("vyne-token=")) {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return null;
    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }
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
