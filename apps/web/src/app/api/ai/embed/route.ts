import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/security";

/**
 * POST /api/ai/embed
 * Body: { text: string; model?: "openai" | "voyage" }
 *
 * RAG embeddings endpoint (28.2.4). Routes to OpenAI's
 * `text-embedding-3-small` (1536-dim) or Voyage AI's `voyage-3` based
 * on `EMBED_PROVIDER` env. Returns `{ vector: number[], model, dim }`.
 *
 * Demo mode (no key): returns a deterministic 384-dim hash vector so
 * the end-to-end pipeline is testable offline. Real deploys swap the
 * provider env var to flip on real semantic recall.
 */

export const runtime = "edge";

interface Body {
  text?: string;
  model?: "openai" | "voyage";
}

async function embedOpenAi(text: string): Promise<number[] | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text.slice(0, 8000),
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      data?: Array<{ embedding?: number[] }>;
    };
    return data.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

async function embedVoyage(text: string): Promise<number[] | null> {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "voyage-3",
        input: text.slice(0, 8000),
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      data?: Array<{ embedding?: number[] }>;
    };
    return data.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

function localHashVector(text: string): number[] {
  const dim = 384;
  const out = new Array<number>(dim).fill(0);
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
  for (const tok of tokens) {
    let h = 5381;
    for (let i = 0; i < tok.length; i++) h = (h * 33 + tok.charCodeAt(i)) | 0;
    const idx = (h >>> 0) % dim;
    out[idx] += 1;
  }
  let mag = 0;
  for (const v of out) mag += v * v;
  mag = Math.sqrt(mag);
  if (mag === 0) return out;
  for (let i = 0; i < out.length; i++) out[i] /= mag;
  return out;
}

export async function POST(req: Request) {
  const rl = await rateLimit({
    key: "ai-embed",
    limit: 200,
    windowSec: 60,
    req,
  });
  if (!rl.ok) return rl.response!;

  const body = (await req.json().catch(() => ({}))) as Body;
  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json(
      { ok: false, error: "missing text" },
      { status: 400 },
    );
  }
  const provider = body.model ?? (process.env.EMBED_PROVIDER as "openai" | "voyage" | undefined);
  let vector: number[] | null = null;
  let modelLabel: string;
  if (provider === "voyage") {
    vector = await embedVoyage(text);
    modelLabel = "voyage-3";
  } else if (provider === "openai") {
    vector = await embedOpenAi(text);
    modelLabel = "text-embedding-3-small";
  } else {
    // Try OpenAI first, then Voyage, then fall back.
    vector = (await embedOpenAi(text)) ?? (await embedVoyage(text));
    modelLabel = vector ? "auto" : "local-hash";
  }
  if (!vector) {
    vector = localHashVector(text);
    modelLabel = "local-hash";
  }
  return NextResponse.json({
    ok: true,
    vector,
    model: modelLabel,
    dim: vector.length,
  });
}
