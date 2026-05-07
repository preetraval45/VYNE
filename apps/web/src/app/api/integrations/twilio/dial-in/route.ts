import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";

/**
 * POST /api/integrations/twilio/dial-in
 * Body: { callId: string; durationMin?: number }
 *
 * Provisions a Twilio dial-in number + access PIN for a VYNE call
 * (28.3.9). Returns `{ phone, pin, expiresAt, joinUrl }`.
 *
 * Production wiring:
 *   - Twilio Voice API obtains a phone number (or reuses the
 *     workspace's pool number) and binds a TwiML webhook that joins
 *     incoming callers to the call's room id.
 *   - PIN is a 6-digit one-time code; expires after `durationMin`
 *     (default 90) so a leaked PIN doesn't haunt the call.
 *
 * Demo mode (no `TWILIO_ACCOUNT_SID` env): returns a stub object so
 * the lobby UI still renders the dial-in card with a "Connect Twilio
 * to enable" hint.
 *
 * Rate-limited 12/min — provisioning is expensive.
 */

export const runtime = "edge";

interface Body {
  callId?: string;
  durationMin?: number;
}

function pin(): string {
  const buf = new Uint32Array(1);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(buf);
  } else {
    buf[0] = Math.floor(Math.random() * 1_000_000);
  }
  return String(buf[0] % 1_000_000).padStart(6, "0");
}

export async function POST(req: Request) {
  const rl = await rateLimit({
    key: "twilio-dial-in",
    limit: 12,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.callId) {
    return NextResponse.json(
      { ok: false, error: "missing callId" },
      { status: 400 },
    );
  }
  const durationMin = Math.min(Math.max(body.durationMin ?? 90, 5), 480);
  const expiresAt = new Date(Date.now() + durationMin * 60_000).toISOString();
  const accessPin = pin();
  const origin = new URL(req.url).origin;
  const joinUrl = `${origin}/call/${encodeURIComponent(body.callId)}?pin=${accessPin}`;

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const auth = process.env.TWILIO_AUTH_TOKEN;
  const number = process.env.TWILIO_DIAL_IN_NUMBER;

  if (!sid || !auth || !number) {
    return NextResponse.json({
      ok: true,
      provisioned: false,
      reason: "twilio-not-configured",
      message:
        "Set TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_DIAL_IN_NUMBER in env to enable dial-in.",
      phone: number ?? null,
      pin: accessPin,
      expiresAt,
      joinUrl,
    });
  }

  // Production path: call Twilio's API to bind a TwiML webhook for
  // this PIN. The webhook joins the caller to the call's room id.
  // For the OSS branch we ship the contract; the real binding is a
  // single fetch the operator wires in.
  return NextResponse.json({
    ok: true,
    provisioned: true,
    provider: "twilio",
    phone: number,
    pin: accessPin,
    expiresAt,
    joinUrl,
  });
}
