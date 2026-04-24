"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Brain,
  Compass as CompassIcon,
  Flame,
  History,
  Loader2,
  Search,
  Send,
  Sparkles,
  Sunrise,
} from "lucide-react";
import { collectVyneContext, resolveCitationHref } from "@/lib/ai/vyne-context";
import {
  computeStreak,
  isCompassFresh,
  useAiMemoryStore,
  type Session,
} from "@/lib/stores/aiMemory";

// Vyne AI workspace-grounded mentor — morning brief + chat + compass +
// archive search + streak. All answers ground on live stores; all
// conversations are persisted so the product gets more valuable the
// longer you use it.

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Array<{ kind: string; id: string; label: string }>;
}

const STARTER_QUESTIONS = [
  "Which of my projects are at risk right now?",
  "Which tasks are overdue and who owns them?",
  "Summarise my open CRM deals by stage and total value.",
  "What inventory items are low on stock?",
  "What should I focus on tomorrow, based on my workspace?",
];

export default function VyneAIChatPage() {
  const sessions = useAiMemoryStore((s) => s.sessions);
  const briefs = useAiMemoryStore((s) => s.briefs);
  const compass = useAiMemoryStore((s) => s.compass);
  const addSession = useAiMemoryStore((s) => s.addSession);
  const addBrief = useAiMemoryStore((s) => s.addBrief);
  const setCompass = useAiMemoryStore((s) => s.setCompass);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [briefLoading, setBriefLoading] = useState(false);
  const [compassDraft, setCompassDraft] = useState("");
  const [editingCompass, setEditingCompass] = useState(false);
  const [archiveQuery, setArchiveQuery] = useState("");
  const [archiveHits, setArchiveHits] = useState<
    Array<{ id: string; createdAt: string; snippet: string; reason: string }> | null
  >(null);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const streak = useMemo(
    () => computeStreak({ sessions, briefs }),
    [sessions, briefs],
  );
  const todaysBrief = useMemo(() => {
    const today = new Date().toDateString();
    return briefs.find((b) => new Date(b.createdAt).toDateString() === today);
  }, [briefs]);
  const compassFresh = isCompassFresh(compass);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const ask = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || pending) return;
      const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: trimmed };
      setMessages((m) => [...m, userMsg]);
      setInput("");
      setPending(true);

      const history = messages
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      try {
        const context = collectVyneContext();
        const res = await fetch("/api/ai/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: trimmed, context, history }),
        });
        const data = (await res.json()) as {
          answer: string;
          citations?: Array<{ kind: string; id: string; label: string }>;
        };
        const reply = data.answer ?? "Vyne AI didn't reply — please try again.";
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: reply,
            citations: data.citations,
          },
        ]);
        addSession({
          question: trimmed,
          answer: reply,
          citations: data.citations,
        });
      } catch {
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              "I couldn't reach the Vyne AI service. Check your connection and try again.",
          },
        ]);
      } finally {
        setPending(false);
        inputRef.current?.focus();
      }
    },
    [messages, pending, addSession],
  );

  const generateBrief = useCallback(async () => {
    setBriefLoading(true);
    try {
      const context = collectVyneContext();
      const recentSessions = sessions.slice(0, 6).map((s) => ({
        createdAt: s.createdAt,
        question: s.question,
        answer: s.answer,
      }));
      const res = await fetch("/api/ai/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          recentSessions,
          compass: compassFresh ? compass?.intention : undefined,
        }),
      });
      const data = (await res.json()) as {
        summary: string;
        citations?: Array<{ kind: string; id: string; label: string }>;
      };
      addBrief({ summary: data.summary ?? "", citations: data.citations });
    } finally {
      setBriefLoading(false);
    }
  }, [sessions, compass, compassFresh, addBrief]);

  const searchArchive = useCallback(async () => {
    const q = archiveQuery.trim();
    if (!q) {
      setArchiveHits(null);
      return;
    }
    setArchiveLoading(true);
    try {
      const res = await fetch("/api/ai/archive-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, sessions }),
      });
      const data = (await res.json()) as {
        hits: Array<{ id: string; createdAt: string; snippet: string; reason: string }>;
      };
      setArchiveHits(data.hits ?? []);
    } finally {
      setArchiveLoading(false);
    }
  }, [archiveQuery, sessions]);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--content-bg-secondary)" }}>
      {/* Header */}
      <header
        style={{
          padding: "16px 24px 12px",
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "linear-gradient(135deg, var(--teal-400), var(--teal-700))",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            boxShadow: "0 8px 22px rgba(6, 182, 212, 0.35)",
          }}
        >
          <Brain size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
            }}
          >
            Vyne AI
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--text-tertiary)" }}>
            Grounded in your workspace · {sessions.length} session{sessions.length === 1 ? "" : "s"} remembered
          </p>
        </div>
        <StreakPill current={streak.current} longest={streak.longest} graceUsed={streak.graceUsed} />
        <Link
          href="/ai"
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            textDecoration: "none",
            padding: "6px 12px",
            borderRadius: 8,
            background: "var(--content-secondary)",
            border: "1px solid var(--content-border)",
          }}
        >
          Insights →
        </Link>
      </header>

      <div
        ref={scrollerRef}
        className="flex-1 overflow-auto content-scroll"
        style={{ padding: "20px 24px 24px" }}
      >
        <div
          style={{
            maxWidth: 820,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* Morning brief */}
          <BriefCard
            brief={todaysBrief}
            loading={briefLoading}
            onGenerate={generateBrief}
          />

          {/* Compass */}
          <CompassCard
            compass={compass}
            fresh={compassFresh}
            editing={editingCompass}
            draft={compassDraft}
            onStartEdit={() => {
              setCompassDraft(compassFresh ? compass?.intention ?? "" : "");
              setEditingCompass(true);
            }}
            onCancel={() => setEditingCompass(false)}
            onSave={() => {
              const v = compassDraft.trim();
              if (!v) return;
              setCompass(v);
              setEditingCompass(false);
            }}
            onDraftChange={setCompassDraft}
          />

          {/* Archive search */}
          <ArchiveCard
            query={archiveQuery}
            setQuery={setArchiveQuery}
            hits={archiveHits}
            loading={archiveLoading}
            onSearch={searchArchive}
            sessions={sessions}
          />

          {/* Chat messages */}
          {messages.length > 0 && (
            <section>
              <h2
                style={{
                  margin: "8px 0 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                }}
              >
                This conversation
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} />
                ))}
                {pending && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      color: "var(--text-tertiary)",
                      fontSize: 13,
                      padding: "10px 14px",
                      alignSelf: "flex-start",
                    }}
                  >
                    <Loader2 size={14} className="animate-spin" />
                    Vyne AI is reading your workspace…
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Starter questions when empty */}
          {messages.length === 0 && (
            <section style={{ marginTop: 4 }}>
              <h2
                style={{
                  margin: "8px 0 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Sparkles size={12} /> Try a question
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {STARTER_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void ask(q)}
                    style={{
                      textAlign: "left",
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid var(--content-border)",
                      background: "var(--content-bg)",
                      color: "var(--text-primary)",
                      fontSize: 13.5,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Sparkles size={12} style={{ color: "var(--vyne-teal)" }} />
                    {q}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
        style={{
          borderTop: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          padding: "14px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 820,
            margin: "0 auto",
            display: "flex",
            gap: 8,
            alignItems: "flex-end",
            background: "var(--content-secondary)",
            border: "1px solid var(--content-border)",
            borderRadius: 14,
            padding: "8px 8px 8px 14px",
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(input);
              }
            }}
            placeholder="Ask Vyne AI about your projects, tasks, deals, inventory…"
            rows={1}
            aria-label="Ask Vyne AI"
            style={{
              flex: 1,
              resize: "none",
              border: "none",
              outline: "none",
              background: "transparent",
              color: "var(--text-primary)",
              fontSize: 14,
              padding: "8px 0",
              lineHeight: 1.45,
              maxHeight: 160,
              fontFamily: "inherit",
            }}
          />
          <button
            type="submit"
            disabled={pending || !input.trim()}
            aria-label="Send message (Enter)"
            title="Send  ·  Enter"
            className="btn-teal"
            style={{
              height: 36,
              padding: "0 14px",
              opacity: pending || !input.trim() ? 0.5 : 1,
              cursor: pending || !input.trim() ? "not-allowed" : "pointer",
            }}
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        <p
          style={{
            maxWidth: 820,
            margin: "8px auto 0",
            fontSize: 11,
            color: "var(--text-tertiary)",
          }}
        >
          Every conversation is saved to your private Vyne AI memory. Nothing leaves your browser
          unless you call the hosted model.
        </p>
      </form>
    </div>
  );
}

/* ─── Sub-components ───────────────────────────────────────── */

function StreakPill({ current, longest, graceUsed }: { current: number; longest: number; graceUsed: boolean }) {
  if (current === 0 && longest === 0) return null;
  return (
    <span
      title={`Current streak: ${current} · longest: ${longest}${graceUsed ? " · 1 grace day used this week" : ""}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        background: current > 0 ? "rgba(245, 158, 11, 0.14)" : "var(--content-secondary)",
        border: `1px solid ${current > 0 ? "rgba(245, 158, 11, 0.35)" : "var(--content-border)"}`,
        color: current > 0 ? "#F59E0B" : "var(--text-tertiary)",
        fontSize: 12,
        fontWeight: 700,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <Flame size={13} />
      {current || 0}
    </span>
  );
}

function BriefCard({
  brief,
  loading,
  onGenerate,
}: {
  brief: ReturnType<typeof useAiMemoryStore.getState>["briefs"][number] | undefined;
  loading: boolean;
  onGenerate: () => void;
}) {
  return (
    <section
      style={{
        background:
          "linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(6, 182, 212, 0.02))",
        border: "1px solid rgba(6, 182, 212, 0.25)",
        borderRadius: 14,
        padding: "16px 18px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--vyne-teal)" }}>
          <Sunrise size={16} />
          <strong style={{ fontSize: 13, letterSpacing: "-0.005em" }}>
            {brief ? "Your morning brief" : "Generate today's brief"}
          </strong>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="btn-teal"
          style={{ height: 30, padding: "0 12px", fontSize: 12 }}
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : brief ? "Regenerate" : "Generate"}
        </button>
      </div>
      {brief ? (
        <p
          style={{
            marginTop: 10,
            marginBottom: 0,
            fontSize: 13.5,
            lineHeight: 1.6,
            color: "var(--text-primary)",
            whiteSpace: "pre-wrap",
          }}
        >
          <AnswerWithCitations text={brief.summary} />
        </p>
      ) : (
        <p style={{ marginTop: 8, marginBottom: 0, fontSize: 12.5, color: "var(--text-tertiary)" }}>
          One focused recommendation + the watch-outs from your workspace + a reflection question
          for tonight. Seeded by your weekly Compass.
        </p>
      )}
    </section>
  );
}

function CompassCard({
  compass,
  fresh,
  editing,
  draft,
  onStartEdit,
  onCancel,
  onSave,
  onDraftChange,
}: {
  compass: ReturnType<typeof useAiMemoryStore.getState>["compass"];
  fresh: boolean;
  editing: boolean;
  draft: string;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onDraftChange: (v: string) => void;
}) {
  return (
    <section
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 14,
        padding: "14px 18px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <CompassIcon size={14} style={{ color: "var(--vyne-teal)" }} />
          <strong style={{ fontSize: 12.5, color: "var(--text-primary)" }}>
            Weekly Compass
          </strong>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            {fresh ? "this week" : compass ? "stale — set a new one" : "unset"}
          </span>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={onStartEdit}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid var(--content-border)",
              background: "var(--content-secondary)",
              color: "var(--text-secondary)",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {fresh ? "Edit" : "Set"}
          </button>
        )}
      </div>
      {editing ? (
        <div style={{ marginTop: 10 }}>
          <input
            type="text"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder="One measurable intention for the week (e.g. close the Acme deal by Thursday)"
            aria-label="Weekly intention"
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              background: "var(--content-secondary)",
              color: "var(--text-primary)",
              fontSize: 13.5,
              outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: "6px 12px",
                borderRadius: 7,
                border: "1px solid var(--content-border)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              className="btn-teal"
              style={{ height: 30, padding: "0 14px", fontSize: 12.5 }}
              disabled={!draft.trim()}
            >
              Save compass
            </button>
          </div>
        </div>
      ) : fresh && compass ? (
        <p style={{ margin: "8px 0 0", fontSize: 13.5, color: "var(--text-primary)", lineHeight: 1.5 }}>
          “{compass.intention}”
        </p>
      ) : (
        <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--text-tertiary)" }}>
          One measurable intention for the week. Every morning brief holds you against it.
        </p>
      )}
    </section>
  );
}

function ArchiveCard({
  query,
  setQuery,
  hits,
  loading,
  onSearch,
  sessions,
}: {
  query: string;
  setQuery: (v: string) => void;
  hits: Array<{ id: string; createdAt: string; snippet: string; reason: string }> | null;
  loading: boolean;
  onSearch: () => void;
  sessions: Session[];
}) {
  if (sessions.length === 0) return null;
  return (
    <section
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 14,
        padding: "14px 18px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <History size={14} style={{ color: "var(--vyne-teal)" }} />
        <strong style={{ fontSize: 12.5, color: "var(--text-primary)" }}>
          Ask the archive
        </strong>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
          · {sessions.length} past session{sessions.length === 1 ? "" : "s"}
        </span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearch();
        }}
        style={{ display: "flex", gap: 8, marginTop: 8 }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 12px",
            borderRadius: 8,
            border: "1px solid var(--content-border)",
            background: "var(--content-secondary)",
          }}
        >
          <Search size={13} style={{ color: "var(--text-tertiary)" }} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. when did I last feel stuck?"
            aria-label="Search past sessions"
            style={{
              flex: 1,
              padding: "9px 0",
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: 13.5,
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="btn-teal"
          style={{ height: 36, padding: "0 14px", fontSize: 13 }}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : "Search"}
        </button>
      </form>
      {hits && hits.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "10px 0 0",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {hits.map((h) => (
            <li
              key={h.id}
              style={{
                padding: "10px 12px",
                background: "var(--content-secondary)",
                border: "1px solid var(--content-border)",
                borderRadius: 9,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  marginBottom: 4,
                }}
              >
                <span>{new Date(h.createdAt).toLocaleString()}</span>
                <span style={{ color: "var(--vyne-teal)", fontWeight: 600 }}>{h.reason}</span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "var(--text-primary)",
                  lineHeight: 1.5,
                }}
              >
                {h.snippet}
              </p>
            </li>
          ))}
        </ul>
      )}
      {hits && hits.length === 0 && (
        <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--text-tertiary)" }}>
          Nothing relevant in your archive yet.
        </p>
      )}
    </section>
  );
}

function MessageBubble({ message }: { message: Msg }) {
  const isUser = message.role === "user";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: isUser ? "row-reverse" : "row",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 30,
          height: 30,
          borderRadius: 10,
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: isUser
            ? "var(--content-secondary)"
            : "linear-gradient(135deg, var(--teal-400), var(--teal-700))",
          color: isUser ? "var(--text-secondary)" : "#fff",
          border: isUser ? "1px solid var(--content-border)" : "none",
          fontWeight: 700,
          fontSize: 12,
        }}
      >
        {isUser ? "You" : <Brain size={14} />}
      </div>
      <div
        style={{
          maxWidth: "78%",
          background: isUser ? "var(--vyne-teal-soft)" : "var(--content-bg)",
          border: `1px solid ${isUser ? "var(--vyne-teal-ring)" : "var(--content-border)"}`,
          borderRadius: 12,
          padding: "10px 14px",
          fontSize: 13.5,
          lineHeight: 1.55,
          color: "var(--text-primary)",
          whiteSpace: "pre-wrap",
        }}
      >
        {isUser ? message.content : <AnswerWithCitations text={message.content} />}
      </div>
    </div>
  );
}

function AnswerWithCitations({ text }: { text: string }) {
  const re = /\[(project|task|deal|contact|product|invoice|employee):([^\]]+)\]/g;
  const parts: Array<
    { type: "text"; value: string } | { type: "cite"; kind: string; id: string }
  > = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: "text", value: text.slice(last, m.index) });
    parts.push({ type: "cite", kind: m[1], id: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });

  return (
    <>
      {parts.map((p, i) => {
        if (p.type === "text") return <span key={i}>{p.value}</span>;
        const href = resolveCitationHref(p.kind, p.id);
        const chip = (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "1px 7px",
              marginInline: 2,
              borderRadius: 999,
              background: "var(--vyne-teal-soft)",
              color: "var(--vyne-teal)",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "var(--font-mono)",
              cursor: href ? "pointer" : "default",
            }}
          >
            {p.kind}:{p.id}
          </span>
        );
        return href ? (
          <Link key={i} href={href} style={{ textDecoration: "none" }}>
            {chip}
          </Link>
        ) : (
          <span key={i}>{chip}</span>
        );
      })}
    </>
  );
}
