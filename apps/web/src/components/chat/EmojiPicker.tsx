"use client";

import { COMMON_EMOJIS } from "./constants";

interface EmojiPickerProps {
  readonly onPick: (emoji: string) => void;
  readonly onClose: () => void;
}

export function EmojiPicker({ onPick, onClose }: EmojiPickerProps) {
  return (
    <div
      role="menu"
      aria-label="Emoji picker"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      tabIndex={-1}
      style={{
        position: "absolute",
        bottom: "100%",
        right: 0,
        zIndex: 50,
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 10,
        padding: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 2,
      }}
      onMouseLeave={onClose}
    >
      {COMMON_EMOJIS.map((e) => (
        <button
          key={e}
          onClick={() => {
            onPick(e);
            onClose();
          }}
          style={{
            fontSize: 18,
            padding: "4px",
            borderRadius: 6,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            lineHeight: 1,
          }}
          onMouseEnter={(ev) => {
            (ev.currentTarget as HTMLElement).style.background =
              "var(--content-secondary)";
          }}
          onMouseLeave={(ev) => {
            (ev.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          {e}
        </button>
      ))}
    </div>
  );
}
