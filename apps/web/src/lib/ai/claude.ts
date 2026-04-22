/**
 * Claude client for VYNE.
 *
 * - Edge-runtime safe (uses fetch, not the SDK).
 * - Routes by quality: fast/cheap Haiku for tag/rank/search, balanced
 *   Sonnet for digest/meeting-notes/next-actions/suggest where quality
 *   matters more than latency.
 * - Prompt caching on every system prompt — system prompts are reused
 *   100s of times across requests for the same endpoint, so the first
 *   request after a cold start pays full price and the rest get ~90%
 *   off the input tokens.
 * - Returns null when ANTHROPIC_API_KEY isn't set, which lets the
 *   route fall back to its mock data.
 */

export type Quality = "fast" | "balanced";

const MODELS: Record<Quality, string> = {
  // Cheap + fast for high-volume mechanical work (tag, rank, search)
  fast: "claude-haiku-4-5-20251001",
  // Best quality for narrative output (digest, meeting notes, suggest)
  balanced: "claude-sonnet-4-6",
};

export interface ClaudeResult<T> {
  data: T | null;
  provider: "claude" | "demo";
}

interface ClaudeContentBlock {
  type: string;
  text?: string;
  cache_control?: { type: "ephemeral" };
}

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string | ClaudeContentBlock[];
}

interface ClaudeRequest {
  model: string;
  max_tokens: number;
  system?: string | ClaudeContentBlock[];
  messages: ClaudeMessage[];
  stream?: boolean;
}

interface ClaudeResponse {
  content?: Array<{ type: string; text?: string }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}

export interface CallClaudeJsonOptions {
  maxTokens?: number;
  /** Pick a model class. Defaults to "fast". */
  quality?: Quality;
  /** Override the model entirely (bypasses `quality`). */
  model?: string;
  /** Disable prompt caching (useful when iterating on the system prompt). */
  noCache?: boolean;
}

/**
 * Calls Claude with a JSON-mode prompt. Returns parsed JSON of type T,
 * or null if the API key isn't configured / the call fails.
 */
export async function callClaudeJson<T>(
  systemPrompt: string,
  userPrompt: string,
  opts: CallClaudeJsonOptions = {},
): Promise<T | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const model = opts.model ?? MODELS[opts.quality ?? "fast"];
  const fullSystem = `${systemPrompt}\n\nRespond with raw JSON only — no prose, no code fences.`;

  const body: ClaudeRequest = {
    model,
    max_tokens: opts.maxTokens ?? 512,
    system: opts.noCache
      ? fullSystem
      : [
          {
            type: "text",
            text: fullSystem,
            cache_control: { type: "ephemeral" },
          },
        ],
    messages: [{ role: "user", content: userPrompt }],
  };

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) return null;
    const json = (await res.json()) as ClaudeResponse;
    const text = json.content?.find((c) => c.type === "text")?.text;
    if (!text) return null;

    // Strip ```json fences if Claude added them anyway.
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

/**
 * Streaming text completion for the agent / chat surface. Returns a
 * ReadableStream of plain text tokens, or null when the API key isn't
 * set.
 *
 * Usage in a Next.js route:
 *
 *   const stream = await callClaudeStream(system, messages);
 *   if (!stream) return new Response("AI unavailable", { status: 503 });
 *   return new Response(stream, { headers: { "content-type": "text/plain" } });
 */
export async function callClaudeStream(
  systemPrompt: string,
  messages: ClaudeMessage[],
  opts: { maxTokens?: number; quality?: Quality; model?: string } = {},
): Promise<ReadableStream<Uint8Array> | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const model = opts.model ?? MODELS[opts.quality ?? "balanced"];
  const body: ClaudeRequest = {
    model,
    max_tokens: opts.maxTokens ?? 1024,
    system: [
      { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
    ],
    messages,
    stream: true,
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) return null;

  // Convert Anthropic SSE to a plain text stream of completion deltas.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buf = "";
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          // SSE messages are separated by blank lines
          const events = buf.split("\n\n");
          buf = events.pop() ?? "";

          for (const evt of events) {
            const dataLine = evt.split("\n").find((l) => l.startsWith("data: "));
            if (!dataLine) continue;
            const payload = dataLine.slice(6).trim();
            if (payload === "[DONE]") continue;
            try {
              const parsed = JSON.parse(payload) as {
                type?: string;
                delta?: { type?: string; text?: string };
              };
              if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                controller.enqueue(encoder.encode(parsed.delta.text));
              }
            } catch {
              /* ignore unparseable */
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });
}

/** True when an ANTHROPIC_API_KEY is configured server-side. */
export function isClaudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
