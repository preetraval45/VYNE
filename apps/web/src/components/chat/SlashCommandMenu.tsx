"use client";

import { useState, useEffect } from "react";
import { SLASH_COMMANDS, type SlashCmd } from "./constants";

interface SlashCommandMenuProps {
  readonly query: string;
  readonly onSelect: (cmd: SlashCmd) => void;
  readonly onClose: () => void;
}

export function SlashCommandMenu({
  query,
  onSelect,
  onClose,
}: SlashCommandMenuProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  // Improved filter: matches both prefix ("/p" → /poll, /postmortem,
  // /pr-summary) AND substring elsewhere ("/ask" → matches /ask but
  // also AI templates that include "ask"). Prefix matches rank first.
  const q = query.replace(/^\//, "").toLowerCase();
  const filtered = q
    ? SLASH_COMMANDS.filter(
        (c) =>
          c.cmd.toLowerCase().includes(q) ||
          c.desc.toLowerCase().includes(q),
      ).sort((a, b) => {
        const aPrefix = a.cmd.toLowerCase().startsWith(q);
        const bPrefix = b.cmd.toLowerCase().startsWith(q);
        if (aPrefix !== bPrefix) return aPrefix ? -1 : 1;
        return a.cmd.localeCompare(b.cmd);
      })
    : SLASH_COMMANDS;

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
        onSelect(filtered[activeIdx]);
      } else if (e.key === "Escape") onClose();
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
        boxShadow: "0 -4px 24px rgba(0,0,0,0.1)",
        padding: "6px 6px",
        maxHeight: 280,
        overflowY: "auto",
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          margin: "0 4px 6px",
          padding: "2px 4px",
        }}
      >
        Slash commands
      </p>
      {filtered.map((c, i) => (
        <button
          key={c.cmd}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(c);
          }}
          onMouseEnter={() => setActiveIdx(i)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "7px 8px",
            borderRadius: 7,
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            background:
              i === activeIdx ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.08)" : "transparent",
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>{c.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                /{c.cmd}
              </span>
              {c.args && (
                <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  {c.args}
                </span>
              )}
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 9,
                  fontWeight: 700,
                  color: "var(--vyne-accent, #06B6D4)",
                  background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.1)",
                  padding: "1px 6px",
                  borderRadius: 4,
                }}
              >
                {c.category}
              </span>
            </div>
            <p
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              {c.desc}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
