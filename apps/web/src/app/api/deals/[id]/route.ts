import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/api/security";
import { publish } from "@/lib/pusher";

// PATCH + DELETE for a single deal by id.
export const dynamic = "force-dynamic";

interface DealPatch {
  company?: string;
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const rl = await rateLimit({ key: "deals-patch", limit: 60, windowSec: 60, req });
  if (!rl.ok) return rl.response!;

  let body: DealPatch;
  try {
    body = (await req.json()) as DealPatch;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (v === undefined) continue;
      if (k === "lastActivity" && typeof v === "string") {
        data[k] = new Date(v);
      } else {
        data[k] = v;
      }
    }
    const deal = await prisma.deal.update({
      where: { id },
      data: data as never,
    });
    const shaped = {
      id: deal.id,
      company: deal.company,
      contactName: deal.contactName,
      email: deal.email,
      stage: deal.stage,
      value: deal.value,
      probability: deal.probability,
      assignee: deal.assignee,
      source: deal.source,
      nextAction: deal.nextAction,
      notes: deal.notes,
      customFields: (deal.customFields ?? undefined) as
        | Record<string, string>
        | undefined,
      lastActivity: deal.lastActivity.toISOString(),
    };
    void publish(`org-${deal.orgId}`, "deal:updated", shaped);
    return NextResponse.json({ deal: shaped });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "DB error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const rl = await rateLimit({ key: "deals-delete", limit: 60, windowSec: 60, req });
  if (!rl.ok) return rl.response!;

  try {
    const existing = await prisma.deal.findUnique({ where: { id }, select: { orgId: true } });
    await prisma.deal.delete({ where: { id } });
    if (existing) {
      void publish(`org-${existing.orgId}`, "deal:deleted", { id });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "DB error" },
      { status: 500 },
    );
  }
}
