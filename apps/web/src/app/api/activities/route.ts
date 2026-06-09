import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/api/security";
import { publish } from "@/lib/pusher";
import { requireTenant } from "@/lib/auth/tenantGuard";

// ─── /api/activities ───────────────────────────────────────────────
//
// Append-only per-record activity feed backed by Postgres (Neon). Logged
// interactions (call/email/meeting/note) + system audit entries. The activity
// store mirrors writes here and hydrates from it, so history survives across
// devices / reloads / cleared localStorage. Tenant-scoped on `orgId`.

export const dynamic = "force-dynamic";

interface ActivityInput {
  id?: string;
  recordType: string;
  recordId: string;
  kind?: string;
  verb?: string;
  summary?: string;
  body?: string;
  field?: string;
  from?: string;
  to?: string;
  actor?: string;
  createdAt?: string;
}

function shape(a: {
  id: string;
  recordType: string;
  recordId: string;
  kind: string;
  verb: string;
  summary: string;
  body: string;
  field: string;
  fromVal: string;
  toVal: string;
  actor: string;
  createdAt: Date;
}) {
  return {
    id: a.id,
    recordType: a.recordType,
    recordId: a.recordId,
    kind: a.kind,
    verb: a.verb,
    summary: a.summary,
    body: a.body || undefined,
    field: a.field || undefined,
    from: a.fromVal || undefined,
    to: a.toVal || undefined,
    actor: a.actor,
    createdAt: a.createdAt.toISOString(),
  };
}

export async function GET(req: Request) {
  const ctx = await requireTenant(req);
  if (ctx instanceof Response) return ctx;

  const rl = await rateLimit({
    key: "activities-list",
    limit: 120,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  // Optional ?recordType=&recordId= to fetch one record's feed; otherwise the
  // recent org-wide feed (capped).
  const url = new URL(req.url);
  const recordType = url.searchParams.get("recordType") ?? undefined;
  const recordId = url.searchParams.get("recordId") ?? undefined;

  try {
    const rows = await prisma.activity.findMany({
      where: {
        orgId: ctx.orgId,
        ...(recordType ? { recordType } : {}),
        ...(recordId ? { recordId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 400,
    });
    return NextResponse.json({ activities: rows.map(shape) });
  } catch (err) {
    return NextResponse.json(
      {
        activities: [],
        error: err instanceof Error ? err.message : "DB error",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const ctx = await requireTenant(req);
  if (ctx instanceof Response) return ctx;

  const rl = await rateLimit({
    key: "activities-create",
    limit: 60,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  let body: ActivityInput;
  try {
    body = (await req.json()) as ActivityInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.recordType || !body.recordId) {
    return NextResponse.json(
      { error: "recordType and recordId required" },
      { status: 400 },
    );
  }

  try {
    const row = await prisma.activity.create({
      data: {
        id: body.id,
        orgId: ctx.orgId,
        recordType: body.recordType,
        recordId: body.recordId,
        kind: body.kind ?? "change",
        verb: body.verb ?? "logged",
        summary: body.summary ?? "",
        body: body.body ?? "",
        field: body.field ?? "",
        fromVal: body.from ?? "",
        toVal: body.to ?? "",
        actor: body.actor ?? "You",
        createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      },
    });
    const shaped = shape(row);
    // Fan out to other tabs / devices in this org (fire-and-forget).
    void publish(`org-${row.orgId}`, "activity:created", shaped);
    return NextResponse.json({ activity: shaped });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "DB error" },
      { status: 500 },
    );
  }
}
