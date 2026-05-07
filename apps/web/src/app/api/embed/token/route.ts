import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";

/**
 * POST /api/embed/token
 * Issue a signed JWT-shaped token that an external page can use to
 * embed a VYNE widget (chart / form / pipeline) via iframe without
 * forcing the viewer to log in to VYNE.
 *
 * Body: { widgetId: string; expiresInSec?: number; scope?: string[] }
 *
 * Token shape (compact JWS):
 *   header  = { alg: "HS256", typ: "JWT" }
 *   payload = { widgetId, scope, iat, exp }
 *   signature = HMAC-SHA-256(header.payload, EMBED_SIGNING_SECRET)
 *
 * The receiving widget page (`/embed/[widgetId]`) verifies the
 * signature on every render so a leaked URL with an expired exp
 * stops working automatically.
 *
 * GET  /api/embed/token?widgetId=…  → returns the embed URL for a
 *  given widget id without the token (useful for the marketplace UI).
 */

export const runtime = "edge";

interface Body {
  widgetId?: string;
  expiresInSec?: number;
  scope?: string[];
}

function base64UrlEncode(input: string | Uint8Array): string {
  const str =
    typeof input === "string"
      ? btoa(input)
      : btoa(String.fromCharCode(...input));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  secret: string,
): Promise<string> {
  const enc = new TextEncoder();
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return `${data}.${base64UrlEncode(new Uint8Array(sig))}`;
}

export async function POST(req: Request) {
  const rl = await rateLimit({
    key: "embed-token",
    limit: 30,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.widgetId) {
    return NextResponse.json(
      { ok: false, error: "missing widgetId" },
      { status: 400 },
    );
  }
  const secret = process.env.EMBED_SIGNING_SECRET;
  if (!secret) {
    return NextResponse.json(
      {
        ok: false,
        error: "EMBED_SIGNING_SECRET not configured",
        message:
          "Set EMBED_SIGNING_SECRET in env vars to enable signed embed tokens.",
      },
      { status: 503 },
    );
  }
  const exp = Math.floor(Date.now() / 1000) + (body.expiresInSec ?? 3600);
  const token = await sign(
    { alg: "HS256", typ: "JWT" },
    {
      widgetId: body.widgetId,
      scope: body.scope ?? ["read"],
      iat: Math.floor(Date.now() / 1000),
      exp,
    },
    secret,
  );
  const origin = new URL(req.url).origin;
  const embedUrl = `${origin}/embed/${encodeURIComponent(body.widgetId)}?token=${token}`;
  return NextResponse.json({
    ok: true,
    token,
    embedUrl,
    expiresAt: new Date(exp * 1000).toISOString(),
    iframeSnippet: `<iframe src="${embedUrl}" width="640" height="400" frameborder="0" allow="clipboard-write" loading="lazy"></iframe>`,
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const widgetId = url.searchParams.get("widgetId");
  if (!widgetId) {
    return NextResponse.json(
      { ok: false, error: "missing widgetId" },
      { status: 400 },
    );
  }
  const origin = url.origin;
  return NextResponse.json({
    ok: true,
    embedUrl: `${origin}/embed/${encodeURIComponent(widgetId)}`,
    note: "Append ?token=… for authenticated access.",
  });
}
