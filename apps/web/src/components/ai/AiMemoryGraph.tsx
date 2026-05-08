"use client";

// Cross-conversation memory graph (UI_UPGRADE_PLAN.md 2.5).
// Visualises every persistent memory fact as a node, with edges
// connecting facts that share keyword tokens. The user can prune
// facts inline; the graph re-layouts on the next render. Uses the
// existing <NetworkGraph> primitive — no extra deps.

import { useMemo, useState } from "react";
import {
  Trash2,
  Plus,
  Sparkles,
  Wand2,
  Search as SearchIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  useAiMemoryStore,
  type MemoryFact,
  type Session,
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

/** Mine first-person + team-pronoun statements from past sessions for
 *  candidate memories. The bar is "this looks like a durable preference
 *  the user stated" — heuristic but quiet enough to be useful. */
function mineMemoryCandidates(sessions: Session[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of sessions) {
    const text = (s.question ?? "").trim();
    if (!text || text.length < 12 || text.length > 240) continue;
    // First-person preference statements only.
    if (
      !/\b(i prefer|i (?:always|never|usually) |we use|we don't|our team |our company |we are |we always|we never)/i.test(
        text,
      )
    ) {
      continue;
    }
    // Skip "?" — questions, not statements.
    if (text.includes("?")) continue;
    const norm = text.toLowerCase();
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(text);
    if (out.length >= 12) break;
  }
  return out;
}

export function AiMemoryGraph() {
  const facts = useAiMemoryStore((s) => s.facts);
  const sessions = useAiMemoryStore((s) => s.sessions);
  const addFact = useAiMemoryStore((s) => s.addFact);
  const removeFact = useAiMemoryStore((s) => s.removeFact);
  const clearAll = useAiMemoryStore((s) => s.clearAll);

  const [draft, setDraft] = useState("");
  const [forgetTopic, setForgetTopic] = useState("");
  const [showImport, setShowImport] = useState(false);

  const candidates = useMemo(
    () => mineMemoryCandidates(sessions),
    [sessions],
  );
  // Filter out candidates already in facts (case-insensitive).
  const factsLower = useMemo(
    () => new Set(facts.map((f) => f.text.toLowerCase().trim())),
    [facts],
  );
  const newCandidates = candidates.filter(
    (c) => !factsLower.has(c.toLowerCase().trim()),
  );

  function forgetByTopic() {
    const topic = forgetTopic.trim().toLowerCase();
    if (!topic) return;
    const tokens = topic.split(/\s+/).filter((t) => t.length >= 3);
    if (tokens.length === 0) {
      toast.error("Topic too short — try at least one 3+ char word.");
      return;
    }
    const matched = facts.filter((f) => {
      const txt = f.text.toLowerCase();
      return tokens.some((t) => txt.includes(t));
    });
    if (matched.length === 0) {
      toast(`No memories match "${forgetTopic.trim()}"`);
      return;
    }
    if (
      !confirm(
        `Forget ${matched.length} memor${matched.length === 1 ? "y" : "ies"} about "${forgetTopic.trim()}"?`,
      )
    ) {
      return;
    }
    for (const m of matched) removeFact(m.id);
    toast.success(
      `Forgot ${matched.length} memor${matched.length === 1 ? "y" : "ies"}`,
    );
    setForgetTopic("");
  }

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

      {/* Forget-by-topic + import-from-conversations (UI_UPGRADE_PLAN.md 5.8) */}
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 4,
            flex: 1,
            minWidth: 220,
            border: "1px solid var(--content-border)",
            borderRadius: 6,
            padding: "2px 4px 2px 8px",
            background: "var(--content-bg)",
            alignItems: "center",
          }}
        >
          <SearchIcon
            size={12}
            aria-hidden="true"
            color="var(--text-tertiary)"
          />
          <input
            value={forgetTopic}
            onChange={(e) => setForgetTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                forgetByTopic();
              }
            }}
            placeholder="Forget topic (e.g. salary, postgres)"
            aria-label="Forget memories about a topic"
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              color: "var(--text-primary)",
              fontSize: 12,
              padding: "4px 6px",
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={forgetByTopic}
            disabled={!forgetTopic.trim() || facts.length === 0}
            style={{
              padding: "3px 10px",
              fontSize: 11,
              border: "1px solid var(--content-border)",
              borderRadius: 4,
              background: "transparent",
              color: "var(--text-secondary)",
              cursor:
                forgetTopic.trim() && facts.length > 0 ? "pointer" : "not-allowed",
              opacity: forgetTopic.trim() && facts.length > 0 ? 1 : 0.5,
            }}
          >
            Forget
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowImport((v) => !v)}
          disabled={newCandidates.length === 0}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "6px 10px",
            fontSize: 12,
            border: "1px solid var(--content-border)",
            borderRadius: 6,
            background: showImport
              ? "var(--vyne-accent-soft, var(--content-elevated))"
              : "transparent",
            color: "var(--text-primary)",
            cursor: newCandidates.length > 0 ? "pointer" : "not-allowed",
            opacity: newCandidates.length > 0 ? 1 : 0.5,
          }}
        >
          <Wand2 size={12} />
          Import {newCandidates.length > 0 ? `(${newCandidates.length})` : ""}
        </button>
      </div>

      {showImport && newCandidates.length > 0 && (
        <div
          style={{
            background: "var(--content-elevated)",
            border: "1px solid var(--content-border)",
            borderRadius: 6,
            padding: 8,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              padding: "0 4px",
            }}
          >
            Suggestions mined from past conversations. Click any to add.
          </span>
          {newCandidates.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                addFact(c);
                toast.success("Added memory");
              }}
              style={{
                textAlign: "left",
                padding: "5px 8px",
                fontSize: 12,
                border: "1px solid var(--content-border)",
                borderRadius: 4,
                background: "var(--content-bg)",
                color: "var(--text-primary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Plus
                size={11}
                aria-hidden="true"
                color="var(--vyne-accent, var(--vyne-purple))"
              />
              <span style={{ flex: 1 }}>{c}</span>
            </button>
          ))}
        </div>
      )}

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
