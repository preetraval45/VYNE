import { NextResponse } from "next/server";
import { rateLimit, requireAuth } from "@/lib/api/security";

export const runtime = "edge";

// ─── Vyne AI — form auto-fill / structured extraction ──────────────
//
// Powers the "Describe + auto-fill" card (AiFormFill). Takes freeform
// text plus the list of form fields and returns a JSON object mapping
// field keys → extracted string/number values.
//
// This is deliberately SEPARATE from /api/ai/ask: that route is a
// workspace-grounded Q&A layer whose system prompt refuses off-topic
// asks and whose context serializer ignores arbitrary keys — both of
// which broke auto-fill (the user's text was dropped, the model refused,
// and it only understood Anthropic/Groq keys, never GEMINI_API_KEY).
//
// Provider order matches the rest of the app: Gemini (primary) → Groq →
// Claude, each asked for strict JSON. With no key configured we fall
// back to a regex heuristic so common fields (email/phone/url) still
// fill in demo mode.

interface FieldSpec {
  key: string;
  label: string;
  hint?: string;
}

interface ExtractPayload {
  text: string;
  fields: FieldSpec[];
}

interface ExtractResponse {
  values: Record<string, string | number>;
  provider: "vyne" | "local";
  /** Set when nothing could be extracted, so the UI can explain why. */
  note?: string;
}

function buildPrompt(text: string, fields: FieldSpec[]): string {
  const fieldList = fields
    .map((f) => `- ${f.key}${f.hint ? ` (${f.hint})` : ""}: ${f.label}`)
    .join("\n");
  return `Extract values for the form fields below from the user's text.
Return ONLY a minified JSON object. Keys = the field keys listed. Values =
strings or numbers. OMIT any field you cannot confidently determine. No prose,
no markdown, no code fences.

FIELDS:
${fieldList}

USER TEXT:
"""
${text}
"""`;
}

const SYSTEM =
  "You are a precise data-extraction engine. You read freeform text and output a single minified JSON object mapping the requested field keys to extracted values. You never add commentary, never wrap output in markdown, and omit fields you cannot determine.";

/** Pull the first balanced-looking JSON object out of a model reply. */
function parseJsonObject(raw: string): Record<string, unknown> | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Keep only known field keys with string/number values. */
function whitelist(
  parsed: Record<string, unknown>,
  fields: FieldSpec[],
): Record<string, string | number> {
  const allowed = new Set(fields.map((f) => f.key));
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (!allowed.has(k)) continue;
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
    else if (typeof v === "number" && !Number.isNaN(v)) out[k] = v;
  }
  return out;
}

/** Best-effort regex extraction so demo mode (no API key) still helps. */
function localExtract(
  text: string,
  fields: FieldSpec[],
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0];
  const phone = text.match(/\+?\d[\d\s().-]{7,}\d/)?.[0];
  const url = text.match(/\bhttps?:\/\/[^\s]+|\bwww\.[^\s]+/i)?.[0];
  for (const f of fields) {
    const hay = `${f.key} ${f.label}`.toLowerCase();
    if (!out[f.key] && email && /email|e-mail/.test(hay)) out[f.key] = email;
    else if (!out[f.key] && phone && /phone|mobile|tel/.test(hay))
      out[f.key] = phone;
    else if (!out[f.key] && url && /website|url|site|web/.test(hay))
      out[f.key] = url;
  }
  return out;
}

async function callOpenAiCompat(
  url: string,
  key: string,
  model: string,
  prompt: string,
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        // JSON mode — supported by both Gemini's and Groq's OpenAI-compat
        // endpoints; forces a parseable object instead of chatty prose.
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = body.choices?.[0]?.message?.content ?? "";
    return parseJsonObject(text);
  } catch {
    return null;
  }
}

async function callClaude(
  key: string,
  prompt: string,
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 500,
        system: SYSTEM,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = body.content?.find((c) => c.type === "text")?.text ?? "";
    return parseJsonObject(text);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response!;

  const rl = await rateLimit({
    key: "ai-extract",
    limit: 20,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  let payload: ExtractPayload;
  try {
    payload = (await req.json()) as ExtractPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = (payload.text ?? "").trim();
  const fields = Array.isArray(payload.fields) ? payload.fields : [];
  if (!text)
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  if (fields.length === 0)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const claudeKey = process.env.ANTHROPIC_API_KEY;

  const prompt = buildPrompt(text, fields);

  // Try providers in priority order; first one that yields a JSON object wins.
  let parsed: Record<string, unknown> | null = null;
  if (geminiKey) {
    parsed = await callOpenAiCompat(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      geminiKey,
      "gemini-2.5-flash",
      prompt,
    );
  }
  if (!parsed && groqKey) {
    parsed = await callOpenAiCompat(
      "https://api.groq.com/openai/v1/chat/completions",
      groqKey,
      "llama-3.3-70b-versatile",
      prompt,
    );
  }
  if (!parsed && claudeKey) {
    parsed = await callClaude(claudeKey, prompt);
  }

  if (parsed) {
    const values = whitelist(parsed, fields);
    return NextResponse.json({
      values,
      provider: "vyne",
      note:
        Object.keys(values).length === 0
          ? "Vyne AI couldn't find matching values in that description. Try adding more detail."
          : undefined,
    } satisfies ExtractResponse);
  }

  // No provider answered → regex heuristic so demo mode still does something.
  const values = localExtract(text, fields);
  const hadKey = !!(geminiKey || groqKey || claudeKey);
  return NextResponse.json({
    values,
    provider: "local",
    note:
      Object.keys(values).length > 0
        ? undefined
        : hadKey
          ? "Vyne AI is temporarily unavailable. Please try again."
          : "AI auto-fill needs an API key (GEMINI_API_KEY) configured in the deployment to read free-text descriptions.",
  } satisfies ExtractResponse);
}
