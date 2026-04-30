import { NextResponse } from "next/server";
import { publish, pusherConfigured } from "@/lib/pusher";
import { rateLimit } from "@/lib/api/security";

// Lightweight publish endpoint. Lets the *client* trigger broadcasts
// (e.g. a chat send happened in tab A → server signs + fans out to all
// tabs in the same org via Pusher). For mutations that already go
// through a dedicated REST route (like /api/deals POST), prefer to
// publish from there directly so a single round-trip handles persist
// + broadcast.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PublishBody {
  channel: string;
  event: string;
  data: unknown;
}

export async function POST(req: Request) {
  const rl = await rateLimit({ key: "rt-publish", limit: 120, windowSec: 60, req });
  if (!rl.ok) return rl.response!;

  if (!pusherConfigured()) {
    // Soft-fail: callers expect a JSON response, not a 5xx. They'll
    // remain in optimistic-only mode (writes still hit local stores).
    return NextResponse.json({ ok: false, configured: false });
  }

  let body: PublishBody;
  try {
    body = (await req.json()) as PublishBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.channel || !body.event) {
    return NextResponse.json({ error: "channel + event required" }, { status: 400 });
  }
  // Hard cap on payload size to avoid abuse — Pusher has its own limit
  // (10KB) but we want a friendlier error before that triggers.
  const sz = JSON.stringify(body.data ?? null).length;
  if (sz > 9 * 1024) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }
  // Channel name allowlist — only let clients publish to namespaces we
  // expect. Stops a rogue tab from spamming arbitrary channels.
  const allowed = /^(org|channel|deal|task|project)-[A-Za-z0-9_:.-]+$/.test(body.channel);
  if (!allowed) {
    return NextResponse.json({ error: "channel not allowed" }, { status: 403 });
  }

  const ok = await publish(body.channel, body.event, body.data);
  return NextResponse.json({ ok, configured: true });
}
