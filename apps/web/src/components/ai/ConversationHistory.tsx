"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Pin,
  PinOff,
  Trash2,
  Search,
  X,
  MessageSquare,
} from "lucide-react";
import { useAiMemoryStore } from "@/lib/stores/aiMemory";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (conversationId: string | null) => void;
}

/**
 * Conversation history rail. Lists every saved AI conversation, pinned
 * first, with search + delete + pin actions. Tapping one calls onSelect
 * so the parent can load it into the message list.
 *
 * Renders as an inline left rail at ≥1024px and as an off-canvas
 * drawer at <1024px (open prop controls drawer visibility).
 */
export function ConversationHistory({ open, onClose, onSelect }: Props) {
  const allConversations = useAiMemoryStore((s) => s.conversations);
  const currentUserId = useAiMemoryStore((s) => s.currentUserId);
  const activeId = useAiMemoryStore((s) => s.activeConversationId);
  const togglePin = useAiMemoryStore((s) => s.togglePinConversation);
  const remove = useAiMemoryStore((s) => s.deleteConversation);
  const setActive = useAiMemoryStore((s) => s.setActiveConversation);

  const [query, setQuery] = useState("");

  // Only show conversations belonging to the signed-in user.
  const conversations = useMemo(
    () => allConversations.filter((c) => c.userId === currentUserId),
    [allConversations, currentUserId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? conversations.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            c.messages.some((m) => m.content.toLowerCase().includes(q)),
        )
      : conversations;
    return [...list].sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [conversations, query]);

  function startNew() {
    setActive(null);
    onSelect(null);
    onClose();
  }

  function pickConv(id: string) {
    setActive(id);
    onSelect(id);
    onClose();
  }

  return (
    <>
      {open && (
        <div
          className="ai-history-backdrop"
          aria-hidden="true"
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 60,
            animation: "fadeIn 0.18s ease-out both",
          }}
        />
      )}
      <aside
        className={`ai-history${open ? " ai-history--open" : ""}`}
        aria-label="Vyne AI conversations"
        style={{
          width: 280,
          background: "var(--content-bg)",
          borderRight: "1px solid var(--content-border)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <header
          style={{
            padding: "12px 14px 8px",
            borderBottom: "1px solid var(--content-border)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <h2
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
              letterSpacing: "-0.01em",
              flex: 1,
            }}
          >
            Conversations
          </h2>
          <button
            type="button"
            onClick={startNew}
            aria-label="Start new conversation"
            title="New conversation"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "5px 10px",
              borderRadius: 8,
              border: "1px solid var(--vyne-teal)",
              background: "var(--vyne-teal-soft)",
              color: "var(--vyne-teal)",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={12} />
            New
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close history"
            className="ai-history-close-btn"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              background: "var(--content-secondary)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "none",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={13} />
          </button>
        </header>

        <div style={{ padding: "8px 12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
              borderRadius: 8,
              background: "var(--content-secondary)",
              border: "1px solid var(--content-border)",
            }}
          >
            <Search size={12} style={{ color: "var(--text-tertiary)" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations…"
              aria-label="Search conversations"
              style={{
                flex: 1,
                minWidth: 0,
                padding: 0,
                border: "none",
                outline: "none",
                background: "transparent",
                color: "var(--text-primary)",
                fontSize: 12.5,
              }}
            />
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "4px 8px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {filtered.length === 0 && (
            <div
              style={{
                padding: "32px 12px",
                textAlign: "center",
                color: "var(--text-tertiary)",
                fontSize: 12,
              }}
            >
              <MessageSquare
                size={20}
                style={{ marginBottom: 8, opacity: 0.5 }}
              />
              <div style={{ marginBottom: 4, fontWeight: 600 }}>
                {query ? "No matches" : "No conversations yet"}
              </div>
              <div style={{ opacity: 0.8 }}>
                {query
                  ? "Try a different keyword."
                  : "Start a new chat to see it here."}
              </div>
            </div>
          )}
          {filtered.map((c) => {
            const active = c.id === activeId;
            const preview = c.messages[c.messages.length - 1]?.content ?? "";
            // Show year on conversations older than the current year so
            // "Apr 28" doesn't ambiguously refer to either 2025 or 2026.
            const updated = new Date(c.updatedAt);
            const thisYear = new Date().getFullYear();
            const when = updated.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              ...(updated.getFullYear() !== thisYear
                ? { year: "numeric" }
                : {}),
            });
            return (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  gap: 4,
                  padding: 4,
                  borderRadius: 8,
                  background: active
                    ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.10)"
                    : "transparent",
                  border: `1px solid ${
                    active ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.35)" : "transparent"
                  }`,
                  transition: "background 0.15s, border-color 0.15s",
                }}
              >
                <button
                  type="button"
                  onClick={() => pickConv(c.id)}
                  aria-current={active ? "page" : undefined}
                  aria-label={`Open conversation: ${c.title}`}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    textAlign: "left",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "var(--text-primary)",
                    padding: "6px 8px",
                    borderRadius: 6,
                    fontFamily: "inherit",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 2,
                    }}
                  >
                    {c.pinned && (
                      <Pin
                        size={10}
                        fill="currentColor"
                        style={{ color: "var(--vyne-teal)", flexShrink: 0 }}
                      />
                    )}
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                      }}
                    >
                      {c.title}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text-tertiary)",
                        flexShrink: 0,
                      }}
                    >
                      {when}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "var(--text-tertiary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {preview.slice(0, 80) || "—"}
                  </div>
                </button>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: 2,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => togglePin(c.id)}
                    aria-label={c.pinned ? "Unpin" : "Pin"}
                    title={c.pinned ? "Unpin" : "Pin"}
                    style={miniBtnStyle(!!c.pinned)}
                  >
                    {c.pinned ? <PinOff size={11} /> : <Pin size={11} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete "${c.title}"?`)) remove(c.id);
                    }}
                    aria-label="Delete"
                    title="Delete"
                    style={miniBtnStyle(false)}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      <style jsx global>{`
        @media (max-width: 1023px) {
          .ai-history {
            position: fixed;
            top: 48px;
            left: 0;
            bottom: 0;
            z-index: 65;
            transform: translateX(-100%);
            transition: transform 0.22s var(--ease-out-quart);
            box-shadow: 12px 0 36px rgba(0, 0, 0, 0.32);
          }
          .ai-history--open {
            transform: translateX(0);
          }
          .ai-history-close-btn {
            display: inline-flex !important;
          }
        }
        @media (min-width: 1024px) {
          .ai-history-backdrop {
            display: none;
          }
        }
      `}</style>
    </>
  );
}

function miniBtnStyle(pinned: boolean): React.CSSProperties {
  return {
    width: 22,
    height: 22,
    borderRadius: 5,
    border: "none",
    background: "transparent",
    color: pinned ? "var(--vyne-teal)" : "var(--text-tertiary)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
}
