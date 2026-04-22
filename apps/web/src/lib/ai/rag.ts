/**
 * RAG (retrieval-augmented generation) scaffolding for VYNE.
 *
 * STATUS: scaffolded, not yet runnable. Requires:
 *   - DATABASE_URL (Postgres + pgvector OR Qdrant URL + key)
 *   - VYNE_EMBEDDINGS_PROVIDER ("openai" | "voyage") + matching API key
 *
 * The vector store and embeddings provider are abstracted behind two
 * small interfaces so we can swap pgvector ↔ Qdrant ↔ Pinecone without
 * touching the rest of the app.
 *
 * Why not just call this code now? Because:
 *   - vercel free tier doesn't ship Postgres
 *   - we don't want to silently send VYNE data to OpenAI without an
 *     explicit provider choice in env
 *   - the demo workspace is local-only (Zustand) so there's no
 *     authoritative source to embed yet
 *
 * When you're ready to flip it on:
 *   1. Provision a Vercel Postgres or Qdrant Cloud (free) instance
 *   2. Set DATABASE_URL + VYNE_EMBEDDINGS_PROVIDER + the embeddings key
 *   3. Run a one-shot backfill script to embed everything in the
 *      Zustand stores OR start indexing as records mutate (see
 *      indexEntity below)
 *   4. Swap any AI route from "no context" to "rag.retrieve(query, 8)"
 */

export interface VectorRecord {
  /** Stable id like "deal:d-abc123" or "task:t-xyz789". */
  id: string;
  /** Pre-computed embedding vector (length depends on provider). */
  vector: number[];
  /** The original text that was embedded — used for prompt-stuffing. */
  text: string;
  /** Free-form metadata for filtering during retrieval. */
  metadata: Record<string, string | number | boolean>;
}

export interface RetrievalHit {
  id: string;
  text: string;
  score: number;
  metadata: Record<string, string | number | boolean>;
}

/* ── Vector-store interface ──────────────────────────────────────── */

export interface VectorStore {
  /** Upsert one or more records by id. */
  upsert(records: VectorRecord[]): Promise<void>;
  /** Delete by ids. */
  remove(ids: string[]): Promise<void>;
  /** Top-k cosine similarity search. */
  query(
    vector: number[],
    k: number,
    filter?: Partial<Record<string, string | number | boolean>>,
  ): Promise<RetrievalHit[]>;
}

/* ── Embeddings provider interface ───────────────────────────────── */

export interface EmbeddingsProvider {
  /** Embed a batch of strings; returns one vector per input. */
  embed(texts: string[]): Promise<number[][]>;
  /** Vector dimensionality (used at index-create time). */
  dim: number;
}

/* ── Concrete adapters (stubs — implement once infra is provisioned) */

/**
 * Vercel Postgres + pgvector implementation.
 *
 * Schema (run once after enabling pgvector):
 *
 *   CREATE EXTENSION IF NOT EXISTS vector;
 *   CREATE TABLE IF NOT EXISTS vyne_vectors (
 *     id          text PRIMARY KEY,
 *     embedding   vector(1536) NOT NULL,
 *     text        text NOT NULL,
 *     metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
 *     created_at  timestamptz NOT NULL DEFAULT now()
 *   );
 *   CREATE INDEX IF NOT EXISTS vyne_vectors_embedding_idx
 *     ON vyne_vectors USING ivfflat (embedding vector_cosine_ops)
 *     WITH (lists = 100);
 *   CREATE INDEX IF NOT EXISTS vyne_vectors_meta_idx
 *     ON vyne_vectors USING gin (metadata);
 */
class PgVectorStore implements VectorStore {
  // We import lazily so the route can still build without
  // @vercel/postgres installed — and so route handlers without RAG
  // don't pay the bundle cost.
  private async sql() {
    const mod = await import("@vercel/postgres").catch(() => null);
    if (!mod) {
      throw new Error(
        "RAG: install @vercel/postgres (`npm i @vercel/postgres`) to enable the pgvector adapter.",
      );
    }
    return mod.sql;
  }

