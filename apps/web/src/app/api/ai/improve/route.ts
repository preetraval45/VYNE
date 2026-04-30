import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";

export const runtime = "edge";

// /api/ai/improve — rewrite a paragraph for clarity / concision while
// preserving meaning. Used by the docs editor's "Improve with AI" inline
// action. Stays text-in / text-out so the client can do a simple
// replace-selection. No structured output, no markdown.
//
// Provider preference: Groq Llama → Claude → deterministic fallback.

interface Body {
  text: string;
  /** Optional style hint: "tight" | "clear" | "formal" | "casual". */
  style?: string;
}

const SYSTEM = `You are a sharp copy editor. Rewrite the user's paragraph to be clearer and more concise without changing its meaning. Output ONLY the rewritten paragraph — no preamble, no quotes, no markdown headers, no commentary.`;

export async function POST(req: Request) {
  const rl = await rateLimit({ key: "ai-improve", limit: 30, windowSec: 60, req });
  if (!rl.ok) return rl.response!;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "Missing text" }, { status: 400 });
  if (text.length > 4000) {
    return NextResponse.json({ error: "Paragraph too long (max 4000 chars)" }, { status: 400 });
  }

  const groqKey = process.env.GROQ_API_KEY;
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  const styleHint = body.style ? `Style: ${body.style}.` : "";
  const userPrompt = `${styleHint}\n\nORIGINAL\n${text}\n\nREWRITE`;

  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 600,
          temperature: 0.4,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: userPrompt },
          ],
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const out = data.choices?.[0]?.message?.content?.trim();
        if (out) return NextResponse.json({ text: out, provider: "groq" });
      }
    } catch {
      // fall through
    }
  }

  if (claudeKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": claudeKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-latest",
          max_tokens: 600,
          system: SYSTEM,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          content?: Array<{ type: string; text?: string }>;
        };
        const out = data.content?.find((c) => c.type === "text")?.text?.trim();
        if (out) return NextResponse.json({ text: out, provider: "claude" });
      }
    } catch {
      // fall through
    }
  }

  // Local heuristic fallback: collapse repeated whitespace, trim filler.
  const cleaned = text
    .replace(/\b(very|really|just|kind of|sort of|basically|actually)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return NextResponse.json({ text: cleaned, provider: "local" });
}
