"use client";

import { X } from "lucide-react";

export interface BulkAction {
  id: string;
  label: string;
  icon: React.ElementType;
  destructive?: boolean;
  onClick: () => void;
}

interface Props {
  count: number;
  actions: BulkAction[];
  onClear: () => void;
}

export function BulkActionsBar({ count, actions, onClear }: Props) {
  if (count === 0) return null;
  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      style={{
        position: "sticky",
        bottom: 18,
        left: 0,
        right: 0,
        margin: "12px auto",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 12,
        background: "var(--sidebar-bg)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "#fff",
        boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
        maxWidth: 720,
        zIndex: 15,
      }}
    >
      <span
        style={{
          padding: "3px 10px",
          borderRadius: 999,
          background: "rgba(108,71,255,0.18)",
          border: "1px solid rgba(108,71,255,0.35)",
          fontSize: 12,
          fontWeight: 600,
          color: "#B8A3FF",
          flexShrink: 0,
        }}
      >
        {count} selected
      </span>

      <div
        style={{
          width: 1,
          height: 18,
          background: "rgba(255,255,255,0.12)",
        }}
      />

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", flex: 1 }}>
        {actions.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={a.onClick}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 10px",
              borderRadius: 7,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: a.destructive ? "#F87171" : "#fff",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                a.destructive
                  ? "rgba(239,68,68,0.15)"
                  : "rgba(255,255,255,0.08)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <a.icon size={13} />
            {a.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        aria-label="Clear selection"
        onClick={onClear}
        style={{
          width: 26,
          height: 26,
          borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "transparent",
          color: "rgba(255,255,255,0.7)",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <X size={13} />
      </button>
    </div>
  );
}
