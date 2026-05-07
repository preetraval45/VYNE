import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";

/**
 * POST /api/ai/tools/custom
 * Body: {
 *   webhookUrl: string;
 *   secret: string;             // plaintext — never logged
 *   toolName: string;
 *   args: Record<string, unknown>;
 *   conversationId?: string;
 *   actor?: string;
 * }
 *
 * Server-side dispatcher for custom AI tools (28.2.3). Signs the
 * payload with HMAC-SHA-256 (`X-VYNE-Tool-Signature`), POSTs to the
 * webhook, returns the response body to the AI executor so the model
 * can incorporate the result.
 *
 * 12 s timeout so a dead webhook can't hang an agent run. Rate-
 * limited 60/min per workspace.
 */

export const runtime = "edge";

interface Body {
  webhookUrl?: string;
  secret?: string;
  toolName?: string;
  args?: Record<string, unknown>;
  conversationId?: string;
  actor?: string;
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
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(`${ts}.${body}`),
  );
  return `t=${ts},v1=${hexEncode(sig)}`;
}

export async function POST(req: Request) {
  const rl = await rateLimit({
    key: "ai-custom-tool",
    limit: 60,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.webhookUrl) {
    return NextResponse.json(
      { ok: false, error: "missing webhookUrl" },
      { status: 400 },
    );
  }
  if (!body.toolName) {
    return NextResponse.json(
      { ok: false, error: "missing toolName" },
      { status: 400 },
    );
  }

  const t0 = Date.now();
  const ts = String(Math.floor(t0 / 1000));
  const payloadStr = JSON.stringify({
    tool: body.toolName,
    args: body.args ?? {},
    conversationId: body.conversationId,
    actor: body.actor,
    invokedAt: new Date().toISOString(),
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "VYNE-AI-Tools/1.0",
    "X-VYNE-Tool": body.toolName,
    "X-VYNE-Timestamp": ts,
  };

  if (body.secret) {
    try {
      headers["X-VYNE-Tool-Signature"] = await sign(
        body.secret,
        payloadStr,
        ts,
      );
    } catch {
      // crypto unavailable — skip signing.
    }
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch(body.webhookUrl, {
      method: "POST",
      headers,
      body: payloadStr,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const ct = res.headers.get("content-type") ?? "";
    let result: unknown;
    if (ct.includes("application/json")) {
      result = await res.json().catch(() => ({}));
    } else {
      result = (await res.text()).slice(0, 4000);
    }
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      ms: Date.now() - t0,
      result,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        status: 0,
        ms: Date.now() - t0,
        error: err instanceof Error ? err.message : "fetch error",
      },
      { status: 502 },
    );
  }
}
