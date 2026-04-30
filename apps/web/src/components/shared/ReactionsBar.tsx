"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth";

interface Reaction {
  emoji: string;
  users: string[]; // user IDs
}

interface Props {
  /** Stable identifier — e.g. `msg:abc`, `issue:ENG-43`, `doc:123`. */
  subjectId: string;
  initial?: Reaction[];
  className?: string;
  /** Only show bar when there are reactions OR the user hovers the parent. */
  compact?: boolean;
}

const STORAGE_PREFIX = "vyne-reactions-";

const QUICK_EMOJIS = [
  "👍",
  "👎",
  "❤️",
  "🎉",
  "🚀",
  "🔥",
  "👀",
  "🙏",
  "💡",
  "✅",
  "🤔",
  "😂",
  "😮",
  "😢",
  "💯",
];

function loadReactions(id: string): Reaction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + id);
    return raw ? (JSON.parse(raw) as Reaction[]) : [];
  } catch {
    return [];
  }
}

function saveReactions(id: string, r: Reaction[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(r));
  } catch {
    // ignore
  }
}

export function ReactionsBar({
  subjectId,
  initial,
  className,
  compact = false,
}: Props) {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? "anon";
  const [reactions, setReactions] = useState<Reaction[]>(initial ?? []);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const stored = loadReactions(subjectId);
    if (stored.length > 0) setReactions(stored);
    else if (initial && initial.length > 0) setReactions(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  const toggle = (emoji: string) => {
    setReactions((prev) => {
      const existing = prev.find((r) => r.emoji === emoji);
      let next: Reaction[];
      if (existing) {
        const hasMe = existing.users.includes(userId);
        const users = hasMe
          ? existing.users.filter((u) => u !== userId)
          : [...existing.users, userId];
        next =
          users.length > 0
            ? prev.map((r) => (r.emoji === emoji ? { ...r, users } : r))
            : prev.filter((r) => r.emoji !== emoji);
      } else {
        next = [...prev, { emoji, users: [userId] }];
      }
      saveReactions(subjectId, next);
      return next;
    });
    setPickerOpen(false);
  };

  const sorted = useMemo(
    () => [...reactions].sort((a, b) => b.users.length - a.users.length),
    [reactions],
  );

  if (compact && sorted.length === 0 && !pickerOpen) {
    return (
      <div
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          opacity: 0.6,
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.6")}
      >
        <AddButton onClick={() => setPickerOpen(true)} />
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        flexWrap: "wrap",
        position: "relative",
      }}
    >
      {sorted.map((r) => {
        const mine = r.users.includes(userId);
        return (
          <button
            key={r.emoji}
            type="button"
            onClick={() => toggle(r.emoji)}
            aria-pressed={mine ? "true" : "false"}
            aria-label={`${r.emoji} · ${r.users.length} reaction${r.users.length === 1 ? "" : "s"}`}
            title={r.users.join(", ")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "2px 9px",
              borderRadius: 999,
              border: `1px solid ${mine ? "var(--vyne-accent, var(--vyne-purple))" : "var(--content-border)"}`,
              background: mine
                ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.12)"
                : "var(--content-secondary)",
              fontSize: 12,
              fontWeight: 500,
              color: mine ? "var(--vyne-accent, var(--vyne-purple))" : "var(--text-primary)",
              cursor: "pointer",
              lineHeight: 1.4,
            }}
          >
            <span>{r.emoji}</span>
            <span style={{ fontSize: 11, fontWeight: 600 }}>{r.users.length}</span>
          </button>
        );
      })}
      <AddButton onClick={() => setPickerOpen((v) => !v)} />

      {pickerOpen && (
        <div
          role="menu"
          aria-label="Pick reaction"
          onMouseLeave={() => setPickerOpen(false)}
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: 0,
            zIndex: 40,
            padding: 6,
            borderRadius: 10,
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            boxShadow: "var(--shadow-lg)",
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 2,
            width: 180,
          }}
        >
          {QUICK_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => toggle(e)}
              aria-label={`React ${e}`}
              style={{
                width: 32,
                height: 32,
                borderRadius: 7,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 17,
                lineHeight: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(me) =>
                ((me.currentTarget as HTMLElement).style.background =
                  "var(--content-secondary)")
              }
              onMouseLeave={(me) =>
                ((me.currentTarget as HTMLElement).style.background =
                  "transparent")
              }
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Add reaction"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 26,
        height: 22,
        borderRadius: 999,
        border: "1px solid var(--content-border)",
        background: "var(--content-bg)",
        color: "var(--text-tertiary)",
        cursor: "pointer",
        fontSize: 11,
      }}
    >
      <Plus size={11} />
    </button>
  );
}
