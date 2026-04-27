import { NextResponse } from "next/server";
import { callLlamaText } from "@/lib/ai/claude";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface ThreadMessage {
  speaker: string;
  text: string;
  ts?: string;
}

interface ThreadSummaryRequest {
  parent: ThreadMessage;
  replies: ThreadMessage[];
}

interface ThreadSummaryResponse {
  summary: string;
  provider: "groq" | "claude" | "demo";
}

const SYSTEM = `You write a single-sentence summary of a chat thread for someone joining late.
- 18 words or fewer.
- Capture the topic AND the current state ("decided X", "still debating Y", "Z is blocked on W").
- No greetings, no filler.
- If there's a question being asked but not answered, mention that.

Output the sentence directly — no quotes, no JSON.`;

export async function POST(req: Request) {
  let payload: ThreadSummaryRequest;
  try {
    payload = (await req.json()) as ThreadSummaryRequest;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!payload.parent?.text || !Array.isArray(payload.replies)) {
    return NextResponse.json(
      { error: "parent and replies required" },
      { status: 400 },
    );
  }

  const lines = [
    `${payload.parent.speaker}: ${payload.parent.text}`,
    ...payload.replies
      .slice(-30)
      .map((r) => `${r.speaker}: ${r.text}`),
  ];

  const text = await callLlamaText(SYSTEM, lines.join("\n"), {
    maxTokens: 80,
  });

  if (text) {
    return NextResponse.json<ThreadSummaryResponse>({
      summary: text.replace(/^"+|"+$/g, "").trim(),
      provider: process.env.GROQ_API_KEY
        ? "groq"
        : process.env.ANTHROPIC_API_KEY
          ? "claude"
          : "demo",
    });
  }

  // Heuristic fallback
  const last = payload.replies[payload.replies.length - 1];
  return NextResponse.json<ThreadSummaryResponse>({
    summary: `${payload.replies.length} replies discussing "${payload.parent.text.slice(0, 60)}…"${last ? ` — last from ${last.speaker}` : ""}.`,
    provider: "demo",
  });
}
