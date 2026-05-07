import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";

/**
 * GET /api/workspaces/usage?workspaceId=…
 *
 * Returns consumption counters per workspace (26.4):
 *   - seats        — provisioned vs active in last 30 days
 *   - storage      — attachment + doc bytes, with the apex limit
 *   - apiCalls     — last 30 days
 *   - aiTokens     — last 30 days, broken down by model
 *   - webhookHits  — successful + failed deliveries
 *
 * Demo data is synthesised deterministically from the workspace id so
 * the dashboard renders meaningful numbers without a backend. Real
 * deploys swap the synth block for per-tenant rollups.
 */

export const runtime = "edge";

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function synthesise(workspaceId: string) {
  const seed = hash(workspaceId);
  const r = (mix: number) =>
    Math.abs(Math.sin(seed * (mix + 1) * 0.137) * 1_000_000) % 1;
  return {
    workspaceId,
    period: "last-30-days",
    seats: {
      provisioned: 12 + Math.floor(r(1) * 80),
      active: 8 + Math.floor(r(2) * 70),
      pendingInvites: Math.floor(r(3) * 5),
    },
    storage: {
      bytesUsed: Math.floor((1 + r(4) * 9) * 1024 * 1024 * 1024),
      bytesQuota: 25 * 1024 * 1024 * 1024,
    },
    apiCalls: {
      total: 5_000 + Math.floor(r(5) * 240_000),
      errors: Math.floor(r(6) * 800),
      avgLatencyMs: 80 + Math.floor(r(7) * 320),
    },
    aiTokens: {
      total: 200_000 + Math.floor(r(8) * 5_000_000),
      byModel: [
        {
          model: "claude-opus-4-7",
          tokens: 120_000 + Math.floor(r(9) * 1_200_000),
          usd: Math.round(r(10) * 24 * 100) / 100,
        },
        {
          model: "claude-sonnet-4-6",
          tokens: 80_000 + Math.floor(r(11) * 800_000),
          usd: Math.round(r(12) * 9.5 * 100) / 100,
        },
        {
          model: "groq/llama-3.3-70b-versatile",
          tokens: 40_000 + Math.floor(r(13) * 400_000),
          usd: Math.round(r(14) * 1.2 * 100) / 100,
        },
      ],
    },
    webhookHits: {
      delivered: 200 + Math.floor(r(15) * 8_000),
      failed: Math.floor(r(16) * 60),
    },
    asOf: new Date().toISOString(),
  };
}

export async function GET(req: Request) {
  const rl = await rateLimit({
    key: "workspaces-usage",
    limit: 60,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId") ?? "ws-vyne-hq";
  return NextResponse.json({
    ok: true,
    usage: synthesise(workspaceId),
  });
}
