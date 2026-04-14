"use client";

import { useMemo } from "react";
import { diffWordsWithSpace, diffLines, type Change } from "diff";

interface Props {
  left: { title: string; content: string; label: string };
  right: { title: string; content: string; label: string };
  mode?: "inline" | "split";
}

function htmlToPlain(html: string): string {
  if (typeof document === "undefined") return html;
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.innerText;
}

function renderChange(
  changes: Change[],
  mode: "left" | "right" | "inline",
): React.ReactNode {
  return changes.map((c, idx) => {
    const base: React.CSSProperties = {
      padding: "2px 4px",
      borderRadius: 3,
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
    };
    if (c.added) {
      if (mode === "left") return null;
      return (
        <span
          key={idx}
          style={{
            ...base,
            background: "var(--badge-success-bg)",
            color: "var(--badge-success-text)",
          }}
        >
          {c.value}
        </span>
      );
    }
    if (c.removed) {
      if (mode === "right") return null;
      return (
        <span
          key={idx}
          style={{
            ...base,
            background: "var(--badge-danger-bg)",
            color: "var(--badge-danger-text)",
            textDecoration: "line-through",
            textDecorationColor: "var(--status-danger)",
          }}
        >
          {c.value}
        </span>
      );
    }
    return (
      <span key={idx} style={{ color: "var(--text-primary)" }}>
        {c.value}
      </span>
    );
  });
}

export function DiffViewer({ left, right, mode = "split" }: Props) {
  const changes = useMemo(() => {
    const a = htmlToPlain(left.content);
    const b = htmlToPlain(right.content);
    return diffWordsWithSpace(a, b);
  }, [left.content, right.content]);

  const added = changes.filter((c) => c.added).reduce((sum, c) => sum + c.value.length, 0);
  const removed = changes.filter((c) => c.removed).reduce((sum, c) => sum + c.value.length, 0);

  const lineChanges = useMemo(() => {
    const a = htmlToPlain(left.content);
    const b = htmlToPlain(right.content);
    return diffLines(a, b);
  }, [left.content, right.content]);

  const linesAdded = lineChanges.filter((c) => c.added).length;
  const linesRemoved = lineChanges.filter((c) => c.removed).length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        fontSize: 13,
        lineHeight: 1.6,
        color: "var(--text-primary)",
      }}
    >
      {/* Summary strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 14px",
          background: "var(--content-secondary)",
          border: "1px solid var(--content-border)",
          borderRadius: 8,
          fontSize: 12,
          color: "var(--text-secondary)",
          flexWrap: "wrap",
        }}
      >
        <span>
          <strong style={{ color: "var(--text-primary)" }}>{left.label}</strong>
          <span style={{ margin: "0 8px", color: "var(--text-tertiary)" }}>
            →
          </span>
          <strong style={{ color: "var(--text-primary)" }}>
            {right.label}
          </strong>
        </span>
        <span style={{ flex: 1 }} />
        <span
          style={{
            padding: "2px 8px",
            borderRadius: 999,
            background: "var(--badge-success-bg)",
            color: "var(--badge-success-text)",
            fontWeight: 600,
          }}
        >
          +{added} chars · +{linesAdded} lines
        </span>
        <span
          style={{
            padding: "2px 8px",
            borderRadius: 999,
            background: "var(--badge-danger-bg)",
            color: "var(--badge-danger-text)",
            fontWeight: 600,
          }}
        >
          -{removed} chars · -{linesRemoved} lines
        </span>
      </div>

      {mode === "split" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <section>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              Before · {left.label}
            </div>
            <div
              style={{
                padding: 14,
                borderRadius: 8,
                background: "var(--content-bg)",
                border: "1px solid var(--content-border)",
                minHeight: 200,
                maxHeight: 420,
                overflow: "auto",
              }}
            >
              {renderChange(changes, "left")}
            </div>
          </section>
          <section>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              After · {right.label}
            </div>
            <div
              style={{
                padding: 14,
                borderRadius: 8,
                background: "var(--content-bg)",
                border: "1px solid var(--content-border)",
                minHeight: 200,
                maxHeight: 420,
                overflow: "auto",
              }}
            >
              {renderChange(changes, "right")}
            </div>
          </section>
        </div>
      ) : (
        <div
          style={{
            padding: 14,
            borderRadius: 8,
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            minHeight: 200,
            maxHeight: 420,
            overflow: "auto",
          }}
        >
          {renderChange(changes, "inline")}
        </div>
      )}
    </div>
  );
}