  async upsert(records: VectorRecord[]): Promise<void> {
    if (records.length === 0) return;
    const sql = await this.sql();
    // Postgres can't bulk-upsert vector arrays via simple parameterised
    // arrays cleanly, so loop. Acceptable: writes happen on entity
    // mutate, not per-request.
    for (const r of records) {
      const vec = `[${r.vector.join(",")}]`;
      await sql/* sql */ `
        INSERT INTO vyne_vectors (id, embedding, text, metadata)
        VALUES (${r.id}, ${vec}::vector, ${r.text}, ${JSON.stringify(r.metadata)}::jsonb)
        ON CONFLICT (id) DO UPDATE SET
          embedding = EXCLUDED.embedding,
          text = EXCLUDED.text,
          metadata = EXCLUDED.metadata
      `;
    }
  }

  async remove(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const sql = await this.sql();
    await sql/* sql */ `DELETE FROM vyne_vectors WHERE id = ANY(${ids}::text[])`;
  }

  async query(
    vector: number[],
    k: number,
    filter?: Partial<Record<string, string | number | boolean>>,
  ): Promise<RetrievalHit[]> {
    const sql = await this.sql();
    const vec = `[${vector.join(",")}]`;
    const filterJson = JSON.stringify(filter ?? {});
    const rows = await sql/* sql */ `
      SELECT id, text, metadata,
             1 - (embedding <=> ${vec}::vector) AS score
      FROM vyne_vectors
      WHERE metadata @> ${filterJson}::jsonb
      ORDER BY embedding <=> ${vec}::vector
      LIMIT ${k}
    `;
    return (rows.rows as Array<{
      id: string;
      text: string;
      metadata: Record<string, string | number | boolean>;
      score: number;
    }>).map((r) => ({
      id: r.id,
      text: r.text,
      metadata: r.metadata,
      score: r.score,
    }));
  }
}

class QdrantStore implements VectorStore {
  constructor(private url: string, private apiKey: string) {}
  async upsert(_records: VectorRecord[]): Promise<void> {
    throw new Error("qdrant adapter not implemented yet");
  }
  async remove(_ids: string[]): Promise<void> {
    throw new Error("qdrant adapter not implemented yet");
  }
  async query(
    _vector: number[],
    _k: number,
    _filter?: Partial<Record<string, string | number | boolean>>,
  ): Promise<RetrievalHit[]> {
    throw new Error("qdrant adapter not implemented yet");
  }
}

class OpenAIEmbeddings implements EmbeddingsProvider {
  constructor(private apiKey: string) {}
  dim = 1536; // text-embedding-3-small

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: texts,
      }),
    });
    if (!res.ok) {
      throw new Error(
        `OpenAI embeddings request failed: ${res.status} ${await res.text()}`,
      );
    }
    const json = (await res.json()) as {
      data: Array<{ embedding: number[]; index: number }>;
    };
    // Sort by `index` so order matches the input array.
    return json.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
  }
}

class VoyageEmbeddings implements EmbeddingsProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(private apiKey: string) {}
  dim = 1024; // voyage-3
  async embed(_texts: string[]): Promise<number[][]> {
    throw new Error("voyage embeddings adapter not implemented yet");
  }
}

/* ── Lazy singletons ─────────────────────────────────────────────── */

let _store: VectorStore | null = null;
let _embed: EmbeddingsProvider | null = null;

function getStore(): VectorStore {
  if (_store) return _store;
  const url = process.env.DATABASE_URL;
  const qdrantUrl = process.env.QDRANT_URL;
  const qdrantKey = process.env.QDRANT_API_KEY;
  if (qdrantUrl && qdrantKey) {
    _store = new QdrantStore(qdrantUrl, qdrantKey);
    return _store;
  }
  if (url) {
    _store = new PgVectorStore(url);
    return _store;
  }
  throw new Error(
    "RAG not configured. Set DATABASE_URL (pgvector) or QDRANT_URL + QDRANT_API_KEY.",
  );
}

function getEmbeddings(): EmbeddingsProvider {
  if (_embed) return _embed;
  const provider = process.env.VYNE_EMBEDDINGS_PROVIDER;
  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    _embed = new OpenAIEmbeddings(process.env.OPENAI_API_KEY);
    return _embed;
  }
  if (provider === "voyage" && process.env.VOYAGE_API_KEY) {
    _embed = new VoyageEmbeddings(process.env.VOYAGE_API_KEY);
    return _embed;
  }
  throw new Error(
    'Embeddings not configured. Set VYNE_EMBEDDINGS_PROVIDER=openai|voyage and the matching API key.',
  );
}

