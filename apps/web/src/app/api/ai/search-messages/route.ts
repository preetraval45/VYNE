import { NextResponse } from "next/server";
import { callLlamaJson } from "@/lib/ai/claude";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface SearchableMessage {
  id: string;
  channelId: string;
  channelName?: string;
  author: string;
  content: string;
  timestamp?: string;
}

interface AISearchRequest {
  query: string;
  /** Up to ~200 messages to consider — prioritized by recency by the caller */
  messages: SearchableMessage[];
}

interface AISearchHit {
  id: string;
  reason: string;
  /** 0..100 — higher is more relevant */
  relevance: number;
}

interface AISearchResponse {
  hits: AISearchHit[];
  refinedQuery?: string;
  provider: "groq" | "claude" | "demo";
}

const SYSTEM = `You are a semantic search engine over chat messages.

The user gives you a natural-language query and a list of candidate messages with ids. Pick up to 8 messages that best answer or relate to the query. For each, output:
- id (must match an input id verbatim)
- reason (1 short sentence: WHY this message matches)
- relevance (integer 0-100, higher = better match)

Sort by relevance desc. If nothing matches above 30, return [].

Output JSON: {"hits":[{"id":"...","reason":"...","relevance":85},...], "refinedQuery":"<rewritten query if useful>"}`;

export async function POST(req: Request) {
  let payload: AISearchRequest;
  try {
    payload = (await req.json()) as AISearchRequest;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const query = payload.query?.trim();
  if (!query) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }
  const messages = (payload.messages ?? []).slice(-200);
  if (messages.length === 0) {
    return NextResponse.json<AISearchResponse>({
      hits: [],
      provider: "demo",
    });
  }

  const userPrompt = `User query: "${query}"

Candidate messages:
${messages
  .map(
    (m) =>
      `id=${m.id} | #${m.channelName ?? m.channelId} | ${m.author}: ${m.content.slice(0, 200)}`,
  )
  .join("\n")}

Return JSON.`;

  const json = await callLlamaJson<AISearchResponse>(SYSTEM, userPrompt, {
    maxTokens: 700,
  });

  if (json?.hits) {
    return NextResponse.json<AISearchResponse>({
      hits: json.hits.slice(0, 8),
      refinedQuery: json.refinedQuery,
      provider: process.env.GROQ_API_KEY
        ? "groq"
        : process.env.ANTHROPIC_API_KEY
          ? "claude"
          : "demo",
    });
  }

  return NextResponse.json<AISearchResponse>({
    hits: [],
    provider: "demo",
  });
}
