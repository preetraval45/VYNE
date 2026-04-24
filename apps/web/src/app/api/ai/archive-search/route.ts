import { NextResponse } from "next/server";

export const runtime = "edge";

// ─── Vyne AI Archive Search ──────────────────────────────────────
//
// Given a natural-language query and the user's past sessions, return
// the 3 most relevant matches with a short "why this matched" reason.
// Runs even without an LLM key via a lexical fallback — this feature
// is the compound-interest moat ("when did I last feel stuck?") and
// must work on day 1.

interface SessionLike {
  id: string;
  createdAt: string;
  question: string;
  answer: string;
}

interface Payload {
  query: string;
  sessions: SessionLike[];
}

interface Hit {
  id: string;
  createdAt: string;
  snippet: string;
  reason: string;
  score: number;
}

function lexicalFallback(query: string, sessions: SessionLike[]): Hit[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
  const scored = sessions.map((s) => {
    const blob = `${s.question}\n${s.answer}`.toLowerCase();
    let score = 0;
    for (const tok of tokens) {
      const matches = blob.split(tok).length - 1;
      score += matches;
    }
    // recency bonus (more recent = slight boost)
    const ageDays = (Date.now() - new Date(s.createdAt).getTime()) / 86400000;
    const recency = Math.max(0, 3 - ageDays / 30);
    score += recency;
    return { session: s, score };
  });
  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => ({
      id: x.session.id,
      createdAt: x.session.createdAt,
      snippet: x.session.answer.slice(0, 220) + (x.session.answer.length > 220 ? "…" : ""),
      reason: `Keyword match (${Math.round(x.score)})`,
      score: x.score,
    }));
}

export async function POST(req: Request) {
  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ hits: [] });
  }
  if (!payload.query?.trim()) return NextResponse.json({ hits: [] });
  if (!payload.sessions?.length) return NextResponse.json({ hits: [] });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({ hits: lexicalFallback(payload.query, payload.sessions) });
  }

  try {
    const sessionsText = payload.sessions
      .slice(0, 120)
      .map(
        (s) =>
          `[[${s.id}]] ${new Date(s.createdAt).toISOString().slice(0, 10)}\nQ: ${s.question}\nA: ${s.answer.slice(0, 400)}`,
      )
      .join("\n\n---\n\n");

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
        system: `You are Vyne AI's archive search. Return the 3 most relevant past sessions
for the user's query. Output raw JSON, no prose, matching this schema:

{"hits":[{"id":"<session id from [[…]]>","reason":"<1 short sentence why it matched>"}, …]}

Rank by semantic relevance first, recency second. If nothing is a plausible match, return {"hits":[]}.`,
        messages: [
          {
            role: "user",
            content: `QUERY: ${payload.query}\n\nSESSIONS:\n${sessionsText}`,
          },
        ],
      }),
    });
    if (!res.ok) {
      return NextResponse.json({ hits: lexicalFallback(payload.query, payload.sessions) });
    }
    const body = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = body.content?.find((c) => c.type === "text")?.text?.trim();
    if (!text) return NextResponse.json({ hits: lexicalFallback(payload.query, payload.sessions) });
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(cleaned) as { hits?: Array<{ id: string; reason: string }> };
    const byId = new Map(payload.sessions.map((s) => [s.id, s]));
    const hits: Hit[] = (parsed.hits ?? [])
      .map((h, i) => {
        const s = byId.get(h.id);
        if (!s) return null;
        return {
          id: s.id,
          createdAt: s.createdAt,
          snippet:
            s.answer.slice(0, 220) + (s.answer.length > 220 ? "…" : ""),
          reason: h.reason,
          score: 100 - i,
        };
      })
      .filter((h): h is Hit => h !== null);
    return NextResponse.json({ hits });
  } catch {
    return NextResponse.json({ hits: lexicalFallback(payload.query, payload.sessions) });
  }
}
