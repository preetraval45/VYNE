"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

// Drop-in card that lets a user describe what they want in plain
// English, posts it to /api/ai/ask with a "fill these fields" prompt,
// and calls back with parsed key→value pairs the host form can apply
// via setState. Caller passes the field shape so the AI knows what to
// extract.

interface FieldSpec {
  /** Form-state key the parsed value will be written to. */
  key: string;
  /** Human label the AI sees in the prompt. */
  label: string;
  /** Optional hint about expected shape (e.g. "ISO date", "USD number"). */
  hint?: string;
}

interface Props {
  fields: FieldSpec[];
  /** Free-text placeholder for the user textarea. */
  placeholder?: string;
  /** Called with parsed values for each known field key. */
  onApply: (values: Record<string, string | number>) => void;
  title?: string;
}

export function AiFormFill({ fields, placeholder, onApply, title = "Describe + auto-fill" }: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const fieldList = fields
        .map((f) => `- ${f.key} (${f.label}${f.hint ? `, ${f.hint}` : ""})`)
        .join("\n");
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `Extract values for these form fields from the user's text. Output ONLY a JSON object whose keys are the field names below and whose values are strings or numbers. Skip fields you can't determine.\n\nFields:\n${fieldList}`,
          context: { userText: text },
        }),
      });
      const body = (await res.json()) as { answer?: string };
      const raw = (body.answer ?? "").trim();
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start === -1 || end === -1) throw new Error("AI didn't return JSON");
      const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
      const allowed = new Set(fields.map((f) => f.key));
      const out: Record<string, string | number> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (!allowed.has(k)) continue;
        if (typeof v === "string" || typeof v === "number") out[k] = v;
      }
      onApply(out);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't parse response");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      style={{
        background: "var(--vyne-accent-soft, var(--content-secondary))",
        border: "1px solid var(--vyne-accent-ring, var(--content-border))",
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span
          aria-hidden="true"
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: "var(--vyne-accent, #5B5BD6)",
            color: "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Sparkles size={11} />
        </span>
        <h3 style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: "var(--text-primary)" }}>
          {title}
        </h3>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder={placeholder ?? "Describe in plain English…"}
        aria-label="Plain-English description"
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: 8,
          border: "1px solid var(--content-border)",
          background: "var(--input-bg, var(--content-bg))",
          color: "var(--text-primary)",
          fontSize: 13,
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
        {error ? (
          <span style={{ fontSize: 11, color: "var(--status-danger)" }}>{error}</span>
        ) : (
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            Fills: {fields.map((f) => f.key).join(", ")}
          </span>
        )}
        <button
          type="button"
          onClick={run}
          disabled={busy || !text.trim()}
          aria-busy={busy}
          style={{
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 8,
            border: "none",
            background: "var(--vyne-accent, #5B5BD6)",
            color: "#fff",
            cursor: busy || !text.trim() ? "not-allowed" : "pointer",
            opacity: busy || !text.trim() ? 0.6 : 1,
          }}
        >
          {busy ? "Filling…" : "Auto-fill"}
        </button>
      </div>
    </section>
  );
}
