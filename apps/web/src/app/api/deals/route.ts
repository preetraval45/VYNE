import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/api/security";
import { publish } from "@/lib/pusher";

// ─── /api/deals ────────────────────────────────────────────────────
//
// CRUD for the CRM Deal entity backed by Postgres (Neon). The CRM
// store mirrors writes here so changes survive across devices /
// reloads / cleared localStorage. List is also used at app boot to
// hydrate the local cache from the canonical source.

export const dynamic = "force-dynamic";

interface DealInput {
  id?: string;
  company: string;
  contactName?: string;
  email?: string;
  stage?: string;
  value?: number;
  probability?: number;
  assignee?: string;
  source?: string;
  nextAction?: string;
  notes?: string;
  customFields?: Record<string, string> | null;
  lastActivity?: string;
}

function shape(d: {
  id: string;
  company: string;
  contactName: string;
  email: string;
  stage: string;
  value: number;
  probability: number;
  assignee: string;
  source: string;
  nextAction: string;
  notes: string;
  customFields: unknown;
  lastActivity: Date;
}) {
  return {
    id: d.id,
    company: d.company,
    contactName: d.contactName,
    email: d.email,
    stage: d.stage,
    value: d.value,
    probability: d.probability,
    assignee: d.assignee,
    source: d.source,
    nextAction: d.nextAction,
    notes: d.notes,
    customFields: (d.customFields ?? undefined) as
      | Record<string, string>
      | undefined,
    lastActivity: d.lastActivity.toISOString(),
  };
}

export async function GET(req: Request) {
  const rl = await rateLimit({ key: "deals-list", limit: 60, windowSec: 60, req });
  if (!rl.ok) return rl.response!;

  try {
    const rows = await prisma.deal.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ deals: rows.map(shape) });
  } catch (err) {
    return NextResponse.json(
      { deals: [], error: err instanceof Error ? err.message : "DB error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const rl = await rateLimit({ key: "deals-create", limit: 30, windowSec: 60, req });
  if (!rl.ok) return rl.response!;

  let body: DealInput;
  try {
    body = (await req.json()) as DealInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.company || typeof body.company !== "string") {
    return NextResponse.json({ error: "company required" }, { status: 400 });
  }

  try {
    const deal = await prisma.deal.create({
      data: {
        id: body.id,
        company: body.company,
        contactName: body.contactName ?? "",
        email: body.email ?? "",
        stage: body.stage ?? "Lead",
        value: body.value ?? 0,
        probability: body.probability ?? 0,
        assignee: body.assignee ?? "Alex",
        source: body.source ?? "inbound",
        nextAction: body.nextAction ?? "",
        notes: body.notes ?? "",
        customFields: (body.customFields ?? null) as never,
        lastActivity: body.lastActivity ? new Date(body.lastActivity) : new Date(),
      },
    });
    const shaped = shape(deal);
    // Fan out to other tabs / devices in this org. Fire-and-forget so
    // a Pusher hiccup doesn't break the persist path.
    void publish(`org-${deal.orgId}`, "deal:created", shaped);
    return NextResponse.json({ deal: shaped });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "DB error" },
      { status: 500 },
    );
  }
}
