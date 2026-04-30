"use client";

import { useEffect, useState } from "react";
import { Sparkles, Copy, Check } from "lucide-react";

// ─── AI Subject-line A/B suggester ─────────────────────────────────
//
// Posts the campaign body / goal to /api/ai/ask and asks Vyne AI for
// 5 distinct, high-CTR subject lines as a markdown numbered list.
// Each line renders as a row with a per-row "Copy" button.

interface AskResponse {
  answer: string;
  citations?: unknown;
  provider?: string;
}

function parseNumberedList(markdown: string): string[] {
  // Match lines that start with "1." / "1)" / "- " etc, capture the rest.
  const lines = markdown.split(/\r?\n/);
  const out: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    // 1. foo / 1) foo / - foo / * foo
    const m = /^(?:\d+[.)]|[-*])\s+(.*)$/.exec(line);
    if (m) {
      // Strip surrounding **bold** or quotes if the model added them.
      let text = m[1].trim();
      text = text.replace(/^\*\*(.*)\*\*$/, "$1");
      text = text.replace(/^["'“”](.*)["'“”]$/, "$1");
      if (text) out.push(text);
    }
  }
  // Fallback: if model returned plain lines without numbering.
  if (out.length === 0) {
    for (const raw of lines) {
      const t = raw.trim();
      if (t.length >= 4 && t.length <= 200) out.push(t);
    }
  }
  return out.slice(0, 5);
}

export function SubjectLineGenerator() {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  async function generate() {
    if (!body.trim() || loading) return;
    setLoading(true);
    setError(null);
    setCopiedIdx(null);
    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question:
            "Generate 5 distinct, high-CTR email subject lines for this campaign. Return as a numbered markdown list, no commentary.",
          context: { campaignBody: body.trim() },
        }),
      });
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }
      const data = (await res.json()) as AskResponse;
      const parsed = parseNumberedList(data.answer ?? "");
      if (parsed.length === 0) {
        setError("No subject lines were returned. Try a longer brief.");
        setSubjects([]);
      } else {
        setSubjects(parsed);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }

  async function copyOne(idx: number, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      // Click-metric tracking: count which variant the user picks.
      // Persisted in localStorage so the next AI generation can be
      // primed with what worked. Anonymized — just hash + count.
      try {
        const key = "vyne-subject-picks";
        const raw = localStorage.getItem(key);
        const stats: Record<string, number> = raw ? JSON.parse(raw) : {};
        const hash = String(text).slice(0, 80);
        stats[hash] = (stats[hash] ?? 0) + 1;
        localStorage.setItem(key, JSON.stringify(stats));
      } catch {
        // ignore quota / privacy mode
      }
      window.setTimeout(() => {
        setCopiedIdx((cur) => (cur === idx ? null : cur));
      }, 1400);
    } catch {
      setError("Clipboard unavailable in this browser");
    }
  }

  return (
    <section
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 10,
        padding: "18px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Sparkles size={15} style={{ color: "var(--vyne-accent, var(--vyne-purple))" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            AI Subject-line A/B Suggester
          </span>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            Vyne AI proposes 5 high-CTR variants for split testing
          </span>
        </div>
      </div>

      {/* Input */}
      <label
        htmlFor="slg-body"
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        Email body or campaign goal
      </label>
      <TopPicksHistory />
      <textarea
        id="slg-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="e.g. Spring product launch announcing AI-powered analytics, target SMB owners, push 14-day trial."
        rows={5}
        style={{
          width: "100%",
          padding: "10px 12px",
          fontSize: 13,
          fontFamily: "inherit",
          color: "var(--text-primary)",
          background: "var(--content-secondary)",
          border: "1px solid var(--content-border)",
          borderRadius: 8,
          resize: "vertical",
          outline: "none",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          type="button"
          onClick={generate}
          disabled={loading || !body.trim()}
          aria-busy={loading}
          style={{
            padding: "8px 14px",
            fontSize: 12,
            fontWeight: 600,
            color: "#fff",
            background:
              loading || !body.trim()
                ? "var(--text-tertiary)"
                : "var(--vyne-accent, var(--vyne-purple))",
            border: "none",
            borderRadius: 8,
            cursor: loading || !body.trim() ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            opacity: loading || !body.trim() ? 0.7 : 1,
            transition: "opacity 0.15s",
          }}
        >
          <Sparkles size={13} />
          {loading ? "Generating…" : "Generate 5 subject lines"}
        </button>
        {error && (
          <span
            role="alert"
            style={{
              fontSize: 12,
              color: "var(--badge-danger-text)",
            }}
          >
            {error}
          </span>
        )}
      </div>

      {/* Results */}
      {subjects.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {subjects.map((s, i) => {
            const copied = copiedIdx === i;
            return (
              <li
                key={`${i}-${s}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  border: "1px solid var(--content-border)",
                  borderRadius: 8,
                  background: "var(--content-secondary)",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--vyne-accent, var(--vyne-purple))",
                    minWidth: 18,
                  }}
                >
                  {i + 1}.
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: "var(--text-primary)",
                    lineHeight: 1.45,
                  }}
                >
                  {s}
                </span>
                <button
                  type="button"
                  onClick={() => copyOne(i, s)}
                  aria-label={`Copy subject line ${i + 1}`}
                  style={{
                    padding: "5px 10px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: copied
                      ? "var(--badge-success-text)"
                      : "var(--text-secondary)",
                    background: "var(--content-bg)",
                    border: "1px solid var(--content-border)",
                    borderRadius: 6,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    flexShrink: 0,
                  }}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default SubjectLineGenerator;

// ── TopPicksHistory ──────────────────────────────────────────────
// Reads vyne-subject-picks (set by copyOne) and surfaces the user's
// 3 most-copied subject lines so the next campaign can reuse them.
// Renders nothing on first run when there's no history yet.

function TopPicksHistory() {
  const [picks, setPicks] = useState<Array<[string, number]>>([]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("vyne-subject-picks");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, number>;
      const top = Object.entries(parsed)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      setPicks(top);
    } catch {
      // ignore
    }
  }, []);

  if (picks.length === 0) return null;
  return (
    <div
      style={{
        marginBottom: 4,
        padding: "8px 10px",
        borderRadius: 8,
        background: "var(--vyne-accent-soft, var(--content-secondary))",
        border: "1px solid var(--vyne-accent-ring, var(--content-border))",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--vyne-accent-deep, var(--text-tertiary))",
          marginBottom: 4,
        }}
      >
        Your top picks
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        {picks.map(([text, count]) => (
          <li key={text} style={{ fontSize: 12, color: "var(--text-primary)", display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
              {text}
            </span>
            <span style={{ color: "var(--text-tertiary)", fontVariantNumeric: "tabular-nums" }}>×{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
