import { NextResponse } from "next/server";
import { callLlamaJson } from "@/lib/ai/claude";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface TranscriptLine {
  speaker: string;
  text: string;
  ts?: number;
}

interface RecapRequest {
  transcript: TranscriptLine[];
  participants?: string[];
  durationSec?: number;
  channelName?: string;
}

interface ActionItem {
  owner: string;
  task: string;
  due?: string;
}

interface RecapResponse {
  summary: string;
  decisions: string[];
  actionItems: ActionItem[];
  topics: string[];
  followUpQuestions: string[];
  provider: "groq" | "claude" | "demo";
}

const SYSTEM_PROMPT = `You distill a meeting transcript into a structured recap. Be specific — never write generic phrases like "team discussed things". Extract:
- summary: 2-3 sentences capturing the actual content of the call
- decisions: concrete agreements made during the call (verbs like "agreed", "decided", "we'll", "let's go with"). If none, return [].
- actionItems: {owner, task, due?} — owner from participants list, task is short imperative ("Send draft by Friday"), due is ISO date or relative phrase if mentioned. If none, return [].
- topics: 3-6 short topic labels covering what was actually said
- followUpQuestions: open questions raised but not resolved

Return strict JSON only — no prose, no fences.`;

export async function POST(req: Request) {
  let payload: RecapRequest;
  try {
    payload = (await req.json()) as RecapRequest;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const transcript = payload.transcript ?? [];
  if (transcript.length === 0) {
    return NextResponse.json<RecapResponse>({
      summary: "No transcript captured. Enable AI Notes during the call for a recap.",
      decisions: [],
      actionItems: [],
      topics: [],
      followUpQuestions: [],
      provider: "demo",
    });
  }

  const transcriptText = transcript
    .slice(-200) // cap to last 200 utterances
    .map((l) => `${l.speaker}: ${l.text}`)
    .join("\n");

  const userPrompt = `Channel: ${payload.channelName ?? "—"}
Duration: ${payload.durationSec ? Math.round(payload.durationSec / 60) + " min" : "—"}
Participants: ${(payload.participants ?? []).join(", ")}

Transcript:
${transcriptText}

Generate the structured recap.`;

  const json = await callLlamaJson<{
    summary: string;
    decisions?: string[];
    actionItems?: Array<{ owner: string; task: string; due?: string }>;
    topics?: string[];
    followUpQuestions?: string[];
  }>(SYSTEM_PROMPT, userPrompt, { maxTokens: 900 });

  if (json?.summary) {
    return NextResponse.json<RecapResponse>({
      summary: json.summary,
      decisions: json.decisions ?? [],
      actionItems: json.actionItems ?? [],
      topics: json.topics ?? [],
      followUpQuestions: json.followUpQuestions ?? [],
      provider: process.env.GROQ_API_KEY
        ? "groq"
        : process.env.ANTHROPIC_API_KEY
          ? "claude"
          : "demo",
    });
  }

  // Heuristic fallback (regex-based, same as the old behaviour)
  const fullText = transcriptText.toLowerCase();
  const decisions = transcript
    .filter((l) =>
      /\b(decided|agreed|going with|let's go|approved|let's do)\b/i.test(l.text),
    )
    .map((l) => l.text)
    .slice(0, 5);
  const actions = transcript
    .filter((l) =>
      /\b(will|i'll|we'll|let's|need to|going to|send|schedule|draft|review|fix|build|ship)\b/i.test(
        l.text,
      ),
    )
    .map((l) => ({ owner: l.speaker, task: l.text }))
    .slice(0, 8);

  return NextResponse.json<RecapResponse>({
    summary:
      transcript.length > 0
        ? `Discussed ${transcript.length} exchanges over ${Math.round((payload.durationSec ?? 0) / 60)} min. Top voice: ${transcript[0].speaker}.`
        : "Empty meeting.",
    decisions,
    actionItems: actions,
    topics: [],
    followUpQuestions: [],
    provider: "demo",
  });
}
