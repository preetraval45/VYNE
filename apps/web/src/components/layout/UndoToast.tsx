"use client";

import { useEffect, useState } from "react";
import { Undo2 } from "lucide-react";
import { useUndoStore } from "@/lib/stores/undo";

export function UndoToast() {
  const pending = useUndoStore((s) => s.pending);
  const invokeUndo = useUndoStore((s) => s.invokeUndo);
  const clear = useUndoStore((s) => s.clear);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!pending) return;
    const tick = () => {
      const left = Math.max(0, pending.expiresAt - Date.now());
      setRemaining(left);
      if (left <= 0) clear();
    };
    tick();
    const iv = setInterval(tick, 100);
    return () => clearInterval(iv);
  }, [pending, clear]);

  if (!pending) return null;

  const progress =
    remaining > 0
      ? Math.min(1, remaining / (pending.expiresAt - (pending.expiresAt - 6000)))
      : 0;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 16px",
        borderRadius: 12,
        background: "var(--sidebar-bg)",
        color: "#fff",
        fontSize: 13,
        fontWeight: 500,
        zIndex: 500,
        boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
        minWidth: 280,
        maxWidth: 480,
      }}
    >
      <span style={{ flex: 1 }}>{pending.label}</span>
      <button
        type="button"
        onClick={invokeUndo}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "4px 10px",
          borderRadius: 8,
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.25)",
          color: "#fff",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <Undo2 size={12} />
        Undo
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={clear}
        style={{
          width: 22,
          height: 22,
          borderRadius: 5,
          background: "transparent",
          border: "none",
          color: "rgba(255,255,255,0.6)",
          cursor: "pointer",
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        ×
      </button>
      {/* Progress bar */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 2,
          background: "transparent",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress * 100}%`,
            background: "var(--vyne-accent, var(--vyne-purple))",
            transition: "width 100ms linear",
          }}
        />
      </div>
    </div>
  );
}
