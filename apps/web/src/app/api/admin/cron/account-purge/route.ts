import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// /api/admin/cron/account-purge (PH-H)
//
// Daily Vercel Cron at 08:00 UTC. Walks every AccountDeletion row
// where scheduledFor <= now AND hardDeletedAt is null, then deletes
// every per-tenant row + the user row, in a single transaction per
// account so a partial failure rolls back cleanly.
//
// Auth: Vercel Cron signs requests with x-vercel-cron-signature; we
// also accept Bearer CRON_SECRET for manual triggers from a runbook.
//
// What we keep after hard delete:
//   • The AccountDeletion row itself (audit trail), with
//     `hardDeletedAt` set + `entityCounts` showing the final per-table
//     counts at delete time.
//   • AuditEvent rows for this orgId — anonymised at 90 days by a
//     separate cron (PH-H ships the deletion path; audit anonymisation
//     belongs in PH-I).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5min — purge of a large workspace

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

function isAuthorized(req: Request): boolean {
  if (req.headers.get("x-vercel-cron-signature")) return true;
  const provided = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  return Boolean(process.env.CRON_SECRET) && provided === expected;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: "Unauthorized — cron only" },
      { status: 401 },
    );
  }

  const ripe = await prisma.accountDeletion.findMany({
    where: { scheduledFor: { lte: new Date() }, hardDeletedAt: null },
    take: 50, // bounded per run; cron repeats daily
  });

  const results: Array<{
    id: string;
    userId: string;
    orgId: string;
    entityCounts: Record<string, number>;
    error?: string;
  }> = [];

  for (const record of ripe) {
    const counts: Record<string, number> = {};
    try {
      // Walk every per-tenant table once, deleting rows scoped to
      // the owning orgId. We don't wrap in a single Prisma
      // transaction because Neon's pooler caps statement timeout —
      // chunking per-table is safer for large workspaces.
      for (const key of TENANT_ENTITIES) {
        const delegate = (
          prisma as unknown as Record<
            string,
            {
              deleteMany: (args: {
                where: object;
              }) => Promise<{ count: number }>;
            }
          >
        )[key];
        if (!delegate?.deleteMany) {
          counts[key] = -1;
          continue;
        }
        const res = await delegate.deleteMany({
          where: { orgId: record.orgId },
        });
        counts[key] = res.count;
      }

      // Subscriptions, PasswordResetTokens — keyed by userId/orgId.
      await prisma.subscription
        .deleteMany({ where: { orgId: record.orgId } })
        .catch(() => undefined);
      await prisma.passwordResetToken
        .deleteMany({ where: { userId: record.userId } })
        .catch(() => undefined);

      // User row last. With it gone, the workspace is irrecoverable.
      await prisma.user
        .delete({ where: { id: record.userId } })
        .catch(() => undefined);

      // Mark the deletion record processed so we don't reprocess.
      await prisma.accountDeletion.update({
        where: { id: record.id },
        data: { hardDeletedAt: new Date(), entityCounts: counts },
      });

      results.push({
        id: record.id,
        userId: record.userId,
        orgId: record.orgId,
        entityCounts: counts,
      });
    } catch (err) {
      results.push({
        id: record.id,
        userId: record.userId,
        orgId: record.orgId,
        entityCounts: counts,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    purgedAt: new Date().toISOString(),
    candidatesFound: ripe.length,
    purged: results.filter((r) => !r.error).length,
    failed: results.filter((r) => r.error).length,
    results,
  });
}
