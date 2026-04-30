import { requireAuth } from "@/lib/api/security";
export const runtime = "edge";

interface CatchupMessage {
  author: string;
  content: string;
  ts?: string;
  mentionsMe?: boolean;
}

interface CatchupRequest {
  messages: CatchupMessage[];
  channelName?: string;
  myName?: string;
}

interface CatchupResponse {
  headline: string;
  bullets: string[];
  mentionCount: number;
  decisionCount: number;
}

const SYSTEM_PROMPT = `You generate a tight catch-up summary for a chat channel. Read the recent messages and produce:
1. A one-line headline (≤12 words) capturing what happened most recently. Examples:
   "Sarah needs your input on pricing; deploy is blocked."
   "Quiet day — 3 status updates, no decisions."
2. 3–5 bullets on what was discussed and what needs the user's attention.

Output JSON exactly: { "headline": string, "bullets": string[] }
Be specific. Reference people by name. Flag mentions of the user. Never invent content.`;

function localFallback(req: CatchupRequest): CatchupResponse {
  const total = req.messages.length;
  const mentions = req.messages.filter((m) => m.mentionsMe).length;
  const speakers = Array.from(new Set(req.messages.map((m) => m.author)));
  const headline =
    total === 0
      ? "No new messages."
      : `${total} message${total === 1 ? "" : "s"} from ${speakers.length} ${
          speakers.length === 1 ? "person" : "people"
        }${mentions > 0 ? ` · ${mentions} mention${mentions === 1 ? "" : "s"} you` : ""}.`;
  const bullets = [
    `${total} new message${total === 1 ? "" : "s"} since you were last here.`,
    speakers.length > 0
      ? `From: ${speakers.slice(0, 5).join(", ")}${speakers.length > 5 ? "…" : ""}`
      : "No senders.",
    mentions > 0
      ? `${mentions} message${mentions === 1 ? "" : "s"} mention you directly.`
      : "No direct mentions.",
  ];
  return {
    headline,
    bullets,
    mentionCount: mentions,
    decisionCount: 0,
  };
}

export async function POST(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response!;

  let payload: CatchupRequest;
  try {
    payload = (await req.json()) as CatchupRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!payload.messages?.length) {
    return Response.json({
      headline: "No new messages.",
      bullets: [],
      mentionCount: 0,
      decisionCount: 0,
    } satisfies CatchupResponse);
  }

  const geminiKey =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  if (!geminiKey && !groqKey) {
    return Response.json(localFallback(payload));
  }

  const conversation = payload.messages
    .slice(-50)
    .map((m) => `${m.author}${m.mentionsMe ? " [→YOU]" : ""}: ${m.content}`)
    .join("\n");

  const userPrompt = `Channel: ${payload.channelName ?? "(unknown)"}
User name: ${payload.myName ?? "you"}

Recent messages:
${conversation}

Produce the JSON catch-up now.`;

  const url = geminiKey
    ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
    : "https://api.groq.com/openai/v1/chat/completions";
  const key = geminiKey ?? groqKey;
  const model = geminiKey ? "gemini-2.5-flash" : "llama-3.1-8b-instant";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 400,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!res.ok) return Response.json(localFallback(payload));
    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = body.choices?.[0]?.message?.content?.trim() ?? "";
    // Strip code fences if the model wraps the JSON.
    const jsonText = raw.replace(/```(?:json)?\s*/g, "").replace(/```$/, "");
    const parsed = JSON.parse(jsonText) as {
      headline?: string;
      bullets?: string[];
    };
    const mentionCount = payload.messages.filter((m) => m.mentionsMe).length;
    return Response.json({
      headline: parsed.headline ?? localFallback(payload).headline,
      bullets: parsed.bullets ?? [],
      mentionCount,
      decisionCount: 0,
    } satisfies CatchupResponse);
  } catch {
    return Response.json(localFallback(payload));
  }
}
