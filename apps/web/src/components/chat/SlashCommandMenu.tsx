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
  const filtered = SLASH_COMMANDS.filter((c) =>
    c.cmd.startsWith(query.replace(/^\//, "")),
  );

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
        background: "#fff",
        border: "1px solid #E8E8F0",
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
          color: "#A0A0B8",
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
              i === activeIdx ? "rgba(108,71,255,0.08)" : "transparent",
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
              <span style={{ fontSize: 12, fontWeight: 600, color: "#1A1A2E" }}>
                /{c.cmd}
              </span>
              {c.args && (
                <span style={{ fontSize: 11, color: "#A0A0B8" }}>{c.args}</span>
              )}
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#6C47FF",
                  background: "rgba(108,71,255,0.1)",
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
                color: "#6B6B8A",
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
