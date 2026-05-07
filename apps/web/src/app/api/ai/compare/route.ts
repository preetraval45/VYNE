import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";

/**
 * POST /api/ai/compare
 * Body: { prompt, system?, models? }
 *
 * Runs the same prompt against multiple providers in parallel and
 * returns each response side-by-side. Used by the chat UI's
 * "Compare" mode to QA which provider answers best for a given task.
 *
 * Provider matrix:
 *   - claude   → Anthropic Messages API (claude-3-5-haiku-latest)
 *   - groq     → Groq llama-3.3-70b-versatile
 *   - openai   → OpenAI gpt-4o-mini (when OPENAI_API_KEY set)
 *
 * Each provider runs independently with a per-call timeout. A
 * missing key short-circuits to null instead of failing the whole
 * compare.
 */

export const runtime = "edge";

interface Body {
  prompt?: string;
  system?: string;
  models?: Array<"claude" | "groq" | "openai">;
}

interface Result {
  provider: "claude" | "groq" | "openai";
  model: string;
  text: string | null;
  elapsedMs: number;
  error?: string;
}

const DEFAULT_SYSTEM =
  "You are Vyne AI — concise, factual, no preamble. Reply in plain prose unless code is asked for.";

const PER_CALL_TIMEOUT_MS = 25_000;

async function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  label: string,
): Promise<T | { error: string }> {
  return Promise.race([
    p,
    new Promise<{ error: string }>((resolve) =>
      setTimeout(() => resolve({ error: `${label} timed out` }), ms),
    ),
  ]);
}

async function runClaude(prompt: string, system: string): Promise<Result> {
  const t0 = Date.now();
  const key = process.env.ANTHROPIC_API_KEY;
  const model = "claude-3-5-haiku-latest";
  if (!key) {
    return {
      provider: "claude",
      model,
      text: null,
      elapsedMs: 0,
      error: "ANTHROPIC_API_KEY missing",
    };
  }
  const result = await withTimeout(
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 512,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    }).then(async (r) => {
      if (!r.ok) return { error: `${r.status} ${r.statusText}` };
      const b = (await r.json()) as {
        content?: Array<{ type: string; text?: string }>;
      };
      return {
        text:
          b.content?.find((c) => c.type === "text")?.text?.trim() ?? null,
      };
    }),
    PER_CALL_TIMEOUT_MS,
    "claude",
  );
  if ("error" in result) {
    return { provider: "claude", model, text: null, elapsedMs: Date.now() - t0, error: result.error };
  }
  return { provider: "claude", model, text: result.text ?? null, elapsedMs: Date.now() - t0 };
}

async function runGroq(prompt: string, system: string): Promise<Result> {
  const t0 = Date.now();
  const key = process.env.GROQ_API_KEY;
  const model = "llama-3.3-70b-versatile";
  if (!key) {
    return {
      provider: "groq",
      model,
      text: null,
      elapsedMs: 0,
      error: "GROQ_API_KEY missing",
    };
  }
  const result = await withTimeout(
    fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 512,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    }).then(async (r) => {
      if (!r.ok) return { error: `${r.status} ${r.statusText}` };
      const b = (await r.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return {
        text: b.choices?.[0]?.message?.content?.trim() ?? null,
      };
    }),
    PER_CALL_TIMEOUT_MS,
    "groq",
  );
  if ("error" in result) {
    return { provider: "groq", model, text: null, elapsedMs: Date.now() - t0, error: result.error };
  }
  return { provider: "groq", model, text: result.text ?? null, elapsedMs: Date.now() - t0 };
}

async function runOpenAi(prompt: string, system: string): Promise<Result> {
  const t0 = Date.now();
  const key = process.env.OPENAI_API_KEY;
  const model = "gpt-4o-mini";
  if (!key) {
    return {
      provider: "openai",
      model,
      text: null,
      elapsedMs: 0,
      error: "OPENAI_API_KEY missing",
    };
  }
  const result = await withTimeout(
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 512,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    }).then(async (r) => {
      if (!r.ok) return { error: `${r.status} ${r.statusText}` };
      const b = (await r.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return {
        text: b.choices?.[0]?.message?.content?.trim() ?? null,
      };
    }),
    PER_CALL_TIMEOUT_MS,
    "openai",
  );
  if ("error" in result) {
    return { provider: "openai", model, text: null, elapsedMs: Date.now() - t0, error: result.error };
  }
  return { provider: "openai", model, text: result.text ?? null, elapsedMs: Date.now() - t0 };
}

export async function POST(req: Request) {
  const rl = await rateLimit({
    key: "ai-compare",
    limit: 10,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  const body = (await req.json().catch(() => ({}))) as Body;
  const prompt = (body.prompt ?? "").trim();
  if (!prompt) {
    return NextResponse.json({ ok: false, error: "missing prompt" }, { status: 400 });
  }
  const system = body.system?.trim() || DEFAULT_SYSTEM;
  const which = body.models ?? ["claude", "groq", "openai"];

  const tasks: Array<Promise<Result>> = [];
  if (which.includes("claude")) tasks.push(runClaude(prompt, system));
  if (which.includes("groq")) tasks.push(runGroq(prompt, system));
  if (which.includes("openai")) tasks.push(runOpenAi(prompt, system));

  const results = await Promise.all(tasks);

  return NextResponse.json({
    ok: true,
    prompt,
    results,
  });
}
