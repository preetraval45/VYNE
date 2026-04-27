import { NextResponse } from "next/server";
import { callLlamaJson } from "@/lib/ai/claude";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface TranslateRequest {
  text: string;
  /** Comma-separated list of target languages OR ["es","fr","ja"] */
  targets?: string[] | string;
}

interface TranslationLine {
  lang: string;
  flag?: string;
  text: string;
}

interface TranslateResponse {
  source: string;
  detectedLang?: string;
  translations: TranslationLine[];
  provider: "groq" | "claude" | "demo";
}

const DEFAULT_TARGETS = ["Spanish", "French", "Japanese"];

const FLAG: Record<string, string> = {
  Spanish: "🇪🇸",
  French: "🇫🇷",
  Japanese: "🇯🇵",
  German: "🇩🇪",
  Italian: "🇮🇹",
  Portuguese: "🇧🇷",
  Chinese: "🇨🇳",
  Korean: "🇰🇷",
  Hindi: "🇮🇳",
  Arabic: "🇸🇦",
  Russian: "🇷🇺",
  Dutch: "🇳🇱",
  Polish: "🇵🇱",
};

const SYSTEM_PROMPT = `You translate short chat messages between languages.
- Preserve tone (casual / formal / urgent), emoji, code blocks, and @mentions verbatim.
- Detect the source language.
- Return strict JSON: {"detectedLang":"English","translations":[{"lang":"Spanish","text":"..."},...]}`;

export async function POST(req: Request) {
  let payload: TranslateRequest;
  try {
    payload = (await req.json()) as TranslateRequest;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const text = (payload.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }
  const targets = Array.isArray(payload.targets)
    ? payload.targets
    : typeof payload.targets === "string"
      ? payload.targets.split(",").map((s) => s.trim())
      : DEFAULT_TARGETS;

  const userPrompt = `Source text:
"""
${text}
"""

Target languages: ${targets.join(", ")}

Detect the source language and translate into each target. Return JSON.`;

  const json = await callLlamaJson<{
    detectedLang?: string;
    translations: Array<{ lang: string; text: string }>;
  }>(SYSTEM_PROMPT, userPrompt, { maxTokens: 600 });

  if (json?.translations && Array.isArray(json.translations)) {
    return NextResponse.json<TranslateResponse>({
      source: text,
      detectedLang: json.detectedLang,
      translations: json.translations.map((t) => ({
        lang: t.lang,
        flag: FLAG[t.lang],
        text: t.text,
      })),
      provider: process.env.GROQ_API_KEY
        ? "groq"
        : process.env.ANTHROPIC_API_KEY
          ? "claude"
          : "demo",
    });
  }

  // Demo fallback: identity copies, useful for offline/no-key state
  return NextResponse.json<TranslateResponse>({
    source: text,
    detectedLang: "English",
    translations: targets.map((lang) => ({
      lang,
      flag: FLAG[lang],
      text: `[${lang}] ${text}`,
    })),
    provider: "demo",
  });
}
