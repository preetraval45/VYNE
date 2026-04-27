import { NextResponse } from "next/server";
import { callLlamaJson } from "@/lib/ai/claude";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface MessagePreview {
  author: string;
  content: string;
  ts?: string;
}

interface SmartReplyRequest {
  messages: MessagePreview[];
  /** Names that identify the current user (so AI knows what voice to write in) */
  userNames?: string[];
  /** Optional channel name for context */
  channelName?: string;
}

interface SmartReplyChip {
  emoji?: string;
  text: string;
}

interface SmartReplyResponse {
  suggestions: SmartReplyChip[];
  provider: "claude" | "groq" | "demo";
}

const SYSTEM_PROMPT = `You generate 3 short, useful quick-reply suggestions for the user to send next in a chat. Each suggestion must:
- Be in the user's voice (first person, casual but professional)
- Be 2-12 words
- Be contextually relevant to the latest incoming message
- Have a different intent (e.g. one agreement, one question, one alternative)
- Avoid generic filler like "Sounds good!" if a more specific option fits

Output strict JSON: {"suggestions":[{"emoji":"👍","text":"On it"},...]}. Emoji is optional.`;

export async function POST(req: Request) {
  let payload: SmartReplyRequest;
  try {
    payload = (await req.json()) as SmartReplyRequest;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const recent = (payload.messages ?? [])
    .slice(-8)
    .map((m) => `${m.author}: ${m.content}`)
    .filter((s) => s.length > 2);
  if (recent.length === 0) {
    return NextResponse.json<SmartReplyResponse>({
      suggestions: [],
      provider: "demo",
    });
  }
  const userIs = (payload.userNames ?? ["You"]).join(" or ");
  const userPrompt = `User name: ${userIs}
Channel: ${payload.channelName ?? "—"}

Recent messages (oldest → newest):
${recent.join("\n")}

Generate 3 reply chips for the user to send next.`;

  const json = await callLlamaJson<{ suggestions: SmartReplyChip[] }>(
    SYSTEM_PROMPT,
    userPrompt,
    { maxTokens: 240 },
  );

  if (
    json?.suggestions &&
    Array.isArray(json.suggestions) &&
    json.suggestions.length > 0
  ) {
    return NextResponse.json<SmartReplyResponse>({
      suggestions: json.suggestions.slice(0, 3),
      provider: process.env.GROQ_API_KEY ? "groq" : "claude",
    });
  }

  // Heuristic fallback (same as before — used when no API key configured)
  return NextResponse.json<SmartReplyResponse>({
    suggestions: heuristicReplies(recent[recent.length - 1] ?? ""),
    provider: "demo",
  });
}

function heuristicReplies(lastLine: string): SmartReplyChip[] {
  const text = lastLine.toLowerCase();
  if (/\?/.test(lastLine) || /^(?:.*: )?(can|should|would|will|do|are|is|how|what|when|where|why)\b/i.test(text)) {
    return [
      { emoji: "👍", text: "Yes" },
      { text: "Let me check" },
      { text: "Not sure — can you elaborate?" },
    ];
  }
  if (/\b(thanks|thank you|appreciate)\b/.test(text)) {
    return [
      { emoji: "🙌", text: "You're welcome!" },
      { text: "Anytime!" },
      { text: "Happy to help" },
    ];
  }
  if (/\b(meeting|call|sync)\b/.test(text)) {
    return [
      { text: "Sounds good — when works?" },
      { emoji: "📅", text: "Send a calendar invite?" },
      { text: "Let me check my schedule" },
    ];
  }
  return [
    { emoji: "👍", text: "Got it" },
    { emoji: "🙏", text: "Thanks!" },
    { text: "Let me think on this" },
  ];
}
