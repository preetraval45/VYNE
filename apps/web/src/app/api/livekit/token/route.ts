import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface TokenRequest {
  room: string;
  identity: string;
  name?: string;
  /** "publisher" | "subscriber" | "both" (default both) */
  role?: string;
}

interface TokenResponse {
  url: string;
  token: string;
  identity: string;
  room: string;
}

/**
 * Mints a LiveKit access token signed with HS256 — same algorithm the
 * livekit-server-sdk uses internally. Implementing it directly here so
 * we don't add 100KB of server SDK deps for a single endpoint, and so
 * this works on Vercel Edge runtime where node-only SDKs can't run.
 *
 * Required env (set in Vercel project settings to enable real calls):
 *   LIVEKIT_API_KEY
 *   LIVEKIT_API_SECRET
 *   NEXT_PUBLIC_LIVEKIT_URL  (wss://your-project.livekit.cloud)
 *
 * Without these the route returns 503 and the call store falls back to
 * its simulated-participants demo mode, so nothing breaks for users
 * without a LiveKit subscription.
 */
export async function POST(req: Request) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const lkUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!apiKey || !apiSecret || !lkUrl) {
    return NextResponse.json(
      {
        error:
          "LiveKit not configured. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, NEXT_PUBLIC_LIVEKIT_URL in Vercel env to enable real video calls. The app currently runs in simulated-participant demo mode.",
      },
      { status: 503 },
    );
  }

  let payload: TokenRequest;
  try {
    payload = (await req.json()) as TokenRequest;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const room = payload.room?.trim();
  const identity = payload.identity?.trim();
  if (!room || !identity) {
    return NextResponse.json(
      { error: "room and identity are required" },
      { status: 400 },
    );
  }
  const role = payload.role ?? "both";
  const canPublish = role === "publisher" || role === "both";
  const canSubscribe = role === "subscriber" || role === "both";

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 60 * 6; // 6h
  const payloadObj = {
    iss: apiKey,
    sub: identity,
    iat: now,
    nbf: now,
    exp,
    name: payload.name ?? identity,
    video: {
      room,
      roomJoin: true,
      canPublish,
      canSubscribe,
      canPublishData: true,
    },
  };

  const token = await signJwtHs256(payloadObj, apiSecret);
  return NextResponse.json<TokenResponse>({
    url: lkUrl,
    token,
    identity,
    room,
  });
}

// ── HS256 JWT signing for Edge runtime ──────────────────────────

function base64UrlEncode(input: ArrayBuffer | Uint8Array | string): string {
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : input instanceof ArrayBuffer
        ? new Uint8Array(input)
        : input;
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signJwtHs256(
  payload: Record<string, unknown>,
  secret: string,
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signingInput),
  );
  const sigB64 = base64UrlEncode(sigBuf);
  return `${signingInput}.${sigB64}`;
}
