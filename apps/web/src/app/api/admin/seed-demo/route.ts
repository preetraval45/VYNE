import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";
import { requireRole, ADMIN_ROLES, resolveSession } from "@/lib/auth/role";
import { seedDemoWorkspace } from "@/lib/seedDemoWorkspace";

// /api/admin/seed-demo (UI_UPGRADE_PLAN.md 1.5)
//
// Manual trigger to seed (or re-seed) the demo dataset on an existing
// workspace. Admin-only via requireRole. Skips entities that already
// have rows so it's safe to re-run.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rl = await rateLimit({
    key: "admin-seed-demo",
    limit: 6,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  const gate = await requireRole(req, ADMIN_ROLES);
  if (gate) return gate;

  // Resolve which orgId we're seeding into. Real session → user.orgId
  // (looked up via prisma in resolveSession). Demo cookie → "demo".
  const session = await resolveSession(req);
  const cookieHeader = req.headers.get("cookie") ?? "";
  const isDemoCookie = /(?:^|;\s*)vyne-demo=1\b/.test(cookieHeader);
  const orgId = session?.uid
    ? // Real signup users get their canonical orgId from the user row.
      // resolveSession already resolves role; signup sets orgId="org-self"
      // by default. We don't carry orgId in the token today, so use uid
      // as a stable fallback.
      session.uid
    : isDemoCookie
      ? "demo"
      : "demo";

  try {
    const result = await seedDemoWorkspace(orgId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Seed failed",
      },
      { status: 500 },
    );
  }
}
