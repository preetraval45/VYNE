import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/api/security";
import { chunkText } from "@/lib/rag";

// POST /api/ai/ingest
// Body: { ref: string; source?: string; text: string; meta?: object }
// or: { ref: string; source?: string; chunks: string[]; meta?: object }
//
// Pipeline: text → chunkText() → /api/ai/embed each chunk → upsert into
// the Embedding table. The retrieve route ranks against this table.
// Demo mode (no embed provider key) still works because /api/ai/embed
// falls back to a deterministic 384-dim hash vector.

export const dynamic = "force-dynamic";
export const maxDuration = 60; // some PDFs need it

interface IngestBody {
  ref?: string;
  source?: string;
  text?: string;
  chunks?: string[];
  meta?: Record<string, unknown> | null;
  /** When true, deletes existing embeddings for `ref` before inserting. */
  replace?: boolean;
}

async function embedOne(
  origin: string,
  text: string,
): Promise<number[] | null> {
  try {
    const r = await fetch(`${origin}/api/ai/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { vector?: number[] };
    return Array.isArray(j.vector) ? j.vector : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const rl = await rateLimit({
    key: "ai-ingest",
    limit: 30,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  let body: IngestBody;
  try {
    body = (await req.json()) as IngestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ref = body.ref?.trim();
  if (!ref) {
    return NextResponse.json({ error: "ref required" }, { status: 400 });
  }
  const source = (body.source ?? "").trim();
  const meta = body.meta ?? undefined;

  // Source of chunks: explicit array > chunked text. Cap at 200 to
  // avoid blowing up the table on a runaway upload.
  const chunks: string[] = Array.isArray(body.chunks) && body.chunks.length > 0
    ? body.chunks.filter((c) => typeof c === "string" && c.trim().length > 0).slice(0, 200)
    : chunkText(body.text ?? "").slice(0, 200);

  if (chunks.length === 0) {
    return NextResponse.json({ error: "no text to ingest" }, { status: 400 });
  }

  // Resolve own origin so the Edge embed route is reachable from this
  // Node-runtime route on Vercel.
  const url = new URL(req.url);
  const origin = `${url.protocol}//${url.host}`;

  if (body.replace) {
    try {
      await prisma.embedding.deleteMany({ where: { ref } });
    } catch {
      /* table may not exist yet on first deploy — ignore */
    }
  }

  const created: { id: string; chunkIndex: number; preview: string }[] = [];
  let failed = 0;

  for (let i = 0; i < chunks.length; i++) {
    const text = chunks[i];
    const vector = await embedOne(origin, text);
    if (!vector) {
      failed++;
      continue;
    }
    try {
      const row = await prisma.embedding.create({
        data: {
          ref,
          source,
          text,
          vector: vector as never,
          meta: (meta ?? null) as never,
        },
      });
      created.push({
        id: row.id,
        chunkIndex: i,
        preview: text.slice(0, 80),
      });
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    ref,
    source,
    chunkCount: chunks.length,
    created: created.length,
    failed,
    samples: created.slice(0, 3),
  });
}

// GET /api/ai/ingest?ref=...  — list embeddings for a ref (admin/debug)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ref = url.searchParams.get("ref");
  try {
    const where = ref ? { ref } : {};
    const rows = await prisma.embedding.findMany({
      where,
      select: { id: true, ref: true, source: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ embeddings: rows });
  } catch (err) {
    return NextResponse.json(
      { embeddings: [], error: err instanceof Error ? err.message : "DB error" },
      { status: 500 },
    );
  }
}

// DELETE /api/ai/ingest?ref=...  — drop every chunk for a ref
export async function DELETE(req: Request) {
  const rl = await rateLimit({
    key: "ai-ingest-delete",
    limit: 30,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  const url = new URL(req.url);
  const ref = url.searchParams.get("ref");
  if (!ref) {
    return NextResponse.json({ error: "ref required" }, { status: 400 });
  }
  try {
    const result = await prisma.embedding.deleteMany({ where: { ref } });
    return NextResponse.json({ ok: true, deleted: result.count });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "DB error" },
      { status: 500 },
    );
  }
}
