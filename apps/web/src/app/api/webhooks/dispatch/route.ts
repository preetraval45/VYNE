import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";

/**
 * POST /api/webhooks/dispatch
 * Body: { url: string; secret?: string; eventKey: string; payload: unknown; attempt?: number }
 *
 * Server-side dispatcher for the client-side webhooks store. Signs
 * the payload with HMAC-SHA-256 (when a secret is provided), POSTs
 * to the target URL, and returns timing + status so the client can
 * record a delivery row.
 *
 * Retry / dead-letter logic stays in the client store so users can
 * see + intervene; this endpoint is the one-shot transport.
 */

export const runtime = "edge";

interface Body {
  url?: string;
  secret?: string;
  eventKey?: string;
  payload?: unknown;
  attempt?: number;
}

function hexEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

async function sign(secret: string, body: string, ts: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${ts}.${body}`));
  return `t=${ts},v1=${hexEncode(sig)}`;
}

export async function POST(req: Request) {
  const rl = await rateLimit({
    key: "webhook-dispatch",
    limit: 60,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.url) {
    return NextResponse.json(
      { ok: false, error: "missing url" },
      { status: 400 },
    );
  }
  if (!body.eventKey) {
    return NextResponse.json(
      { ok: false, error: "missing eventKey" },
      { status: 400 },
    );
  }

  const t0 = Date.now();
  const ts = String(Math.floor(t0 / 1000));
  const payloadStr = JSON.stringify({
    event: body.eventKey,
    payload: body.payload ?? null,
    deliveredAt: new Date().toISOString(),
    attempt: body.attempt ?? 1,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "VYNE-Webhooks/1.0",
    "X-VYNE-Event": body.eventKey,
    "X-VYNE-Timestamp": ts,
    "X-VYNE-Attempt": String(body.attempt ?? 1),
  };

  if (body.secret) {
    try {
      headers["X-VYNE-Signature"] = await sign(body.secret, payloadStr, ts);
    } catch {
      // crypto unavailable in this runtime — skip signing.
    }
  }

  try {
    // 8 s timeout so a dead endpoint can't hang the dispatcher.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    const res = await fetch(body.url, {
      method: "POST",
      headers,
      body: payloadStr,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const text = await res.text().catch(() => "");
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      ms: Date.now() - t0,
      body: text.slice(0, 240),
      attempt: body.attempt ?? 1,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        status: 0,
        ms: Date.now() - t0,
        error: err instanceof Error ? err.message : "fetch error",
        attempt: body.attempt ?? 1,
      },
      { status: 502 },
    );
  }
}
