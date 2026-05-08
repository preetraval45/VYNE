import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/api/security";
import { resolveSession, requireRole, ADMIN_ROLES } from "@/lib/auth/role";

// /api/audit (UI_UPGRADE_PLAN.md 8.7)
//
// Server-persisted audit trail. POST appends an event scoped to the
// caller's user; GET (admin-only) returns the most recent N events
// with optional filters. Replaces the old localStorage-only audit
// store — the existing client store still buffers events but mirrors
// them here so SOC 2 / HIPAA reviewers see the canonical log.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AuditPostBody {
  entityRef?: string;
  action?: string;
  category?: string;
  summary?: string;
  diff?: unknown;
  severity?: "info" | "warning" | "critical";
}

export async function POST(req: Request) {
  const rl = await rateLimit({
    key: "audit-write",
    limit: 120,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  let body: AuditPostBody;
  try {
    body = (await req.json()) as AuditPostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.action || typeof body.action !== "string") {
    return NextResponse.json(
      { error: "action required" },
      { status: 400 },
    );
  }

  const session = await resolveSession(req).catch(() => null);
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "";
  const userAgent = req.headers.get("user-agent") ?? "";

  try {
    const event = await prisma.auditEvent.create({
      data: {
        actorId: session?.uid ?? "",
        actorName: session?.email ?? "",
        entityRef: (body.entityRef ?? "").slice(0, 200),
        action: body.action.slice(0, 80),
        category: (body.category ?? "data").slice(0, 32),
        summary: (body.summary ?? "").slice(0, 500),
        diff: (body.diff ?? null) as never,
        severity: body.severity ?? "info",
        ip: ip.slice(0, 64),
        userAgent: userAgent.slice(0, 240),
      },
    });
    return NextResponse.json({ ok: true, id: event.id });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "DB error",
      },
      { status: 500 },
    );
  }
}

// GET — admin-only. Filters: entityRef, actorId, category, since (ISO).
export async function GET(req: Request) {
  const gate = await requireRole(req, ADMIN_ROLES);
  if (gate) return gate;

  const url = new URL(req.url);
  const where: Record<string, unknown> = {};
  const entityRef = url.searchParams.get("entityRef");
  const actorId = url.searchParams.get("actorId");
  const category = url.searchParams.get("category");
  const since = url.searchParams.get("since");
  if (entityRef) where.entityRef = entityRef;
  if (actorId) where.actorId = actorId;
  if (category) where.category = category;
  if (since) where.createdAt = { gte: new Date(since) };

  const limit = Math.max(
    1,
    Math.min(500, Number(url.searchParams.get("limit") ?? 100)),
  );

  try {
    const events = await prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return NextResponse.json({ events });
  } catch (err) {
    return NextResponse.json(
      {
        events: [],
        error: err instanceof Error ? err.message : "DB error",
      },
      { status: 500 },
    );
  }
}
