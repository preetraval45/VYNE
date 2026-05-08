"use client";

// Settings → AI → Indexed documents (UI_UPGRADE_PLAN.md 2.4).
// Lists every embedding chunk grouped by `ref`, supports re-index +
// purge per ref, and ships a one-shot "ingest text" composer so admins
// can drop a snippet into the RAG store without leaving Settings.

import { useEffect, useState, useCallback } from "react";
import { Database, Trash2, Search, Upload, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface EmbeddingRow {
  id: string;
  ref: string;
  source: string;
  createdAt: string;
}

interface RefGroup {
  ref: string;
  source: string;
  chunkCount: number;
  lastIngestedAt: string;
}

function groupByRef(rows: EmbeddingRow[]): RefGroup[] {
  const map = new Map<string, RefGroup>();
  for (const row of rows) {
    const existing = map.get(row.ref);
    if (existing) {
      existing.chunkCount += 1;
      if (row.createdAt > existing.lastIngestedAt) {
        existing.lastIngestedAt = row.createdAt;
        if (row.source) existing.source = row.source;
      }
    } else {
      map.set(row.ref, {
        ref: row.ref,
        source: row.source,
        chunkCount: 1,
        lastIngestedAt: row.createdAt,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    b.lastIngestedAt.localeCompare(a.lastIngestedAt),
  );
}

export function RagDocumentsSettings() {
  const [groups, setGroups] = useState<RefGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [composer, setComposer] = useState({ ref: "", source: "", text: "" });
  const [ingesting, setIngesting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/ingest", { cache: "no-store" });
      if (!res.ok) throw new Error("fetch failed");
      const body = (await res.json()) as { embeddings?: EmbeddingRow[] };
      setGroups(groupByRef(body.embeddings ?? []));
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function purge(ref: string) {
    if (!confirm(`Permanently delete every chunk for "${ref}"?`)) return;
    const url = `/api/ai/ingest?ref=${encodeURIComponent(ref)}`;
    try {
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      const body = (await res.json()) as { deleted?: number };
      toast.success(
        `Removed ${body.deleted ?? 0} chunk${(body.deleted ?? 0) === 1 ? "" : "s"}`,
      );
      await load();
    } catch {
      toast.error("Couldn't delete — try again");
    }
  }

  async function ingest() {
    const ref = composer.ref.trim();
    const text = composer.text.trim();
    if (!ref || !text) {
      toast.error("Both ref and text are required");
      return;
    }
    setIngesting(true);
    try {
      const res = await fetch("/api/ai/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ref,
          source: composer.source.trim() || undefined,
          text,
          replace: true,
        }),
      });
      if (!res.ok) throw new Error("ingest failed");
      const body = (await res.json()) as {
        chunkCount?: number;
        created?: number;
      };
      toast.success(
        `Ingested ${body.created ?? 0}/${body.chunkCount ?? 0} chunks`,
      );
      setComposer({ ref: "", source: "", text: "" });
      await load();
    } catch {
      toast.error("Ingest failed — check the embeddings provider");
    } finally {
      setIngesting(false);
    }
  }

  const filtered = filter.trim()
    ? groups.filter(
        (g) =>
          g.ref.toLowerCase().includes(filter.toLowerCase()) ||
          g.source.toLowerCase().includes(filter.toLowerCase()),
      )
    : groups;

  const totalChunks = groups.reduce((s, g) => s + g.chunkCount, 0);

  return (
    <section
      aria-labelledby="rag-docs-heading"
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Database size={18} aria-hidden="true" />
        <h2 id="rag-docs-heading" style={{ margin: 0, fontSize: 16 }}>
          Indexed documents
        </h2>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 12,
            color: "var(--text-secondary)",
          }}
        >
          {groups.length} doc{groups.length === 1 ? "" : "s"} · {totalChunks}{" "}
          chunk{totalChunks === 1 ? "" : "s"}
        </span>
      </header>

      <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 13 }}>
        Documents indexed for RAG. Vyne AI cites these chunks when answering
        questions. Each <code>ref</code> is the canonical id (e.g.{" "}
        <code>doc:onboarding-2026</code>); chunks share an id so re-indexing
        replaces them in place.
      </p>

      {/* Composer */}
      <div
        style={{
          background: "var(--content-elevated)",
          border: "1px solid var(--content-border)",
          borderRadius: 8,
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <Upload size={13} aria-hidden="true" />
          Ingest text
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            value={composer.ref}
            onChange={(e) =>
              setComposer((c) => ({ ...c, ref: e.target.value }))
            }
            placeholder="ref (e.g. doc:onboarding-2026)"
            style={{
              flex: 1,
              minWidth: 200,
              padding: "6px 10px",
              fontSize: 13,
              border: "1px solid var(--content-border)",
              borderRadius: 6,
              background: "var(--content-bg)",
              color: "var(--text-primary)",
            }}
          />
          <input
            value={composer.source}
            onChange={(e) =>
              setComposer((c) => ({ ...c, source: e.target.value }))
            }
            placeholder="source (optional, e.g. handbook.md)"
            style={{
              flex: 1,
              minWidth: 200,
              padding: "6px 10px",
              fontSize: 13,
              border: "1px solid var(--content-border)",
              borderRadius: 6,
              background: "var(--content-bg)",
              color: "var(--text-primary)",
            }}
          />
        </div>
        <textarea
          value={composer.text}
          onChange={(e) => setComposer((c) => ({ ...c, text: e.target.value }))}
          placeholder="Paste the text. It'll be chunked + embedded + upserted (replaces existing chunks for this ref)."
          rows={4}
          style={{
            padding: "8px 10px",
            fontSize: 13,
            border: "1px solid var(--content-border)",
            borderRadius: 6,
            background: "var(--content-bg)",
            color: "var(--text-primary)",
            resize: "vertical",
          }}
        />
        <button
          type="button"
          onClick={ingest}
          disabled={ingesting || !composer.ref.trim() || !composer.text.trim()}
          style={{
            alignSelf: "flex-start",
            padding: "6px 14px",
            fontSize: 13,
            border: "1px solid var(--vyne-accent, var(--vyne-purple))",
            borderRadius: 6,
            background: "var(--vyne-accent, var(--vyne-purple))",
            color: "#fff",
            cursor: ingesting ? "wait" : "pointer",
            opacity:
              ingesting || !composer.ref.trim() || !composer.text.trim()
                ? 0.5
                : 1,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {ingesting ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Upload size={13} />
          )}
          Ingest
        </button>
      </div>

      {/* Filter */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          border: "1px solid var(--content-border)",
          borderRadius: 6,
          background: "var(--content-bg)",
        }}
      >
        <Search size={14} aria-hidden="true" color="var(--text-tertiary)" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by ref or source"
          style={{
            flex: 1,
            border: "none",
            background: "transparent",
            color: "var(--text-primary)",
            fontSize: 13,
            outline: "none",
          }}
          aria-label="Filter indexed documents"
        />
      </div>

      {/* List */}
      {loading ? (
        <div
          style={{ color: "var(--text-secondary)", fontSize: 13, padding: 12 }}
        >
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            border: "1px dashed var(--content-border)",
            borderRadius: 8,
            padding: 24,
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: 13,
          }}
        >
          {groups.length === 0
            ? "No documents indexed yet. Use the composer above to add one, or POST to /api/ai/ingest from any page."
            : "No matches for that filter."}
        </div>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {filtered.map((g) => (
            <li
              key={g.ref}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                background: "var(--content-elevated)",
                border: "1px solid var(--content-border)",
                borderRadius: 8,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--font-mono, ui-monospace, monospace)",
                    fontSize: 13,
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {g.ref}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {g.source || "—"} · {g.chunkCount} chunk
                  {g.chunkCount === 1 ? "" : "s"} · indexed{" "}
                  {new Date(g.lastIngestedAt).toLocaleDateString()}
                </div>
              </div>
              <button
                type="button"
                onClick={() => purge(g.ref)}
                aria-label={`Delete every chunk for ${g.ref}`}
                title="Delete every chunk for this ref"
                style={{
                  width: 32,
                  height: 32,
                  border: "1px solid var(--content-border)",
                  borderRadius: 6,
                  background: "transparent",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
