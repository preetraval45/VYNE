// Helpers for the end-to-end RAG pipeline. Server-side only — touches
// Prisma + raises chunk text out of files. Client surfaces (upload
// UI, citation chips) talk to /api/ai/ingest + /api/ai/retrieve.

const CHUNK_CHARS = 2400; // ~600 tokens
const CHUNK_OVERLAP = 240; // ~60 tokens

/** Split a long string into overlapping chunks. Boundary-aware on
 * whitespace so we don't slice mid-word. */
export function chunkText(text: string): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= CHUNK_CHARS) return cleaned ? [cleaned] : [];

  const chunks: string[] = [];
  let i = 0;
  while (i < cleaned.length) {
    const end = Math.min(i + CHUNK_CHARS, cleaned.length);
    let slice = cleaned.slice(i, end);
    // Snap the right edge back to whitespace if we're not at EOF, so
    // chunks don't slice mid-word.
    if (end < cleaned.length) {
      const lastSpace = slice.lastIndexOf(" ");
      if (lastSpace > CHUNK_CHARS - 200) {
        slice = slice.slice(0, lastSpace);
      }
    }
    chunks.push(slice);
    if (end >= cleaned.length) break;
    i += slice.length - CHUNK_OVERLAP;
    if (i <= 0) i = end;
  }
  return chunks;
}

/** Cosine similarity on two equal-length number arrays. Returns NaN if
 * lengths mismatch or either vector is zero — caller filters. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return NaN;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return NaN;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/** Score every embedding row in `rows` against the query vector and
 * return the top K with text + similarity. */
export interface ScoredHit {
  id: string;
  ref: string;
  source: string;
  text: string;
  score: number;
  meta?: unknown;
}

export function rankByVector(
  rows: Array<{
    id: string;
    ref: string;
    source: string;
    text: string;
    vector: unknown;
    meta?: unknown;
  }>,
  query: number[],
  k = 6,
): ScoredHit[] {
  const scored: ScoredHit[] = [];
  for (const r of rows) {
    let v: number[] | null = null;
    if (Array.isArray(r.vector)) {
      v = r.vector as number[];
    } else if (typeof r.vector === "string") {
      try {
        v = JSON.parse(r.vector) as number[];
      } catch {
        v = null;
      }
    }
    if (!v) continue;
    const score = cosineSimilarity(query, v);
    if (Number.isNaN(score)) continue;
    scored.push({
      id: r.id,
      ref: r.ref,
      source: r.source,
      text: r.text,
      meta: r.meta,
      score,
    });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}
