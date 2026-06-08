"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

// Drop-in card that lets a user describe what they want in plain
// English, posts it to /api/ai/extract (a purpose-built structured
// extraction endpoint), and calls back with parsed key→value pairs the
// host form can apply via setState. Caller passes the field shape so the
// AI knows what to extract.
//
// NOTE: this used to POST to /api/ai/ask with the description tucked into
// `context.userText` — but that route's serializer dropped unknown context
// keys (so the model never saw the text) and it didn't support the app's
// GEMINI_API_KEY, so auto-fill silently did nothing (BUG #4).

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

export function AiFormFill({
  fields,
  placeholder,
  onApply,
  title = "Describe + auto-fill",
}: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, fields }),
      });
      const body = (await res.json()) as {
        values?: Record<string, string | number>;
        note?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(body.error || `Auto-fill failed (HTTP ${res.status})`);
      }
      const values = body.values ?? {};
      if (Object.keys(values).length === 0) {
        // Nothing extracted — surface the reason and keep the text so the
        // user can refine it rather than re-typing.
        setError(
          body.note || "Couldn't pull any field values from that description.",
        );
        return;
      }
      onApply(values);
      setText("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't reach the auto-fill service",
      );
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
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
        <h3
          style={{
            margin: 0,
            fontSize: 12.5,
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 8,
        }}
      >
        {busy ? (
          <span
            style={{
              fontSize: 11,
              color: "var(--vyne-accent, var(--vyne-purple))",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 600,
            }}
          >
            <Sparkles size={11} />
            Parsing your input…
          </span>
        ) : error ? (
          <span style={{ fontSize: 11, color: "var(--status-danger)" }}>
            {error}
          </span>
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
