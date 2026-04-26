import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";
import { callLlmText } from "@/lib/ai/claude";

export const runtime = "edge";

type SuggestionMode =
  | "continue"
  | "improve"
  | "shorter"
  | "longer"
  | "summarise";

interface SuggestPayload {
  context?: string;
  mode?: SuggestionMode;
}

const FALLBACK_SUGGESTIONS: Record<SuggestionMode, string[]> = {
  continue: [
    " Our team aligned on the approach and outlined the next three milestones for this quarter.",
    " The key insight is that cross-module intelligence compounds — each module makes every other one smarter.",
    " We should revisit this section after the customer interview on Tuesday and lock the scope by Friday.",
  ],
  improve: [" — rewritten for clarity and impact."],
  shorter: [
    " In short: focus on the top three blockers and punt everything else to next cycle.",
  ],
  longer: [
    " To expand: this decision rests on three pillars — reliability, team velocity, and cost predictability. Each of them points in the same direction, and our previous experiments confirmed the hypothesis.",
  ],
  summarise: [
    " TL;DR: ship the MVP, measure activation, iterate on the top drop-off.",
  ],
};

const INSTRUCTIONS: Record<SuggestionMode, string> = {
  continue:
    "Continue the following writing naturally, in the same voice, ~2 sentences:",
  improve:
    "Rewrite this passage to be clearer and more concise, preserving meaning:",
  shorter: "Rewrite this passage in one short sentence:",
  longer: "Expand on this with 2-3 additional sentences of supporting detail:",
  summarise: "Summarise the following in a single TL;DR line:",
};

export async function POST(request: Request) {
  const __rl = await rateLimit({
    key: "suggest",
    limit: 20,
    windowSec: 60,
    req: request,
  });
  if (!__rl.ok) return __rl.response!;
  const body = (await request.json().catch(() => ({}))) as SuggestPayload;
  const context = body.context?.trim() ?? "";
  const mode = body.mode ?? "continue";

  if (!context) {
    return NextResponse.json({ error: "context is required" }, { status: 400 });
  }

  // Try a real model (Claude → Groq Llama-3); fall back to canned suggestion.
  const real = await callLlmText(
    "You rewrite or extend short passages of writing. Return only the new text — no preface, no quotes.",
    `${INSTRUCTIONS[mode]}\n\n${context}`,
    { maxTokens: 256 },
  );
  if (real) {
    return NextResponse.json({ suggestion: real, provider: "vyne" });
  }

  const pool = FALLBACK_SUGGESTIONS[mode] ?? FALLBACK_SUGGESTIONS.continue;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return NextResponse.json({ suggestion: pick, provider: "demo" });
}
