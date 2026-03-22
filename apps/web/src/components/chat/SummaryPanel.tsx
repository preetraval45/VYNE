"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { SUMMARY_LINES, SUMMARY_ACTIONS } from "./constants";

interface SummaryPanelProps {
  readonly onClose: () => void;
}

export function SummaryPanel({ onClose }: SummaryPanelProps) {
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    const t = setInterval(
      () =>
        setVisible((v) =>
          Math.min(v + 1, SUMMARY_LINES.length + SUMMARY_ACTIONS.length),
        ),
      400,
    );
    return () => clearInterval(t);
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      style={{
        position: "absolute",
        bottom: 70,
        left: 16,
        right: 16,
        zIndex: 40,
        background: "#fff",
        border: "1px solid #E0D5FF",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(108,71,255,0.15)",
        padding: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Sparkles size={15} style={{ color: "#6C47FF" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A2E" }}>
            AI Thread Summary
          </span>
          <span
            style={{
              fontSize: 10,
              color: "#6C47FF",
              background: "rgba(108,71,255,0.1)",
              padding: "1px 6px",
              borderRadius: 4,
              fontWeight: 600,
            }}
          >
            BETA
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "#A0A0B8",
            display: "flex",
            padding: 4,
            borderRadius: 5,
          }}
        >
          <X size={14} />
        </button>
      </div>
      <div style={{ marginBottom: 12 }}>
        {SUMMARY_LINES.map(
          (line, i) =>
            visible > i && (
              <p
                key={line.slice(0, 20)}
                style={{
                  fontSize: 12,
                  color: "#2D2D4E",
                  lineHeight: 1.6,
                  margin: "0 0 6px",
                }}
              >
                • {line}
              </p>
            ),
        )}
      </div>
      {visible > SUMMARY_LINES.length && (
        <div style={{ borderTop: "1px solid #F0F0F8", paddingTop: 10 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#6B6B8A",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              margin: "0 0 8px",
            }}
          >
            Action Items
          </p>
          {SUMMARY_ACTIONS.map(
            (act, i) =>
              visible > SUMMARY_LINES.length + i && (
                <div
                  key={act.text.slice(0, 20)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 7,
                    marginBottom: 5,
                  }}
                >
                  <span style={{ fontSize: 12, marginTop: 1 }}>
                    {act.done ? "✅" : "⬜"}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: act.done ? "#A0A0B8" : "#1A1A2E",
                      textDecoration: act.done ? "line-through" : "none",
                    }}
                  >
                    {act.text}
                  </span>
                </div>
              ),
          )}
        </div>
      )}
    </motion.div>
  );
}
