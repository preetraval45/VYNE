"use client";

import { Focus } from "lucide-react";
import { useUIStore } from "@/lib/stores/ui";

export function FocusModeToast() {
  const focusMode = useUIStore((s) => s.focusMode);
  const toggleFocusMode = useUIStore((s) => s.toggleFocusMode);

  if (!focusMode) return null;

  return (
    <button
      type="button"
      aria-label="Exit focus mode"
      onClick={toggleFocusMode}
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 16px",
        borderRadius: 999,
        background: "rgba(108,71,255,0.12)",
        border: "1px solid rgba(108,71,255,0.35)",
        color: "var(--vyne-purple)",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        zIndex: 200,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      }}
    >
      <Focus size={13} />
      Focus mode &middot; press <kbd style={{ fontFamily: "monospace" }}>F</kbd> to exit
    </button>
  );
}
