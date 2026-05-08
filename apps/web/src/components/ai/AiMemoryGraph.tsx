"use client";

// Cross-conversation memory graph (UI_UPGRADE_PLAN.md 2.5).
// Visualises every persistent memory fact as a node, with edges
// connecting facts that share keyword tokens. The user can prune
// facts inline; the graph re-layouts on the next render. Uses the
// existing <NetworkGraph> primitive — no extra deps.

import { useMemo, useState } from "react";
import { Trash2, Plus, Sparkles } from "lucide-react";
import {
  useAiMemoryStore,
  type MemoryFact,
} from "@/lib/stores/aiMemory";
import {
  NetworkGraph,
  type NetworkEdge,
  type NetworkNode,
} from "@/components/shared/NetworkGraph";

const STOPWORDS = new Set([
  "the",
  "and",
  "are",
  "for",
  "with",
  "from",
  "that",
  "this",
  "have",
  "has",
  "was",
  "were",
  "but",
  "not",
  "you",
  "your",
  "our",
  "we",
  "they",
  "their",
  "his",
  "her",
  "its",
  "use",
  "uses",
  "using",
]);

/** Pull keyword tokens out of a fact: lowercase, ≥4 chars, not in
 * stopword list. Used to derive the edge graph. */
function keywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 4 && !STOPWORDS.has(t)),
  );
}

/** Pair up facts that share ≥1 keyword. Edge weight = jaccard
 * similarity on the keyword sets. Symmetric, no self-loops. */
function deriveEdges(facts: MemoryFact[]): NetworkEdge[] {
  const tokens = facts.map((f) => keywords(f.text));
  const out: NetworkEdge[] = [];
  for (let i = 0; i < facts.length; i++) {
    for (let j = i + 1; j < facts.length; j++) {
      const a = tokens[i];
      const b = tokens[j];
      if (a.size === 0 || b.size === 0) continue;
      let inter = 0;
      for (const t of a) if (b.has(t)) inter++;
      if (inter === 0) continue;
      const union = a.size + b.size - inter;
      const weight = Math.min(1, Math.max(0.15, inter / union));
      out.push({ a: facts[i].id, b: facts[j].id, weight });
    }
  }
  return out;
}

function shortLabel(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= 28) return trimmed;
  return `${trimmed.slice(0, 26)}…`;
}

export function AiMemoryGraph() {
  const facts = useAiMemoryStore((s) => s.facts);
  const addFact = useAiMemoryStore((s) => s.addFact);
  const removeFact = useAiMemoryStore((s) => s.removeFact);
  const clearAll = useAiMemoryStore((s) => s.clearAll);

  const [draft, setDraft] = useState("");

  const { nodes, edges } = useMemo(() => {
    const ns: NetworkNode[] = facts.map((f) => ({
      id: f.id,
      label: shortLabel(f.text),
      type: "fact",
    }));
    const es = deriveEdges(facts);
    return { nodes: ns, edges: es };
  }, [facts]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    addFact(text);
    setDraft("");
  };

  return (
    <section
      aria-labelledby="ai-memory-graph-heading"
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Sparkles size={16} aria-hidden="true" />
        <h3 id="ai-memory-graph-heading" style={{ margin: 0, fontSize: 14 }}>
          Memory graph
        </h3>
        <span
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            marginLeft: 6,
          }}
        >
          {facts.length} fact{facts.length === 1 ? "" : "s"} ·{" "}
          {edges.length} link{edges.length === 1 ? "" : "s"}
        </span>
        {facts.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (confirm("Clear every memory fact? This cannot be undone."))
                clearAll();
            }}
            style={{
              marginLeft: "auto",
              fontSize: 11,
              padding: "4px 8px",
              border: "1px solid var(--content-border)",
              borderRadius: 6,
              background: "transparent",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            Forget all
          </button>
        )}
      </header>

      <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>
        Persistent facts Vyne AI references on every reply. Edges connect
        facts that share keywords so you can spot related memories.
      </p>

      {/* Composer */}
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: 6,
          border: "1px solid var(--content-border)",
          borderRadius: 8,
          background: "var(--content-bg)",
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder='e.g. "We use Postgres, not MySQL"'
          aria-label="Add a memory fact"
          style={{
            flex: 1,
            border: "none",
            background: "transparent",
            color: "var(--text-primary)",
            fontSize: 13,
            padding: "4px 6px",
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!draft.trim()}
          aria-label="Add memory fact"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 10px",
            fontSize: 12,
            border: "1px solid var(--vyne-accent, var(--vyne-purple))",
            borderRadius: 6,
            background: "var(--vyne-accent, var(--vyne-purple))",
            color: "#fff",
            cursor: draft.trim() ? "pointer" : "not-allowed",
            opacity: draft.trim() ? 1 : 0.5,
          }}
        >
          <Plus size={12} />
          Add
        </button>
      </div>

      {/* Graph */}
      {nodes.length > 0 ? (
        <div
          style={{
            border: "1px solid var(--content-border)",
            borderRadius: 8,
            padding: 8,
            background: "var(--content-bg)",
            overflow: "hidden",
          }}
        >
          <NetworkGraph
            nodes={nodes}
            edges={edges}
            width={520}
            height={Math.max(220, Math.min(400, 60 + nodes.length * 18))}
          />
        </div>
      ) : (
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
          No memories yet. Add a fact above and the AI will remember it on
          every future reply.
        </div>
      )}

      {/* Editable list */}
      {facts.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {facts.map((f) => (
            <li
              key={f.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                background: "var(--content-elevated)",
                border: "1px solid var(--content-border)",
                borderRadius: 6,
              }}
            >
              <div
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: "var(--text-primary)",
                }}
              >
                {f.text}
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  whiteSpace: "nowrap",
                }}
              >
                {new Date(f.createdAt).toLocaleDateString()}
              </span>
              <button
                type="button"
                onClick={() => removeFact(f.id)}
                aria-label={`Forget: ${f.text}`}
                title="Forget this fact"
                style={{
                  width: 26,
                  height: 26,
                  border: "1px solid var(--content-border)",
                  borderRadius: 5,
                  background: "transparent",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
