import { NextResponse } from "next/server";
import { callLlamaText } from "@/lib/ai/claude";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface FollowupRequest {
  /** Either a meeting recap or a chat thread excerpt to base the email on */
  context: string;
  /** "email" | "slack" | "linkedin" | "notion" */
  channel?: string;
  recipient?: string;
  /** "concise" | "warm" | "formal" */
  tone?: string;
  callToAction?: string;
}

interface FollowupResponse {
  subject?: string;
  body: string;
  provider: "groq" | "claude" | "demo";
}

const SYSTEM = `You draft follow-up communications based on a meeting recap, call notes, or chat thread.

Rules:
- Match the requested channel format (email = subject + body; slack = single message; linkedin = brief message; notion = structured doc).
- Match the requested tone exactly. Default is concise.
- Reference specific decisions and action items from the context — never use generic filler.
- For emails, keep under 160 words. For Slack messages, under 80 words.
- If the context mentions specific dates / deadlines / people, use them.

For emails return both subject and body. For other channels just body. Output plain text — not JSON.`;

export async function POST(req: Request) {
  let payload: FollowupRequest;
  try {
    payload = (await req.json()) as FollowupRequest;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!payload.context?.trim()) {
    return NextResponse.json({ error: "context required" }, { status: 400 });
  }
  const channel = payload.channel ?? "email";
  const tone = payload.tone ?? "concise";

  const userPrompt = `Channel: ${channel}
Tone: ${tone}
Recipient: ${payload.recipient ?? "(unspecified)"}
Call to action: ${payload.callToAction ?? "(none — make a sensible default)"}

Context to draft from:
"""
${payload.context}
"""

Draft the follow-up. ${
    channel === "email"
      ? "Format: 'Subject: <line>' on the first line, blank line, then body."
      : "Format: just the message body, no subject line."
  }`;

  const text = await callLlamaText(SYSTEM, userPrompt, { maxTokens: 600 });

  if (text) {
    let subject: string | undefined;
    let body = text;
    if (channel === "email") {
      const m = text.match(/^subject:\s*(.+)$/im);
      if (m) {
        subject = m[1].trim();
        body = text.replace(/^subject:\s*.+\n?/i, "").trim();
      }
    }
    return NextResponse.json<FollowupResponse>({
      subject,
      body,
      provider: process.env.GROQ_API_KEY
        ? "groq"
        : process.env.ANTHROPIC_API_KEY
          ? "claude"
          : "demo",
    });
  }

  return NextResponse.json<FollowupResponse>({
    subject:
      channel === "email" ? "Follow-up from our conversation" : undefined,
    body: `Hi ${payload.recipient ?? "team"},\n\nThanks for the time today. Quick recap and next steps:\n\n${payload.context.slice(0, 240)}…\n\n(VYNE AI follow-up unavailable — set GROQ_API_KEY to enable real drafts.)\n\nBest,\nYou`,
    provider: "demo",
  });
}
