import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/api/security";
import { resolveSession } from "@/lib/auth/role";

// /api/account/delete (PH-H — GDPR Art. 17 "right to erasure")
//
// Three actions, all gated on the caller's own session (never
// cross-account):
//   POST   /api/account/delete                  — schedule deletion in 30d
//   GET    /api/account/delete                  — read pending request
//   DELETE /api/account/delete?confirm=cancel   — cancel a pending request
//
// Why 30 days: GDPR doesn't require an instant hard-delete; a grace
// period lets a user undo an accidental deletion + lets us walk every
// table predictably (a daily cron processes anything past its
// scheduledFor). The user is logged out immediately when the request
// is filed — the session is invalidated even though rows remain for
// the grace window.
//
// What gets deleted:
//   • User row + their session cookies (Set-Cookie: vyne-token=; max-age=0)
//   • Every per-tenant row owned by the user's orgId across all 28
//     Prisma models. We rely on orgId being the only tenancy anchor;
//     no row escapes because every model has it indexed.
//   • Audit log entries are anonymised at 90 days (userId → "deleted-<hash>")
//     rather than hard-deleted, so SOC2 trail survives the deletion.
//
// What does NOT get deleted by this endpoint:
//   • Subscriptions — Stripe customer record is preserved per legal
//     requirements (tax invoicing). We delete the Subscription row's
//     stripeCustomerId mapping but the Stripe-side customer remains;
//     the user is asked to contact billing@vyne.app for that side.
//   • Vercel Blob backups containing the user's data — purged via
//     the Blob retention policy (30-day TTL) rather than mid-flight.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRACE_DAYS = 30;

interface DeletionPreview {
  user: { id: string; email: string; orgId: string };
  scheduledFor: string;
  entityCounts: Record<string, number>;
}

// Enumerate the 26 per-tenant entities the cron will hard-delete. The
// `User` + `Subscription` + `AccountDeletion` rows are handled
// separately because they don't follow the orgId pattern uniformly.
const TENANT_ENTITIES = [
  "deal",
  "contact",
  "account",
  "customer",
  "invoice",
  "product",
  "project",
  "task",
  "taskDependency",
  "order",
  "supplier",
  "expense",
  "journalEntry",
  "salesOpportunity",
  "salesQuote",
  "salesOrder",
  "salesProduct",
  "salesCustomer",
  "fieldTechnician",
  "fieldJob",
  "employee",
  "leaveRequest",
  "pushSubscription",
  "embedding",
] as const;

type TenantEntity = (typeof TENANT_ENTITIES)[number];

async function countTenantRows(orgId: string): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const key of TENANT_ENTITIES) {
    const delegate = (
      prisma as unknown as Record<
        string,
        { count: (args: { where: object }) => Promise<number> }
      >
    )[key];
    if (!delegate?.count) continue;
    try {
      counts[key] = await delegate.count({ where: { orgId } });
    } catch {
      counts[key] = -1; // sentinel — table may not yet exist on this branch
    }
  }
  return counts;
}

export async function POST(req: Request) {
  const rl = await rateLimit({
    key: "account-delete",
    limit: 3,
    windowSec: 3600,
    req,
  });
  if (!rl.ok) return rl.response!;

  const session = await resolveSession(req);
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  // Look up the full user row — we need orgId + email for the audit
  // entry and to bind the deletion record.
  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    select: { id: true, email: true, orgId: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Idempotent — if a request is already pending, return it instead
  // of stacking another row.
  const existing = await prisma.accountDeletion.findUnique({
    where: { userId: user.id },
  });
  if (existing && !existing.hardDeletedAt) {
    return NextResponse.json({
      ok: true,
      alreadyPending: true,
      requestedAt: existing.requestedAt,
      scheduledFor: existing.scheduledFor,
    });
  }

  let body: { reason?: string; confirm?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  if (body.confirm !== true) {
    // Dry-run mode — show the user what would be deleted before they
    // confirm. The UI calls this first to render the warning panel.
    const counts = await countTenantRows(user.orgId);
    const preview: DeletionPreview = {
      user,
      scheduledFor: new Date(
        Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString(),
      entityCounts: counts,
    };
    return NextResponse.json({ ok: true, dryRun: true, preview });
  }

  // Confirmed — file the deletion request + invalidate the session.
  const scheduledFor = new Date(Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000);
  const counts = await countTenantRows(user.orgId);

  const record = await prisma.accountDeletion.create({
    data: {
      userId: user.id,
      orgId: user.orgId,
      email: user.email,
      scheduledFor,
      reason: body.reason ?? "",
      entityCounts: counts,
    },
  });

  // Audit trail — record the request so the SOC2 trail survives.
  try {
    await prisma.auditEvent.create({
      data: {
        orgId: user.orgId,
        actorId: user.id,
        actorName: user.email,
        entityRef: `user:${user.id}`,
        action: "account.deletion.requested",
        category: "security",
        severity: "warning",
        summary: `Account deletion requested; hard delete on ${scheduledFor.toISOString().slice(0, 10)}`,
      },
    });
  } catch {
    /* audit failures are non-fatal — the request still stands */
  }

  // Clear the session cookies so the user is logged out immediately.
  // The DELETE on /api/auth/session does the same; we duplicate the
  // Set-Cookie headers here so a follow-up GET doesn't see the user
  // as still authenticated.
  const response = NextResponse.json({
    ok: true,
    dryRun: false,
    requestedAt: record.requestedAt,
    scheduledFor: record.scheduledFor,
    entityCounts: counts,
    gracePeriodDays: GRACE_DAYS,
  });
  response.cookies.set("vyne-token", "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  });
  response.cookies.set("vyne-demo", "", { path: "/", maxAge: 0 });
  return response;
}

export async function GET(req: Request) {
  const session = await resolveSession(req);
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }
  const record = await prisma.accountDeletion.findUnique({
    where: { userId: session.uid },
  });
  if (!record || record.hardDeletedAt) {
    return NextResponse.json({ ok: true, pending: false });
  }
  return NextResponse.json({
    ok: true,
    pending: true,
    requestedAt: record.requestedAt,
    scheduledFor: record.scheduledFor,
    reason: record.reason,
  });
}

export async function DELETE(req: Request) {
  const session = await resolveSession(req);
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }
  const record = await prisma.accountDeletion.findUnique({
    where: { userId: session.uid },
  });
  if (!record || record.hardDeletedAt) {
    return NextResponse.json({
      ok: true,
      canceled: false,
      reason: "No pending deletion to cancel.",
    });
  }
  await prisma.accountDeletion.delete({ where: { id: record.id } });
  try {
    await prisma.auditEvent.create({
      data: {
        orgId: record.orgId,
        actorId: session.uid,
        actorName: session.email,
        entityRef: `user:${session.uid}`,
        action: "account.deletion.canceled",
        category: "security",
        severity: "info",
        summary: "Pending account deletion canceled by user",
      },
    });
  } catch {
    /* non-fatal */
  }
  return NextResponse.json({ ok: true, canceled: true });
}
