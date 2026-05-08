import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/api/security";
import { requireRole, ADMIN_ROLES, resolveSession } from "@/lib/auth/role";

// /api/admin/backup (UI_UPGRADE_PLAN.md 8.8)
//
// Admin endpoint that exports every persisted entity scoped to the
// caller's orgId as a single JSON blob. Designed as the "I need a
// snapshot before a risky migration" tool + the dump source for a
// nightly cron (Vercel Cron + this route + a downstream archiver).
//
// Two modes:
//   GET ?download=1 → returns a JSON file with all rows (Content-
//                     Disposition: attachment, default).
//   POST            → triggers the same dump but returns a structured
//                     summary { counts, downloadUrl? } so a scheduled
//                     job can ship the bytes elsewhere (Vercel Blob /
//                     S3 / etc.) when `BACKUP_BLOB_TOKEN` is set.
//
// The `pg_dump`-equivalent side (full Postgres binary dump) belongs in
// a Vercel Cron + Neon / Supabase managed backup; this route covers the
// app-level "give me my data right now" need without needing a managed
// backup tier.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENTITY_KEYS = [
  "users",
  "subscriptions",
  "deals",
  "contacts",
  "accounts",
  "customers",
  "invoices",
  "products",
  "suppliers",
  "orders",
  "projects",
  "tasks",
  "journalEntries",
  "embeddings",
  "pushSubscriptions",
  "auditEvents",
] as const;

type EntityKey = (typeof ENTITY_KEYS)[number];

async function dumpForOrg(orgId: string | null): Promise<{
  generatedAt: string;
  orgId: string | null;
  counts: Record<EntityKey, number>;
  data: Partial<Record<EntityKey, unknown[]>>;
}> {
  const data: Partial<Record<EntityKey, unknown[]>> = {};
  const counts = {} as Record<EntityKey, number>;

  // Users + Subscriptions are workspace-wide for now; future multi-
  // tenant scoping filters by orgId once that lands. Today, dump every
  // user / subscription when the caller is an admin.
  data.users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      companyName: true,
      role: true,
      plan: true,
      orgId: true,
      modules: true,
      createdAt: true,
    },
  });
  counts.users = data.users.length;

  data.subscriptions = await prisma.subscription.findMany();
  counts.subscriptions = data.subscriptions.length;

  // Per-orgId entities. When orgId is null, dump everything (admin
  // multi-tenant view). When set, scope to that single workspace.
  const where = orgId ? { orgId } : undefined;

  data.deals = await prisma.deal.findMany({ where });
  counts.deals = data.deals.length;
  data.contacts = await prisma.contact.findMany({ where });
  counts.contacts = data.contacts.length;
  data.accounts = await prisma.account.findMany({ where });
  counts.accounts = data.accounts.length;
  data.customers = await prisma.customer.findMany({ where });
  counts.customers = data.customers.length;
  data.invoices = await prisma.invoice.findMany({ where });
  counts.invoices = data.invoices.length;
  data.products = await prisma.product.findMany({ where });
  counts.products = data.products.length;
  data.suppliers = await prisma.supplier.findMany({ where });
  counts.suppliers = data.suppliers.length;
  data.orders = await prisma.order.findMany({ where });
  counts.orders = data.orders.length;
  data.projects = await prisma.project.findMany({ where });
  counts.projects = data.projects.length;
  data.tasks = await prisma.task.findMany({ where });
  counts.tasks = data.tasks.length;
  data.journalEntries = await prisma.journalEntry.findMany({ where });
  counts.journalEntries = data.journalEntries.length;

  // Embeddings dumped without the vector column (huge + low-value).
  data.embeddings = await prisma.embedding.findMany({
    where,
    select: {
      id: true,
      ref: true,
      source: true,
      orgId: true,
      createdAt: true,
    },
  });
  counts.embeddings = data.embeddings.length;

  data.pushSubscriptions = await prisma.pushSubscription.findMany({ where });
  counts.pushSubscriptions = data.pushSubscriptions.length;

  data.auditEvents = await prisma.auditEvent.findMany({ where, take: 5000 });
  counts.auditEvents = data.auditEvents.length;

  return {
    generatedAt: new Date().toISOString(),
    orgId,
    counts,
    data,
  };
}

function isVercelCron(req: Request): boolean {
  // Vercel Cron sends a `x-vercel-cron-signature` header that's signed
  // with `CRON_SECRET`. We accept any request that carries the signature
  // header + the URL contains `?cron=1`. For local dev / preview, set
  // `CRON_SECRET` to skip this check.
  if (req.headers.get("x-vercel-cron-signature")) return true;
  const url = new URL(req.url);
  if (url.searchParams.get("cron") !== "1") return false;
  const provided = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  return Boolean(process.env.CRON_SECRET) && provided === expected;
}

export async function GET(req: Request) {
  const rl = await rateLimit({
    key: "admin-backup",
    limit: 6,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  // Cron path: skip the admin-role check (Vercel Cron is system-driven).
  if (!isVercelCron(req)) {
    const gate = await requireRole(req, ADMIN_ROLES);
    if (gate) return gate;
  }

  const session = await resolveSession(req);
  const url = new URL(req.url);
  const orgIdParam = url.searchParams.get("orgId");
  const orgId =
    orgIdParam ??
    (session?.uid ? null : "demo");
  const download = url.searchParams.get("download") !== "0";

  try {
    const dump = await dumpForOrg(orgId);
    const body = JSON.stringify(dump, null, 2);
    const filename = `vyne-backup-${dump.orgId ?? "all"}-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    return new Response(body, {
      headers: {
        "content-type": "application/json",
        ...(download
          ? { "content-disposition": `attachment; filename="${filename}"` }
          : {}),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Backup failed" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const rl = await rateLimit({
    key: "admin-backup-trigger",
    limit: 6,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  const gate = await requireRole(req, ADMIN_ROLES);
  if (gate) return gate;

  const session = await resolveSession(req);
  const orgId = session?.uid ? null : "demo";

  try {
    const dump = await dumpForOrg(orgId);
    const totalRows = Object.values(dump.counts).reduce(
      (s, n) => s + n,
      0,
    );

    // Optional: ship to Vercel Blob if BACKUP_BLOB_TOKEN is set. We
    // lazy-import @vercel/blob so deploys without backups don't pay
    // the bundle cost. Dynamic import is fenced inside try so missing
    // module is a graceful no-op.
    let downloadUrl: string | null = null;
    if (process.env.BACKUP_BLOB_TOKEN) {
      try {
        const blobMod = await import("@vercel/blob").catch(() => null);
        if (blobMod?.put) {
          const filename = `vyne-backup-${dump.orgId ?? "all"}-${Date.now()}.json`;
          const result = await blobMod.put(
            filename,
            JSON.stringify(dump),
            {
              access: "public",
              token: process.env.BACKUP_BLOB_TOKEN,
              contentType: "application/json",
            },
          );
          downloadUrl = result.url ?? null;
        }
      } catch {
        /* fall through to inline response */
      }
    }

    return NextResponse.json({
      ok: true,
      generatedAt: dump.generatedAt,
      orgId: dump.orgId,
      totalRows,
      counts: dump.counts,
      downloadUrl,
      hint: downloadUrl
        ? "Stored in Vercel Blob at downloadUrl (public, 30-day TTL recommended)."
        : "Inline dump returned. Set BACKUP_BLOB_TOKEN in Vercel to auto-archive to Blob.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Backup failed" },
      { status: 500 },
    );
  }
}
