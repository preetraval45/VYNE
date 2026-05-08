import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";

// Huddle token mint (UI_UPGRADE_PLAN.md 6.1).
//
// Issues a LiveKit access token so the client can join a per-channel
// audio/video room. Without `LIVEKIT_API_KEY` + `LIVEKIT_API_SECRET`
// + `LIVEKIT_URL` set, the route returns 503 with the env vars needed
// — the HuddleDock UI renders a "configure these to enable" panel
// instead of failing silently.
//
// Room id convention: `huddle-${channelId}` so two users in the same
// channel meet in the same room without coordination.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TokenRequest {
  channelId: string;
  channelName?: string;
  identity: string;
  displayName?: string;
}

interface ConfigStatus {
  ok: boolean;
  missing: string[];
  url: string | null;
}

function checkConfig(): ConfigStatus {
  const missing: string[] = [];
  if (!process.env.LIVEKIT_API_KEY) missing.push("LIVEKIT_API_KEY");
  if (!process.env.LIVEKIT_API_SECRET) missing.push("LIVEKIT_API_SECRET");
  const url = process.env.LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL ?? null;
  if (!url) missing.push("LIVEKIT_URL");
  return { ok: missing.length === 0, missing, url };
}

export async function GET() {
  return NextResponse.json(checkConfig());
}

export async function POST(req: Request) {
  const rl = await rateLimit({
    key: "huddle-token",
    limit: 60,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  const cfg = checkConfig();
  if (!cfg.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "huddles not configured",
        missing: cfg.missing,
        hint: "Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL (e.g. wss://your-project.livekit.cloud) in Vercel project settings.",
      },
      { status: 503 },
    );
  }

  let body: TokenRequest;
  try {
    body = (await req.json()) as TokenRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.channelId || !body.identity) {
    return NextResponse.json(
      { error: "channelId + identity required" },
      { status: 400 },
    );
  }

  try {
    const { AccessToken } = await import("livekit-server-sdk");
    const room = `huddle-${body.channelId}`;
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
      {
        identity: body.identity,
        name: body.displayName ?? body.identity,
        ttl: "2h",
      },
    );
    at.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    const token = await at.toJwt();
    return NextResponse.json({
      ok: true,
      token,
      url: cfg.url,
      room,
      channelName: body.channelName ?? body.channelId,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "token mint failed",
      },
      { status: 502 },
    );
  }
}
