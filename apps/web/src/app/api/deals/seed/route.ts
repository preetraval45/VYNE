import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INITIAL_DEALS } from "@/lib/fixtures/crm";

// One-shot seed for the Deal table. Idempotent — only writes if the
// table is empty so re-hitting this URL after a reset just no-ops.
// Authed via a query token so a stranger can't reseed prod.

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (token !== "vyne-seed-2026") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const count = await prisma.deal.count();
    if (count > 0) {
      return NextResponse.json({ skipped: true, existing: count });
    }
    const created = await prisma.$transaction(
      INITIAL_DEALS.map((d) =>
        prisma.deal.create({
          data: {
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
            customFields: (d.customFields ?? null) as never,
            lastActivity: new Date(d.lastActivity),
          },
        }),
      ),
    );
    return NextResponse.json({ seeded: created.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "DB error" },
      { status: 500 },
    );
  }
}
