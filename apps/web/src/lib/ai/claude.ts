export interface ClaudeResult<T> {
  data: T | null;
  provider: "claude" | "groq" | "demo";
}

/**
 * Calls an LLM with a JSON-mode prompt and returns parsed JSON of type T.
 *
 * Provider order (first one with credentials wins):
 *   1. Anthropic Claude  (ANTHROPIC_API_KEY) — paid, highest quality
 *   2. Groq Llama-3      (GROQ_API_KEY)      — FREE tier, very fast
 *   3. Returns null      → caller falls back to its deterministic demo
 *
 * Designed for edge runtime — no Node deps.
 *
 * Get a free Groq key: https://console.groq.com/keys
 */
export async function callClaudeJson<T>(
  systemPrompt: string,
  userPrompt: string,
  opts: { maxTokens?: number; model?: string } = {},
): Promise<T | null> {
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const jsonHardener = `${systemPrompt}\n\nRespond with raw JSON only — no prose, no code fences.`;

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
          model: opts.model ?? "claude-3-5-haiku-latest",
          max_tokens: opts.maxTokens ?? 512,
          system: jsonHardener,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      if (res.ok) {
        const body = (await res.json()) as {
          content?: Array<{ type: string; text?: string }>;
        };
        const text = body.content?.find((c) => c.type === "text")?.text;
        if (text) return parseJsonStrict<T>(text);
      }
    } catch {
      // fall through to Groq
    }
  }

  if (groqKey) {
    try {
      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            max_tokens: opts.maxTokens ?? 512,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: jsonHardener },
              { role: "user", content: userPrompt },
            ],
          }),
        },
      );
      if (res.ok) {
        const body = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const text = body.choices?.[0]?.message?.content;
        if (text) return parseJsonStrict<T>(text);
      }
    } catch {
      // fall through to demo
    }
  }

  return null;
}

function parseJsonStrict<T>(text: string): T | null {
  // Strip ```json fences if the model added them anyway.
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

async function callClaudeText(
  systemPrompt: string,
  userPrompt: string,
  opts: { maxTokens?: number; model?: string },
): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: opts.model ?? "claude-3-5-haiku-latest",
        max_tokens: opts.maxTokens ?? 512,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    return body.content?.find((c) => c.type === "text")?.text?.trim() ?? null;
  } catch {
    return null;
  }
}

async function callGroqText(
  systemPrompt: string,
  userPrompt: string,
  opts: { maxTokens?: number },
): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: opts.maxTokens ?? 512,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return body.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

/**
 * Plain-text companion to `callClaudeJson`. Same Anthropic → Groq → null
 * fallback chain, but for routes that want unstructured prose (e.g. the
 * morning brief, the doc-suggestion endpoint).
 */
export async function callLlmText(
  systemPrompt: string,
  userPrompt: string,
  opts: { maxTokens?: number; model?: string } = {},
): Promise<string | null> {
  const fromClaude = await callClaudeText(systemPrompt, userPrompt, opts);
  if (fromClaude) return fromClaude;
  return callGroqText(systemPrompt, userPrompt, opts);
}
