import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// /api/ai/usage — collects per-call cost telemetry from the client. The
// browser POSTs `{kind, tokensIn?, tokensOut?, costCents?}` after each
// AI call and we accumulate per-day counters in a Vercel KV store
// (when configured). Without KV the route soft-fails with `{ok:false}`
// so the client doesn't block on missing infra.
//
// GET returns the rolling 30-day series for today's org. Both GET and
// POST are rate-limited to keep abuse cheap.

interface UsageBody {
  kind: "ask" | "tools" | "image" | "improve" | "receipt" | "stream" | "translate";
  tokensIn?: number;
  tokensOut?: number;
  costCents?: number;
  orgId?: string;
}

interface UsageRow {
  date: string;
  kind: string;
  count: number;
  tokensIn: number;
  tokensOut: number;
  costCents: number;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function kvAvailable(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function kvHGetAll(key: string): Promise<Record<string, string> | null> {
  if (!kvAvailable()) return null;
  try {
    const res = await fetch(
      `${process.env.KV_REST_API_URL}/hgetall/${encodeURIComponent(key)}`,
      {
        headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { result?: string[] | Record<string, string> };
    if (!body.result) return null;
    if (Array.isArray(body.result)) {
      const out: Record<string, string> = {};
      for (let i = 0; i < body.result.length; i += 2) {
        out[body.result[i]] = body.result[i + 1];
      }
      return out;
    }
    return body.result;
  } catch {
    return null;
  }
}

async function kvHIncrBy(key: string, field: string, by: number): Promise<void> {
  if (!kvAvailable()) return;
  try {
    await fetch(
      `${process.env.KV_REST_API_URL}/hincrby/${encodeURIComponent(key)}/${encodeURIComponent(field)}/${by}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
      },
    );
  } catch {
    // ignore
  }
}

async function kvExpire(key: string, seconds: number): Promise<void> {
  if (!kvAvailable()) return;
  try {
    await fetch(
      `${process.env.KV_REST_API_URL}/expire/${encodeURIComponent(key)}/${seconds}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
      },
    );
  } catch {
    // ignore
  }
}

export async function POST(req: Request) {
  const rl = await rateLimit({ key: "ai-usage-w", limit: 240, windowSec: 60, req });
  if (!rl.ok) return rl.response!;

  if (!kvAvailable()) {
    return NextResponse.json({ ok: false, configured: false });
  }

  let body: UsageBody;
  try {
    body = (await req.json()) as UsageBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const kind = (body.kind ?? "").trim();
  if (!/^[a-z]{3,16}$/.test(kind)) {
    return NextResponse.json({ error: "bad kind" }, { status: 400 });
  }

  const orgId = body.orgId ?? "demo";
  const day = todayKey();
  const key = `ai-usage:${orgId}:${day}`;

  await kvHIncrBy(key, `${kind}:count`, 1);
  if (body.tokensIn) await kvHIncrBy(key, `${kind}:tin`, Math.max(0, Math.floor(body.tokensIn)));
  if (body.tokensOut) await kvHIncrBy(key, `${kind}:tout`, Math.max(0, Math.floor(body.tokensOut)));
  if (body.costCents) await kvHIncrBy(key, `${kind}:cents`, Math.max(0, Math.floor(body.costCents)));
  // Auto-expire after 90 days so the KV bill stays small.
  await kvExpire(key, 60 * 60 * 24 * 90);
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const rl = await rateLimit({ key: "ai-usage-r", limit: 60, windowSec: 60, req });
  if (!rl.ok) return rl.response!;

  if (!kvAvailable()) {
    return NextResponse.json({ rows: [], configured: false });
  }
  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId") ?? "demo";
  const days = Math.min(30, Math.max(1, Number(url.searchParams.get("days") ?? "30")));

  const rows: UsageRow[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const map = await kvHGetAll(`ai-usage:${orgId}:${d}`);
    if (!map) continue;
    const kindGroups: Record<string, UsageRow> = {};
    for (const [field, valStr] of Object.entries(map)) {
      const m = /^([a-z]{3,16}):(count|tin|tout|cents)$/.exec(field);
      if (!m) continue;
      const k = m[1];
      const which = m[2];
      kindGroups[k] = kindGroups[k] ?? {
        date: d,
        kind: k,
        count: 0,
        tokensIn: 0,
        tokensOut: 0,
        costCents: 0,
      };
      const n = Number(valStr) || 0;
      if (which === "count") kindGroups[k].count = n;
      else if (which === "tin") kindGroups[k].tokensIn = n;
      else if (which === "tout") kindGroups[k].tokensOut = n;
      else if (which === "cents") kindGroups[k].costCents = n;
    }
    rows.push(...Object.values(kindGroups));
  }
  return NextResponse.json({ rows, configured: true });
}
