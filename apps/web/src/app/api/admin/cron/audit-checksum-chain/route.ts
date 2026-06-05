import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

// /api/admin/cron/audit-checksum-chain (PH-I)
//
// Daily 03:00 UTC Vercel Cron. For every org that had any audit
// activity in the past 24h, computes:
//   • dailyHash = sha256( canonical(audit_events for this day) )
//   • chainHash = sha256( prev.chainHash || dailyHash )
// Stores the result in `audit_checksums` keyed by (orgId, date).
//
// Why: tamper-evidence for the audit log (SOC 2 CC6.1 / CC7.2). If
// anyone modifies a past day's audit_events row, the recomputed
// dailyHash differs from the stored one + every subsequent chainHash
// changes too. An external auditor verifies by recomputing the chain
// against the export from /api/admin/audit-export.
//
// Idempotent — re-running for the same day overwrites the same row
// (via unique constraint on (orgId, date)) with the same value.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function isAuthorized(req: Request): boolean {
  if (req.headers.get("x-vercel-cron-signature")) return true;
  const provided = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  return Boolean(process.env.CRON_SECRET) && provided === expected;
}

// Canonical JSON — keys sorted, no whitespace. Two different runs
// against the same input produce the same bytes → the same hash.
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(",")}}`;
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function dayBucket(d: Date): Date {
  // Truncate to UTC midnight so the (orgId, date) unique works
  // regardless of when the cron actually runs that day.
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: "Unauthorized — cron only" },
      { status: 401 },
    );
  }

  const url = new URL(req.url);
  // ?date=YYYY-MM-DD to backfill a specific day; defaults to "yesterday UTC".
  const requestedDate = url.searchParams.get("date");
  const targetDate = requestedDate
    ? dayBucket(new Date(requestedDate))
    : (() => {
        const base = new Date();
        base.setUTCDate(base.getUTCDate() - 1);
        return dayBucket(base);
      })();
  const nextDay = new Date(targetDate);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  // Find every org with audit activity in the target day.
  // groupBy on orgId in the window — Prisma exposes this directly.
  const grouped = await prisma.auditEvent.groupBy({
    by: ["orgId"],
    where: {
      createdAt: { gte: targetDate, lt: nextDay },
    },
    _count: { _all: true },
  });

  const results: Array<{
    orgId: string;
    rowCount: number;
    chainHash: string;
    prevHash: string | null;
    date: string;
  }> = [];

  for (const { orgId, _count } of grouped) {
    // Pull the full set of rows for this org+day, ordered
    // deterministically so the canonical hash is stable.
    const rows = await prisma.auditEvent.findMany({
      where: { orgId, createdAt: { gte: targetDate, lt: nextDay } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    // Strip the volatile `createdAt` resolution down to ISO + drop
    // BigInt-like fields. Keep the audit-meaningful columns.
    const canonicalised = rows.map((r) => ({
      id: r.id,
      actorId: r.actorId,
      actorName: r.actorName,
      entityRef: r.entityRef,
      action: r.action,
      category: r.category,
      severity: r.severity,
      summary: r.summary,
      diff: r.diff ?? null,
      ip: r.ip,
      userAgent: r.userAgent,
      createdAt: r.createdAt.toISOString(),
    }));
    const dailyHash = sha256(canonical(canonicalised));

    // Find the previous day's row to chain.
    const prevDay = new Date(targetDate);
    prevDay.setUTCDate(prevDay.getUTCDate() - 1);
    const prev = await prisma.auditChecksum.findUnique({
      where: { orgId_date: { orgId, date: prevDay } },
    });
    const prevHash = prev?.chainHash ?? null;
    const chainHash = sha256((prevHash ?? "") + dailyHash);

    await prisma.auditChecksum.upsert({
      where: { orgId_date: { orgId, date: targetDate } },
      create: {
        orgId,
        date: targetDate,
        rowCount: _count._all,
        dailyHash,
        chainHash,
        prevHash,
      },
      update: {
        // Re-running for the same day overwrites — but the values
        // should be identical if no tampering occurred. If they differ,
        // that's the alarm to investigate.
        rowCount: _count._all,
        dailyHash,
        chainHash,
        prevHash,
      },
    });

    results.push({
      orgId,
      rowCount: _count._all,
      chainHash,
      prevHash,
      date: targetDate.toISOString().slice(0, 10),
    });
  }

  return NextResponse.json({
    ok: true,
    runAt: new Date().toISOString(),
    date: targetDate.toISOString().slice(0, 10),
    orgsProcessed: results.length,
    results,
  });
}
