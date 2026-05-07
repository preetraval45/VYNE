import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/api/security";
import { rankByVector } from "@/lib/rag";

// POST /api/ai/retrieve
// Body: { query: string; k?: number; ref?: string }
//
// End-to-end RAG retrieval: embeds the query, scores every embedding
// row (optionally filtered by ref), returns top-K hits with text +
// score. The chat layer prepends these as <context> blocks before
// calling the model.

export const dynamic = "force-dynamic";

interface RetrieveBody {
  query?: string;
  k?: number;
  ref?: string;
}

export async function POST(req: Request) {
  const rl = await rateLimit({
    key: "ai-retrieve",
    limit: 120,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  let body: RetrieveBody;
  try {
    body = (await req.json()) as RetrieveBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const query = (body.query ?? "").trim();
  if (!query) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }
  const k = Math.max(1, Math.min(20, body.k ?? 6));

  // 1) Embed the query.
  const url = new URL(req.url);
  const origin = `${url.protocol}//${url.host}`;
  const embedRes = await fetch(`${origin}/api/ai/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: query }),
  });
  if (!embedRes.ok) {
    return NextResponse.json(
      { hits: [], error: "embed failed" },
      { status: 502 },
    );
  }
  const embedJson = (await embedRes.json()) as { vector?: number[] };
  const queryVector = embedJson.vector;
  if (!Array.isArray(queryVector)) {
    return NextResponse.json(
      { hits: [], error: "embed returned no vector" },
      { status: 502 },
    );
  }

  // 2) Pull rows. Capped at 1000 — replace with pgvector ANN once the
  // table grows beyond that. This stays portable until then.
  let rows: Array<{
    id: string;
    ref: string;
    source: string;
    text: string;
    vector: unknown;
    meta: unknown;
  }>;
  try {
    rows = await prisma.embedding.findMany({
      where: body.ref ? { ref: body.ref } : undefined,
      select: {
        id: true,
        ref: true,
        source: true,
        text: true,
        vector: true,
        meta: true,
      },
      take: 1000,
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return NextResponse.json(
      { hits: [], error: "embedding store unavailable" },
      { status: 200 },
    );
  }

  // 3) Score + return top-K. Pure function in lib/rag.
  const hits = rankByVector(rows, queryVector, k);
  return NextResponse.json({
    ok: true,
    query,
    k,
    hits: hits.map((h) => ({
      id: h.id,
      ref: h.ref,
      source: h.source,
      text: h.text,
      score: Number(h.score.toFixed(4)),
      meta: h.meta ?? null,
    })),
  });
}
