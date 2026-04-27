import { NextResponse } from "next/server";
import { callLlamaJson } from "@/lib/ai/claude";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface CorrelateRequest {
  /** The triggering event (alert, churn, incident, deal lost, etc.) */
  event: {
    title: string;
    timestamp?: string;
    type?: string;
    detail?: string;
  };
  /** Recent timeline of correlated signals across systems */
  timeline?: Array<{
    source: string; // GitHub, Sentry, Stripe, HubSpot...
    timestamp?: string;
    title: string;
    detail?: string;
  }>;
}

interface CorrelateResponse {
  hypothesis: string;
  confidence: number; // 0..100
  evidence: string[];
  suggestedAction: string;
  similarPastEvents: string[];
  provider: "groq" | "claude" | "demo";
}

const SYSTEM = `You correlate a triggering event (alert / incident / churn / deal lost) with the surrounding timeline of activity from other systems (GitHub deploys, Sentry errors, Stripe charges, HubSpot deal updates, etc.) and produce a likely root cause + confidence score + suggested next action.

Be conservative — if the timeline doesn't have enough signal, say so and lower confidence. Output JSON only:
{"hypothesis":"...","confidence":78,"evidence":["..."],"suggestedAction":"...","similarPastEvents":["..."]}`;

export async function POST(req: Request) {
  let payload: CorrelateRequest;
  try {
    payload = (await req.json()) as CorrelateRequest;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!payload.event?.title) {
    return NextResponse.json({ error: "event.title required" }, { status: 400 });
  }
  const userPrompt = `Triggering event:
${payload.event.title}${payload.event.timestamp ? ` (at ${payload.event.timestamp})` : ""}${payload.event.type ? ` [${payload.event.type}]` : ""}
${payload.event.detail ?? ""}

Surrounding timeline (oldest → newest):
${(payload.timeline ?? [])
  .slice(-30)
  .map(
    (t) =>
      `- [${t.source}]${t.timestamp ? ` ${t.timestamp}` : ""} ${t.title}${t.detail ? ` — ${t.detail}` : ""}`,
  )
  .join("\n")}

What likely caused the triggering event? Reply with JSON.`;

  const json = await callLlamaJson<CorrelateResponse>(SYSTEM, userPrompt, {
    maxTokens: 700,
  });

  if (json?.hypothesis) {
    return NextResponse.json<CorrelateResponse>({
      hypothesis: json.hypothesis,
      confidence: Math.max(0, Math.min(100, json.confidence ?? 50)),
      evidence: json.evidence ?? [],
      suggestedAction: json.suggestedAction ?? "",
      similarPastEvents: json.similarPastEvents ?? [],
      provider: process.env.GROQ_API_KEY
        ? "groq"
        : process.env.ANTHROPIC_API_KEY
          ? "claude"
          : "demo",
    });
  }

  return NextResponse.json<CorrelateResponse>({
    hypothesis:
      "Insufficient signal — set GROQ_API_KEY to enable AI correlation. Heuristic guess: check the most recent deploy from the timeline above.",
    confidence: 30,
    evidence: [],
    suggestedAction: "Review the timeline manually for the closest preceding change.",
    similarPastEvents: [],
    provider: "demo",
  });
}
