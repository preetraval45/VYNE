import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";
import { verifyInvite, getInviteSecret } from "@/lib/externalInvite";

// External channel accept (UI_UPGRADE_PLAN.md 6.7).
//
// Recipient flow: the /channels/accept page POSTs the invite token
// here with the recipient's userId. We verify the signature, then
// record the share — today as a stub that returns the channel ref so
// the client can persist it locally; later as a row in a `shared_channels`
// Postgres table linking both workspaces.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AcceptRequest {
  token: string;
  recipientUserId?: string;
  recipientWorkspace?: string;
}

export async function POST(req: Request) {
  const rl = await rateLimit({
    key: "channel-accept",
    limit: 30,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  const secret = getInviteSecret();
  if (!secret) {
    return NextResponse.json(
      {
        ok: false,
        error: "External channel invites not configured",
        missing: ["EXTERNAL_INVITE_SIGNING_SECRET"],
      },
      { status: 503 },
    );
  }

  let body: AcceptRequest;
  try {
    body = (await req.json()) as AcceptRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }
  const payload = verifyInvite(body.token, secret);
  if (!payload) {
    return NextResponse.json(
      { ok: false, error: "Invalid or expired token" },
      { status: 401 },
    );
  }

  // TODO when shared_channels table lands: persist (channelId,
  // fromWorkspace, recipientWorkspace, recipientUserId, role, exp).
  // Today we just return the resolved claim so the client can mirror
  // into local state + open the channel.
  return NextResponse.json({
    ok: true,
    channel: {
      id: payload.channelId,
      name: payload.channelName,
      fromWorkspace: payload.fromWorkspace,
      role: payload.role,
    },
    recipient: {
      userId: body.recipientUserId ?? null,
      workspace: body.recipientWorkspace ?? null,
    },
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  });
}
