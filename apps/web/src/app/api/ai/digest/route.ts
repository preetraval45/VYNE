import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";
import { callLlamaJson } from "@/lib/ai/claude";

export const runtime = "edge";

interface DigestPayload {
  audience?: string;
  highlights?: string[];
}

interface DigestResponse {
  headline: string;
  summary: string;
  bullets: string[];
  callToAction: string;
}

const FALLBACK: DigestResponse = {
  headline: "Yesterday at VYNE",
  summary:
    "A solid push across engineering, ops, and finance — momentum is back on the priority items.",
  bullets: [
    "✅ 3 issues closed in Sprint 12 (ENG-43, ENG-45, ENG-47)",
    "📈 Revenue tracking 12% above last week — 47 new orders",
    "🤖 Vyne AI auto-resolved 2 incidents (api-service v2.4.1, payment retry)",
    "💬 284 messages, 38 docs edited, 12 PRs merged",
  ],
  callToAction:
    "Top blocker today: PWR-003 stock running critical (38 units left). React in #ops.",
};

export async function POST(request: Request) {
  const __rl = await rateLimit({
    key: "digest",
    limit: 20,
    windowSec: 60,
    req: request,
  });
  if (!__rl.ok) return __rl.response!;
  const body = (await request.json().catch(() => ({}))) as DigestPayload;

  const userPrompt = `Create a concise daily digest for ${body.audience ?? "the team"} based on these recent highlights:\n${(body.highlights ?? ["Sprint 12 progress", "Order volume up", "No outages"]).map((h) => `- ${h}`).join("\n")}\n\nReturn JSON with fields: headline (string, <60 chars), summary (1 sentence), bullets (array of 3-5 strings, each ≤90 chars, start with an emoji), callToAction (1 sentence pointing to the most urgent thing).`;

  const real = await callLlamaJson<DigestResponse>(
    "You are the daily digest writer for VYNE — punchy, factual, no fluff.",
    userPrompt,
    { maxTokens: 600 },
  );

  return NextResponse.json({
    digest: real ?? FALLBACK,
    provider: real ? "claude" : "demo",
    generatedAt: new Date().toISOString(),
  });
}
