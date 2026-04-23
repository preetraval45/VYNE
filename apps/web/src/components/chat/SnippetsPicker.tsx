"use client";

import { useEffect, useMemo, useState } from "react";
import { Zap } from "lucide-react";
import { useSnippetsStore, type Snippet } from "@/lib/stores/snippets";

interface Props {
  query: string;
  onSelect: (body: string) => void;
  onClose: () => void;
}

export function SnippetsPicker({ query, onSelect, onClose }: Props) {
  const snippets = useSnippetsStore((s) => s.snippets);
  const [activeIdx, setActiveIdx] = useState(0);

  const filtered = useMemo<Snippet[]>(() => {
    const q = query.replace(/^\//, "").toLowerCase();
    if (!q) return snippets.slice(0, 6);
    return snippets.filter(
      (s) =>
        s.shortcut.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.body.toLowerCase().includes(q),
    );
  }, [snippets, query]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered[activeIdx]) {
        e.preventDefault();
        e.stopPropagation();
        onSelect(filtered[activeIdx].body);
      } else if (e.key === "Escape") {
        onClose();
      }
    }
    globalThis.addEventListener("keydown", handler, true);
    return () => globalThis.removeEventListener("keydown", handler, true);
  }, [filtered, activeIdx, onSelect, onClose]);

  if (filtered.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "calc(100% + 8px)",
        left: 0,
        right: 0,
        zIndex: 50,
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 10,
        boxShadow: "0 -4px 24px rgba(0,0,0,0.12)",
        padding: "6px 6px",
        maxHeight: 280,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontSize: 10,
          fontWeight: 600,
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          margin: "0 4px 6px",
          padding: "2px 4px",
        }}
      >
        <Zap size={10} style={{ color: "var(--vyne-purple)" }} />
        Snippets
      </div>
      {filtered.map((s, i) => (
        <button
          key={s.id}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(s.body);
          }}
          onMouseEnter={() => setActiveIdx(i)}
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: "7px 8px",
            borderRadius: 7,
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            background:
              i === activeIdx ? "rgba(6, 182, 212,0.08)" : "transparent",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            <span
              style={{
                padding: "1px 6px",
                borderRadius: 4,
                background: "rgba(6, 182, 212,0.12)",
                color: "var(--vyne-purple)",
                fontSize: 10,
                fontFamily:
                  "var(--font-geist-mono), ui-monospace, monospace",
              }}
            >
              {s.shortcut}
            </span>
            {s.title}
            <span
              style={{
                marginLeft: "auto",
                fontSize: 9,
                fontWeight: 700,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {s.category}
            </span>
          </div>
          <p
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              margin: 0,
              lineHeight: 1.4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {s.body}
          </p>
        </button>
      ))}
    </div>
  );
}
