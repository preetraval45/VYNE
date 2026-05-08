import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";
import {
  getInviteSecret,
  signInvite,
  verifyInvite,
  base64url,
  type InvitePayload,
} from "@/lib/externalInvite";

// External channel invite token (UI_UPGRADE_PLAN.md 6.7).
//
// Issues a signed link that lets a teammate from another VYNE workspace
// join a shared channel. Reuses the same HMAC pattern as Phase 21.8
// embed tokens.
//
// POST modes:
//   - { channelId, channelName, role?, expiresInHours?, fromWorkspace } → issue
//   - { mode: "verify", token } → validate without consuming
//
// Without `EXTERNAL_INVITE_SIGNING_SECRET` (or `EMBED_SIGNING_SECRET`
// as a fallback) set, the route returns 503 with the env var name so
// the UI can render a "configure this to enable" panel.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface IssueRequest {
  channelId: string;
  channelName: string;
  fromWorkspace?: string;
  role?: "viewer" | "member";
  expiresInHours?: number;
}

interface VerifyRequest {
  mode: "verify";
  token: string;
}

export async function POST(req: Request) {
  const rl = await rateLimit({
    key: "channel-invite",
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
        hint: "Set EXTERNAL_INVITE_SIGNING_SECRET (or EMBED_SIGNING_SECRET) in Vercel project settings.",
      },
      { status: 503 },
    );
  }

  let body: IssueRequest | VerifyRequest;
  try {
    body = (await req.json()) as IssueRequest | VerifyRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Verify-mode: confirm a token is valid + return its claims.
  if ("mode" in body && body.mode === "verify") {
    const payload = verifyInvite(body.token, secret);
    if (!payload) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired token" },
        { status: 401 },
      );
    }
    return NextResponse.json({ ok: true, payload });
  }

  // Issue-mode: sign a new invite.
  const issue = body as IssueRequest;
  if (!issue.channelId || !issue.channelName) {
    return NextResponse.json(
      { error: "channelId + channelName required" },
      { status: 400 },
    );
  }
  const ttl = Math.max(
    1,
    Math.min(720, issue.expiresInHours ?? 168),
  ); // default 7d, max 30d
  const now = Math.floor(Date.now() / 1000);
  const payload: InvitePayload = {
    channelId: issue.channelId,
    channelName: issue.channelName,
    fromWorkspace: issue.fromWorkspace ?? "demo",
    role: issue.role ?? "member",
    iat: now,
    exp: now + ttl * 3600,
    jti: base64url(
      Buffer.from(crypto.getRandomValues(new Uint8Array(12))),
    ),
  };
  const token = signInvite(payload, secret);
  const origin = new URL(req.url).origin;
  const inviteUrl = `${origin}/channels/accept?token=${token}`;
  return NextResponse.json({
    ok: true,
    token,
    inviteUrl,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    payload,
  });
}