/* ── Public API ──────────────────────────────────────────────────── */

export type IndexableEntity =
  | { kind: "project"; id: string; name: string; description?: string; orgId: string }
  | { kind: "task"; id: string; title: string; description?: string; orgId: string; projectId: string }
  | { kind: "deal"; id: string; company: string; notes?: string; stage: string; orgId: string }
  | { kind: "contact"; id: string; name: string; title?: string; company?: string; email?: string; orgId: string }
  | { kind: "doc"; id: string; title: string; body: string; orgId: string }
  | { kind: "message"; id: string; body: string; channelId: string; authorName: string; orgId: string };

/** Convert an entity into the text we want embedded + filterable
 *  metadata. Org id is always included so retrieval can never leak
 *  across tenants. */
function entityToVector(e: IndexableEntity): {
  id: string;
  text: string;
  metadata: Record<string, string | number | boolean>;
} {
  const id = `${e.kind}:${e.id}`;
  const orgFilter = { orgId: e.orgId, kind: e.kind };
  switch (e.kind) {
    case "project":
      return {
        id,
        text: `Project: ${e.name}\n${e.description ?? ""}`.trim(),
        metadata: { ...orgFilter, name: e.name },
      };
    case "task":
      return {
        id,
        text: `Task: ${e.title}\n${e.description ?? ""}`.trim(),
        metadata: { ...orgFilter, title: e.title, projectId: e.projectId },
      };
    case "deal":
      return {
        id,
        text: `Deal with ${e.company} — ${e.stage}\n${e.notes ?? ""}`.trim(),
        metadata: { ...orgFilter, company: e.company, stage: e.stage },
      };
    case "contact":
      return {
        id,
        text: `${e.name}${e.title ? ` (${e.title})` : ""}${e.company ? ` at ${e.company}` : ""}${e.email ? ` — ${e.email}` : ""}`,
        metadata: {
          ...orgFilter,
          name: e.name,
          ...(e.email ? { email: e.email } : {}),
        },
      };
    case "doc":
      return {
        id,
        text: `Doc: ${e.title}\n${e.body}`,
        metadata: { ...orgFilter, title: e.title },
      };
    case "message":
      return {
        id,
        text: `${e.authorName}: ${e.body}`,
        metadata: { ...orgFilter, channelId: e.channelId },
      };
  }
}

/** Index (or re-index) a single entity. Call from your store update
 *  paths once RAG is wired up. */
export async function indexEntity(entity: IndexableEntity): Promise<void> {
  const { id, text, metadata } = entityToVector(entity);
  const [vector] = await getEmbeddings().embed([text]);
  await getStore().upsert([{ id, vector, text, metadata }]);
}

/** Retrieve the top-k most relevant context snippets for a query,
 *  scoped to a single org (hard tenant boundary). */
export async function retrieve(
  query: string,
  k: number,
  orgId: string,
  kindFilter?: IndexableEntity["kind"],
): Promise<RetrievalHit[]> {
  const [vector] = await getEmbeddings().embed([query]);
  const filter: Partial<Record<string, string | number | boolean>> = { orgId };
  if (kindFilter) filter.kind = kindFilter;
  return getStore().query(vector, k, filter);
}

/** Format hits as a system-prompt context block. Useful for stuffing
 *  into the agent or any AI route. */
export function formatHitsAsContext(hits: RetrievalHit[]): string {
  if (hits.length === 0) return "";
  const blocks = hits.map(
    (h, i) => `[${i + 1}] ${h.id} (score ${h.score.toFixed(2)})\n${h.text}`,
  );
  return `## Workspace context\n\n${blocks.join("\n\n")}`;
}

/** Quick check used by routes / UI to decide whether to offer RAG. */
export function isRagConfigured(): boolean {
  const hasStore =
    Boolean(process.env.DATABASE_URL) ||
    (Boolean(process.env.QDRANT_URL) && Boolean(process.env.QDRANT_API_KEY));
  const hasEmbeddings =
    (process.env.VYNE_EMBEDDINGS_PROVIDER === "openai" && Boolean(process.env.OPENAI_API_KEY)) ||
    (process.env.VYNE_EMBEDDINGS_PROVIDER === "voyage" && Boolean(process.env.VOYAGE_API_KEY));
  return hasStore && hasEmbeddings;
}
