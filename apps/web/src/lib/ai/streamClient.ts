// ─── Vyne AI streaming client ─────────────────────────────────────
//
// Reads OpenAI-compatible SSE from /api/ai/stream (Groq passes Llama
// output through in OpenAI format). The endpoint forwards the upstream
// stream unchanged. Format:
//
//   data: {"choices":[{"delta":{"content":"Hello"}}]}
//   data: {"choices":[{"delta":{"content":" world"}}]}
//   data: [DONE]
//
// One JSON message per `data:` line, blank line between messages,
// `[DONE]` sentinel terminates.

export interface WebSource {
  title: string;
  url: string;
}

export interface StreamChunk {
  type: "delta" | "done" | "error" | "sources";
  text?: string;
  error?: string;
  sources?: WebSource[];
}

export interface StreamRequest {
  question: string;
  context?: unknown;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  model?: "haiku" | "sonnet" | "opus";
  memory?: string[];
  /** Inline images (data URLs) attached to the user message — Gemini
   *  vision uses them as additional grounding inputs. */
  images?: string[];
  signal?: AbortSignal;
}

export async function* streamVyneAI(
  req: StreamRequest,
): AsyncGenerator<StreamChunk> {
  const res = await fetch("/api/ai/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: req.question,
      context: req.context,
      history: req.history,
      model: req.model,
      memory: req.memory,
      images: req.images,
    }),
    signal: req.signal,
  });

  if (!res.ok || !res.body) {
    yield {
      type: "error",
      error: `Stream failed: ${res.status} ${res.statusText}`,
    };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE messages are separated by blank lines. Each message has one
    // or more `data:` lines (OpenAI emits exactly one).
    let idx;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const lines = raw.split("\n");
      let data = "";
      for (const line of lines) {
        if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;
      // OpenAI/Groq end-of-stream sentinel
      if (data === "[DONE]") {
        yield { type: "done" };
        return;
      }
      try {
        const json = JSON.parse(data) as {
          choices?: Array<{
            delta?: { content?: string };
            grounding_metadata?: {
              grounding_chunks?: Array<{
                web?: { uri?: string; title?: string };
              }>;
            };
          }>;
          error?: { message?: string };
        };
        if (json.error?.message) {
          yield { type: "error", error: json.error.message };
          return;
        }
        const text = json.choices?.[0]?.delta?.content;
        if (text) yield { type: "delta", text };
        // Gemini surfaces web grounding via grounding_metadata.grounding_chunks
        // on the OpenAI-compat stream (when available).
        const chunks =
          json.choices?.[0]?.grounding_metadata?.grounding_chunks ?? [];
        if (chunks.length > 0) {
          const sources: WebSource[] = chunks
            .map((c) => c.web)
            .filter((w): w is { uri?: string; title?: string } => !!w)
            .map((w) => ({
              title: w.title ?? w.uri ?? "Source",
              url: w.uri ?? "#",
            }))
            .filter((s) => s.url !== "#");
          if (sources.length > 0) yield { type: "sources", sources };
        }
      } catch {
        // ignore malformed
      }
    }
  }
  yield { type: "done" };
}

/**
 * Parse fenced code blocks out of an assistant message. Returns the
 * prose with placeholders, plus a list of artifacts (one per block).
 *
 * Triple-backtick blocks with a language tag like ```ts or ```python or
 * ```markdown become artifacts. Inline single-backtick code stays inline.
 */
export interface Artifact {
  id: string;
  language: string;
  content: string;
  /** Where in the prose the artifact appears (placeholder index). */
  index: number;
}

export interface ParsedMessage {
  prose: string;
  artifacts: Artifact[];
}

export function parseArtifacts(text: string): ParsedMessage {
  const re = /```([a-zA-Z0-9_+\-]*)\n([\s\S]*?)```/g;
  const artifacts: Artifact[] = [];
  let prose = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text)) !== null) {
    prose += text.slice(lastIndex, match.index);
    const language = (match[1] || "text").toLowerCase();
    const content = match[2];
    const id = `artifact-${i++}`;
    artifacts.push({ id, language, content, index: artifacts.length });
    prose += `​[[ARTIFACT:${id}]]​`;
    lastIndex = match.index + match[0].length;
  }
  prose += text.slice(lastIndex);
  return { prose, artifacts };
}
