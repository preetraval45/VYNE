"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Vector embeddings store for RAG (28.2.4).
 *
 *   await indexAttachment({ id, name, mime, text });
 *   const hits = await queryEmbeddings("how do we handle refunds?");
 *
 * Production swaps the in-browser cosine search for pgvector;
 * the read API stays the same so call sites don't change. Vectors
 * live in localStorage so they survive a refresh — capped at 200
 * documents to keep the blob under ~5 MB at 768-dim float32.
 *
 * `EMBED_PROVIDER` selects between OpenAI and Voyage at the API
 * route layer (`/api/ai/embed`). Until that lands, the helper falls
 * back to a deterministic hashed-bag-of-tokens vector so the
 * end-to-end flow is testable offline.
 */

export interface EmbeddingDoc {
  id: string;
  /** Source ref — `attachment:abc / doc:def / message:ghi`. */
  ref: string;
  /** Display label. */
  title: string;
  /** Original snippet, capped to 1.2 kB. */
  snippet: string;
  /** Vector — 384 / 768 / 1024-dim float32 array. */
  vector: number[];
  /** Module / source for filtering. */
  module?: string;
  /** ISO. */
  indexedAt: string;
}

interface EmbeddingsStore {
  docs: EmbeddingDoc[];
  upsert: (doc: Omit<EmbeddingDoc, "indexedAt">) => EmbeddingDoc;
  removeByRef: (ref: string) => void;
  clear: () => void;
  /** k-NN cosine search. */
  search: (
    queryVector: number[],
    opts?: { k?: number; module?: string },
  ) => Array<{ doc: EmbeddingDoc; score: number }>;
  /** True when the store has any indexed doc — drives "indexing…" UI. */
  hasIndex: () => boolean;
}

const MAX_DOCS = 200;

export const useEmbeddings = create<EmbeddingsStore>()(
  persist(
    (set, get) => ({
      docs: [],
      upsert: (doc) => {
        const row: EmbeddingDoc = {
          ...doc,
          indexedAt: new Date().toISOString(),
        };
        set((s) => {
          const filtered = s.docs.filter((d) => d.id !== doc.id);
          return { docs: [row, ...filtered].slice(0, MAX_DOCS) };
        });
        return row;
      },
      removeByRef: (ref) =>
        set((s) => ({ docs: s.docs.filter((d) => d.ref !== ref) })),
      clear: () => set({ docs: [] }),
      search: (queryVector, opts = {}) => {
        const k = opts.k ?? 8;
        const docs = opts.module
          ? get().docs.filter((d) => d.module === opts.module)
          : get().docs;
        const scored = docs.map((doc) => ({
          doc,
          score: cosineSim(doc.vector, queryVector),
        }));
        return scored
          .sort((a, b) => b.score - a.score)
          .slice(0, k)
          .filter((s) => s.score > 0.05);
      },
      hasIndex: () => get().docs.length > 0,
    }),
    { name: "vyne-embeddings", version: 1 },
  ),
);

function cosineSim(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let aMag = 0;
  let bMag = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    aMag += a[i] * a[i];
    bMag += b[i] * b[i];
  }
  const mag = Math.sqrt(aMag) * Math.sqrt(bMag);
  return mag === 0 ? 0 : dot / mag;
}

/**
 * Embed a chunk of text. Calls `/api/ai/embed`; on failure falls back
 * to a deterministic hashed-bag-of-tokens vector so the dev / offline
 * path still runs. Production endpoint should switch to OpenAI /
 * Voyage / Cohere with caching keyed on `(model, sha256(text))`.
 */
export async function embedText(text: string): Promise<number[]> {
  if (typeof window === "undefined" || !text) return [];
  try {
    const res = await fetch("/api/ai/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 8000) }),
    });
    if (res.ok) {
      const data = (await res.json()) as { vector?: number[] };
      if (Array.isArray(data.vector) && data.vector.length > 0) {
        return data.vector;
      }
    }
  } catch {
    // ignore — fall back to local hash
  }
  return localHashVector(text);
}

/** 384-dim deterministic hash bag-of-tokens vector. Cheap; only used
 *  when the real embed endpoint is unreachable. */
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
    const idx = ((h >>> 0) % dim);
    out[idx] += 1;
  }
  // L2 normalise
  let mag = 0;
  for (const v of out) mag += v * v;
  mag = Math.sqrt(mag);
  if (mag === 0) return out;
  for (let i = 0; i < out.length; i++) out[i] /= mag;
  return out;
}

/**
 * Convenience: embed `text` then search the local index. Used by
 * `/api/ai/search` when the caller wants RAG retrieval mixed in.
 */
export async function queryEmbeddings(
  text: string,
  opts?: { k?: number; module?: string },
): Promise<Array<{ doc: EmbeddingDoc; score: number }>> {
  const vector = await embedText(text);
  if (vector.length === 0) return [];
  return useEmbeddings.getState().search(vector, opts);
}
