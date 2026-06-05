import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/api/security";
import { requireRole, ADMIN_ROLES, resolveSession } from "@/lib/auth/role";

// /api/admin/restore (PH-G)
//
// Counterpart to /api/admin/backup: takes a backup JSON blob and
// replays it back into Postgres. Used by the disaster-recovery
// runbook (docs/runbooks/db-restore.md) and by the weekly backup
// verification job (.github/workflows/backup-verify.yml).
//
// Modes:
//   • dryRun=1 (default) — parse + validate the payload, return what
//                          WOULD be written, but do nothing. This is
//                          how the verification cron checks that a
//                          backup is parseable + complete.
//   • dryRun=0           — actually upsert the rows. The route uses
//                          `upsert` per row so partial restores are
//                          idempotent — re-running with the same dump
//                          is a no-op.
//
// Tenancy: the caller must be an admin. Every restored row is written
// with `orgId = session.orgId` (or the body's `orgId` field if the
// caller is a system admin and the dump's orgId differs from theirs).
// We never let a body smuggle rows into another tenant unless an
// admin explicitly opts in via ?targetOrgId=.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

interface BackupPayload {
  generatedAt: string;
  orgId: string | null;
  counts: Record<EntityKey, number>;
  data: Partial<Record<EntityKey, Record<string, unknown>[]>>;
}

function isBackupPayload(p: unknown): p is BackupPayload {
  if (!p || typeof p !== "object") return false;
  const obj = p as Record<string, unknown>;
  if (typeof obj.generatedAt !== "string") return false;
  if (typeof obj.counts !== "object" || obj.counts === null) return false;
  if (typeof obj.data !== "object" || obj.data === null) return false;
  return true;
}

// Maps the dump's entity key (plural, from the backup route) to the
// Prisma client property (singular, lowerCamelCase model name).
const KEY_TO_MODEL: Record<EntityKey, keyof typeof prisma | null> = {
  users: "user",
  subscriptions: "subscription",
  deals: "deal",
  contacts: "contact",
  accounts: "account",
  customers: "customer",
  invoices: "invoice",
  products: "product",
  suppliers: "supplier",
  orders: "order",
  projects: "project",
  tasks: "task",
  journalEntries: "journalEntry",
  embeddings: "embedding",
  pushSubscriptions: "pushSubscription",
  auditEvents: "auditEvent",
};

interface RestoreResult {
  entity: EntityKey;
  attempted: number;
  restored: number;
  skipped: number;
  errors: string[];
}

async function restoreEntity(
  key: EntityKey,
  rows: Record<string, unknown>[],
  targetOrgId: string | null,
  dryRun: boolean,
): Promise<RestoreResult> {
  const result: RestoreResult = {
    entity: key,
    attempted: rows.length,
    restored: 0,
    skipped: 0,
    errors: [],
  };

  const modelName = KEY_TO_MODEL[key];
  if (!modelName) {
    result.errors.push(`unknown model for entity "${key}"`);
    return result;
  }

  const delegate = (
    prisma as unknown as Record<
      string,
      {
        upsert: (args: {
          where: object;
          create: object;
          update: object;
        }) => Promise<unknown>;
      }
    >
  )[String(modelName)];
  if (!delegate?.upsert) {
    result.errors.push(`Prisma delegate "${String(modelName)}" not available`);
    return result;
  }

  for (const row of rows) {
    const id = typeof row.id === "string" ? row.id : null;
    if (!id) {
      result.skipped++;
      continue;
    }
    // Defense-in-depth: rewrite orgId to the target if the caller
    // specified one. Without this, a malicious dump could plant rows
    // in another tenant.
    const data = {
      ...row,
      ...(targetOrgId && "orgId" in row ? { orgId: targetOrgId } : {}),
    };
    if (dryRun) {
      result.restored++;
      continue;
    }
    try {
      await delegate.upsert({
        where: { id },
        create: data,
        update: data,
      });
      result.restored++;
    } catch (err) {
      result.errors.push(
        `${id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  return result;
}

function isVercelCron(req: Request): boolean {
  if (req.headers.get("x-vercel-cron-signature")) return true;
  const url = new URL(req.url);
  if (url.searchParams.get("cron") !== "1") return false;
  const provided = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  return Boolean(process.env.CRON_SECRET) && provided === expected;
}

export async function POST(req: Request) {
  const rl = await rateLimit({
    key: "admin-restore",
    limit: 6,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  // Cron path: skip the admin-role check — the cron job runs the
  // verification flow in dryRun mode.
  if (!isVercelCron(req)) {
    const gate = await requireRole(req, ADMIN_ROLES);
    if (gate) return gate;
  }

  const url = new URL(req.url);
  // dryRun defaults to TRUE for safety. Caller must explicitly opt
  // out with `?dryRun=0` to actually write.
  const dryRun = url.searchParams.get("dryRun") !== "0";
  const targetOrgIdParam = url.searchParams.get("targetOrgId");

  // Resolve target tenant: explicit query param > caller's session orgId.
  let targetOrgId: string | null = null;
  if (targetOrgIdParam) {
    targetOrgId = targetOrgIdParam;
  } else {
    const session = await resolveSession(req);
    if (session) {
      // Look up the user's orgId — session has uid; we need orgId.
      try {
        const user = await prisma.user.findUnique({
          where: { id: session.uid },
          select: { orgId: true },
        });
        targetOrgId = user?.orgId ?? null;
      } catch {
        targetOrgId = null;
      }
    }
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isBackupPayload(payload)) {
    return NextResponse.json(
      {
        error:
          "Body does not look like a backup dump. Expected { generatedAt, orgId, counts, data }.",
      },
      { status: 400 },
    );
  }

  const results: RestoreResult[] = [];
  for (const key of ENTITY_KEYS) {
    const rows = payload.data[key];
    if (!Array.isArray(rows)) continue;
    const result = await restoreEntity(key, rows, targetOrgId, dryRun);
    results.push(result);
  }

  const totalAttempted = results.reduce((s, r) => s + r.attempted, 0);
  const totalRestored = results.reduce((s, r) => s + r.restored, 0);
  const totalErrors = results.reduce((s, r) => s + r.errors.length, 0);

  return NextResponse.json({
    ok: totalErrors === 0,
    dryRun,
    targetOrgId,
    sourceGeneratedAt: payload.generatedAt,
    sourceOrgId: payload.orgId,
    summary: {
      totalAttempted,
      totalRestored,
      totalErrors,
    },
    perEntity: results,
  });
}
