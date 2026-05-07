import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/notifications/unsubscribe
 * Body: { endpoint }
 * Drops the subscription stored by /api/notifications/subscribe.
 */

interface StoredSub {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
  createdAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __vynePushSubs: Map<string, StoredSub> | undefined;
}

export async function POST(req: NextRequest) {
  try {
    const { endpoint } = (await req.json()) as { endpoint?: string };
    if (!endpoint) {
      return NextResponse.json(
        { ok: false, error: "missing endpoint" },
        { status: 400 },
      );
    }
    const removed = globalThis.__vynePushSubs?.delete(endpoint) ?? false;
    return NextResponse.json({ ok: true, removed });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "bad request" },
      { status: 400 },
    );
  }
}
