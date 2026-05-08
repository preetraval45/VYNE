import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/api/security";

/**
 * POST /api/notifications/unsubscribe (UI_UPGRADE_PLAN.md 8.5)
 * Body: { endpoint }
 *
 * Drops the PushSubscription row for the given endpoint.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rl = await rateLimit({
    key: "push-unsubscribe",
    limit: 30,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  try {
    const { endpoint } = (await req.json()) as { endpoint?: string };
    if (!endpoint) {
      return NextResponse.json(
        { ok: false, error: "missing endpoint" },
        { status: 400 },
      );
    }
    const result = await prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });
    return NextResponse.json({ ok: true, removed: result.count });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "bad request" },
      { status: 400 },
    );
  }
}
