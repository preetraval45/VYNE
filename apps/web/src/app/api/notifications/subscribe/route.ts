import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/api/security";
import { resolveSession } from "@/lib/auth/role";

/**
 * POST /api/notifications/subscribe (UI_UPGRADE_PLAN.md 8.5)
 * Body: a PushSubscriptionJSON ({ endpoint, keys: { p256dh, auth } }).
 *
 * Persists to the `PushSubscription` Prisma table keyed by endpoint
 * (unique constraint), upserts so resubscribing the same browser
 * doesn't create dupes. Ties the row to the caller's user id when a
 * session cookie is present so server-side fan-out can target a
 * specific user.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SubBody {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit({
    key: "push-subscribe",
    limit: 30,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  try {
    const body = (await req.json()) as SubBody;
    if (!body.endpoint) {
      return NextResponse.json(
        { ok: false, error: "missing endpoint" },
        { status: 400 },
      );
    }
    const session = await resolveSession(req).catch(() => null);
    const userAgent = req.headers.get("user-agent") ?? "";

    await prisma.pushSubscription.upsert({
      where: { endpoint: body.endpoint },
      create: {
        endpoint: body.endpoint,
        p256dh: body.keys?.p256dh ?? "",
        auth: body.keys?.auth ?? "",
        userId: session?.uid ?? null,
        userAgent,
      },
      update: {
        p256dh: body.keys?.p256dh ?? "",
        auth: body.keys?.auth ?? "",
        userId: session?.uid ?? null,
        userAgent,
      },
    });

    const count = await prisma.pushSubscription.count();
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "bad request" },
      { status: 400 },
    );
  }
}

export async function GET() {
  try {
    const count = await prisma.pushSubscription.count();
    return NextResponse.json({ ok: true, count });
  } catch {
    return NextResponse.json({ ok: true, count: 0 });
  }
}
