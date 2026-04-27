"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pin, ChevronDown, X as XIcon } from "lucide-react";
import { usePinnedMessagesStore } from "@/lib/stores/pinnedMessages";

interface PinnedBarProps {
  readonly channelId: string;
}

/**
 * Compact horizontal bar at the top of a chat channel showing pinned
 * messages. Shows the most recent pinned item by default; expands to
 * a dropdown with all pins on click.
 */
export function PinnedBar({ channelId }: PinnedBarProps) {
  const pinned = usePinnedMessagesStore((s) => s.byChannel[channelId] ?? []);
  const unpin = usePinnedMessagesStore((s) => s.unpin);
  const [open, setOpen] = useState(false);

  if (pinned.length === 0) return null;

  // Show most recently pinned at top
  const ordered = [...pinned].sort(
    (a, b) =>
      new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime(),
  );
  const top = ordered[0];

  return (
    <div
      style={{
        position: "relative",
        padding: "8px 18px",
        background: "rgba(245, 158, 11, 0.06)",
        borderBottom: "1px solid var(--content-border)",
        flexShrink: 0,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 6px",
          borderRadius: 6,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          color: "var(--text-primary)",
        }}
      >
        <Pin size={13} style={{ color: "#F59E0B", flexShrink: 0 }} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#F59E0B",
            textTransform: "uppercase",
            letterSpacing: 0.4,
            flexShrink: 0,
          }}
        >
          Pinned
        </span>
        <span
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flex: 1,
            minWidth: 0,
          }}
        >
          <strong style={{ color: "var(--text-primary)" }}>
            {top.message.author.name}:
          </strong>{" "}
          {top.message.content}
        </span>
        {pinned.length > 1 && (
          <span
            style={{
              padding: "1px 6px",
              borderRadius: 99,
              background: "rgba(245, 158, 11, 0.18)",
              color: "#F59E0B",
              fontSize: 10,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            +{pinned.length - 1}
          </span>
        )}
        <ChevronDown
          size={13}
          style={{
            color: "var(--text-tertiary)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
            flexShrink: 0,
          }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 18,
              right: 18,
              maxWidth: 560,
              background: "var(--content-bg)",
              border: "1px solid var(--content-border)",
              borderRadius: 10,
              boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
              padding: 6,
              zIndex: 30,
              maxHeight: 360,
              overflowY: "auto",
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                padding: "8px 10px 4px",
              }}
            >
              {pinned.length} pinned message{pinned.length === 1 ? "" : "s"}
            </div>
            {ordered.map((p) => (
              <div
                key={p.message.id}
                style={{
                  display: "flex",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 7,
                  alignItems: "flex-start",
                }}
              >
                <Pin
                  size={11}
                  style={{
                    color: "#F59E0B",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      marginBottom: 2,
                    }}
                  >
                    {p.message.author.name}
                    <span
                      style={{
                        fontWeight: 400,
                        color: "var(--text-tertiary)",
                        marginLeft: 6,
                        fontSize: 10,
                      }}
                    >
                      pinned by {p.pinnedBy} ·{" "}
                      {new Date(p.pinnedAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      lineHeight: 1.4,
                      wordBreak: "break-word",
                    }}
                  >
                    {p.message.content}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => unpin(channelId, p.message.id)}
                  aria-label="Unpin"
                  title="Unpin"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 5,
                    border: "none",
                    background: "transparent",
                    color: "var(--text-tertiary)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <XIcon size={11} />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
