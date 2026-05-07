import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/notifications/subscribe
 * Body: a PushSubscriptionJSON ({ endpoint, keys: { p256dh, auth } }).
 *
 * Stores the subscription in an in-memory map keyed by endpoint. A
 * production deployment replaces this with a DB write (and ties the
 * subscription to the caller's user id via a session cookie).
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

function store(): Map<string, StoredSub> {
  if (!globalThis.__vynePushSubs) globalThis.__vynePushSubs = new Map();
  return globalThis.__vynePushSubs;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    if (!body.endpoint) {
      return NextResponse.json(
        { ok: false, error: "missing endpoint" },
        { status: 400 },
      );
    }
    const map = store();
    map.set(body.endpoint, {
      endpoint: body.endpoint,
      keys: body.keys,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, count: map.size });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "bad request" },
      { status: 400 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, count: store().size });
}
