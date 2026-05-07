"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  AtSign,
  MessageSquare,
  Check,
  AlertTriangle,
  Calendar,
  GitBranch,
  Clock,
  Inbox,
  X,
} from "lucide-react";
import {
  useNotificationCenter,
  type NotificationItem,
  type NotificationType,
  type ModuleId,
} from "@/lib/stores/notificationCenter";
import {
  subscribe,
  publishFromClient,
  isRealtimeEnabled,
} from "@/lib/realtime";
import { useAuthStore } from "@/lib/stores/auth";

/**
 * NotificationBell — the unified inbox icon. Pure UI; reads from
 * `useNotificationCenter` so any module / hook / API can `pushNotification(...)`
 * and the bell updates without prop drilling.
 *
 * Drops in the topbar. Click → grouped, filterable dropdown with
 * mark-read, snooze, deep-link, and clear-all.
 */

type FilterMode = "all" | "unread" | "mentions";

const SNOOZE_PRESETS: ReadonlyArray<{ label: string; mins: number }> = [
  { label: "1 hour", mins: 60 },
  { label: "Until tomorrow", mins: 60 * 24 },
  { label: "Until next week", mins: 60 * 24 * 7 },
];

function iconFor(type: NotificationType) {
  switch (type) {
    case "mention":
      return AtSign;
    case "assigned":
      return Check;
    case "comment":
    case "message":
      return MessageSquare;
    case "approval":
      return Check;
    case "due":
      return Calendar;
    case "deploy":
      return GitBranch;
    case "alert":
      return AlertTriangle;
    case "status":
    case "info":
    default:
      return Inbox;
  }
}

function relative(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h`;
  return `${Math.round(diff / 86_400_000)}d`;
}

function priorityColor(p: NotificationItem["priority"]): string {
  switch (p) {
    case "critical":
      return "var(--status-danger, #EF4444)";
    case "high":
      return "var(--status-warning, #F59E0B)";
    case "low":
      return "var(--text-tertiary)";
    case "normal":
    default:
      return "var(--vyne-accent, var(--vyne-purple))";
  }
}

export function NotificationBell() {
  const items = useNotificationCenter((s) => s.items);
  const markRead = useNotificationCenter((s) => s.markRead);
  const markAllRead = useNotificationCenter((s) => s.markAllRead);
  const remove = useNotificationCenter((s) => s.remove);
  const snooze = useNotificationCenter((s) => s.snooze);
  const clear = useNotificationCenter((s) => s.clear);
  const me = useAuthStore((s) => s.user);

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [snoozeFor, setSnoozeFor] = useState<string | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // 13.8 — cross-device read state. Each user has a private channel
  // `presence-notifications-${userId}`. When this tab marks something
  // read, broadcast to siblings; on receive, mirror without rebroadcast.
  const myId = me?.id ?? me?.email ?? null;
  useEffect(() => {
    if (!myId || !isRealtimeEnabled()) return;
    const channel = `presence-notifications-${myId}`;
    const offRead = subscribe<{ id: string }>(channel, "notif:read", ({ id }) => {
      // Don't echo: the store check inside markRead is a no-op if already read.
      markRead(id);
    });
    const offReadAll = subscribe<{ ts: number }>(channel, "notif:read-all", () => {
      markAllRead();
    });
    return () => {
      offRead();
      offReadAll();
    };
  }, [myId, markRead, markAllRead]);

  const broadcastRead = (id: string) => {
    if (!myId || !isRealtimeEnabled()) return;
    void publishFromClient(`presence-notifications-${myId}`, "notif:read", { id });
  };
  const broadcastReadAll = () => {
    if (!myId || !isRealtimeEnabled()) return;
    void publishFromClient(`presence-notifications-${myId}`, "notif:read-all", {
      ts: Date.now(),
    });
  };

  // Visible items: drop snoozed-future, apply filter.
  const visible = useMemo(() => {
    const now = Date.now();
    return items
      .filter((i) =>
        !i.snoozedUntil || new Date(i.snoozedUntil).getTime() <= now,
      )
      .filter((i) => {
        if (filter === "unread") return !i.readAt;
        if (filter === "mentions") return i.type === "mention";
        return true;
      });
  }, [items, filter]);

  const unread = useMemo(
    () =>
      items.filter(
        (i) =>
          !i.readAt &&
          (!i.snoozedUntil ||
            new Date(i.snoozedUntil).getTime() <= Date.now()),
      ).length,
    [items],
  );

  // Group consecutive items by entityKey (or by id if no key).
  const grouped = useMemo(() => {
    const out: Array<{ key: string; rows: NotificationItem[] }> = [];
    for (const row of visible) {
      const key = row.entityKey ?? row.id;
      const last = out[out.length - 1];
      if (last && last.key === key) last.rows.push(row);
      else out.push({ key, rows: [row] });
    }
    return out;
  }, [visible]);

  // Click-outside / Esc dismiss.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (
        popRef.current?.contains(e.target as Node) ||
        btnRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
      setSnoozeFor(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setSnoozeFor(null);
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={
          unread > 0
            ? `Notifications · ${unread} unread`
            : "Notifications"
        }
        aria-haspopup="dialog"
        aria-expanded={open ? "true" : "false"}
        style={{
          position: "relative",
          width: 32,
          height: 32,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          border: "1px solid transparent",
          background: open ? "var(--content-secondary)" : "transparent",
          color: "var(--text-secondary)",
          cursor: "pointer",
        }}
      >
        <Bell size={16} />
        {unread > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              minWidth: 14,
              height: 14,
              padding: "0 4px",
              borderRadius: 999,
              background: "var(--status-danger, #EF4444)",
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
              lineHeight: "14px",
              textAlign: "center",
              border: "2px solid var(--content-bg)",
              boxSizing: "content-box",
            }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={popRef}
          role="dialog"
          aria-label="Notifications"
          style={{
            position: "absolute",
            top: 44,
            right: 8,
            width: 380,
            maxWidth: "calc(100vw - 16px)",
            maxHeight: "min(560px, 80vh)",
            display: "flex",
            flexDirection: "column",
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 12,
            boxShadow: "var(--shadow-lg, 0 12px 32px rgba(0,0,0,0.18))",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <header
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              borderBottom: "1px solid var(--content-border)",
            }}
          >
            <strong style={{ fontSize: 13, color: "var(--text-primary)" }}>
              Notifications
            </strong>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                type="button"
                onClick={() => {
                  markAllRead();
                  broadcastReadAll();
                }}
                disabled={unread === 0}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "none",
                  background: "transparent",
                  color:
                    unread === 0
                      ? "var(--text-tertiary)"
                      : "var(--vyne-accent, var(--vyne-purple))",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: unread === 0 ? "default" : "pointer",
                }}
              >
                Mark all read
              </button>
              <button
                type="button"
                onClick={clear}
                disabled={items.length === 0}
                aria-label="Clear all"
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "none",
                  background: "transparent",
                  color: "var(--text-tertiary)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: items.length === 0 ? "default" : "pointer",
                }}
              >
                Clear
              </button>
            </div>
          </header>

          {/* Filter tabs */}
          <div
            role="tablist"
            aria-label="Filter notifications"
            style={{
              display: "flex",
              gap: 4,
              padding: "8px 12px",
              borderBottom: "1px solid var(--content-border)",
            }}
          >
            {(["all", "unread", "mentions"] as FilterMode[]).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 999,
                  border: "1px solid",
                  borderColor:
                    filter === f
                      ? "var(--vyne-accent, var(--vyne-purple))"
                      : "var(--content-border)",
                  background:
                    filter === f
                      ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.10)"
                      : "transparent",
                  color:
                    filter === f
                      ? "var(--vyne-accent, var(--vyne-purple))"
                      : "var(--text-secondary)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Body */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: visible.length === 0 ? 0 : 6,
            }}
          >
            {visible.length === 0 && (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "var(--text-tertiary)",
                  fontSize: 12,
                }}
              >
                <Inbox
                  size={28}
                  style={{ margin: "0 auto 10px", opacity: 0.5 }}
                />
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  You're all caught up
                </div>
                <div style={{ fontSize: 11 }}>
                  No {filter === "all" ? "notifications" : filter} right now.
                </div>
              </div>
            )}

            {grouped.map(({ key, rows }) => {
              const head = rows[0];
              const Icon = iconFor(head.type);
              return (
                <div
                  key={key}
                  style={{
                    padding: "8px 8px",
                    borderRadius: 8,
                    background: head.readAt
                      ? "transparent"
                      : "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.06)",
                    marginBottom: 4,
                  }}
                >
                  {rows.map((row, idx) => (
                    <NotificationRow
                      key={row.id}
                      row={row}
                      icon={Icon}
                      compact={idx > 0}
                      isSnoozeOpen={snoozeFor === row.id}
                      onClick={() => {
                        markRead(row.id);
                        broadcastRead(row.id);
                        if (row.href) {
                          setOpen(false);
                          if (typeof window !== "undefined") {
                            window.location.href = row.href;
                          }
                        }
                      }}
                      onMarkRead={() => {
                        markRead(row.id);
                        broadcastRead(row.id);
                      }}
                      onRemove={() => remove(row.id)}
                      onOpenSnooze={() =>
                        setSnoozeFor(snoozeFor === row.id ? null : row.id)
                      }
                      onSnoozePick={(mins) => {
                        snooze(
                          row.id,
                          new Date(Date.now() + mins * 60_000).toISOString(),
                        );
                        setSnoozeFor(null);
                      }}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

function NotificationRow({
  row,
  icon: Icon,
  compact,
  isSnoozeOpen,
  onClick,
  onMarkRead,
  onRemove,
  onOpenSnooze,
  onSnoozePick,
}: {
  row: NotificationItem;
  icon: React.ComponentType<{ size?: number }>;
  compact: boolean;
  isSnoozeOpen: boolean;
  onClick: () => void;
  onMarkRead: () => void;
  onRemove: () => void;
  onOpenSnooze: () => void;
  onSnoozePick: (mins: number) => void;
}) {
  const color = priorityColor(row.priority);
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        gap: 10,
        padding: compact ? "6px 8px 6px 36px" : "10px 8px",
        borderTop: compact ? "1px dashed var(--content-border)" : undefined,
      }}
    >
      {!compact && (
        <span
          aria-hidden="true"
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: `${color}1A`,
            color,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={12} />
        </span>
      )}
      <button
        type="button"
        onClick={onClick}
        style={{
          flex: 1,
          textAlign: "left",
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: row.href ? "pointer" : "default",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          minWidth: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: row.readAt ? 500 : 700,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
              flex: 1,
            }}
          >
            {row.title}
          </span>
          {!row.readAt && (
            <span
              aria-label="Unread"
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: color,
                flexShrink: 0,
              }}
            />
          )}
        </div>
        {row.body && (
          <span
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {row.body}
          </span>
        )}
        <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
          {row.module} · {relative(row.createdAt)}
        </span>
      </button>
      <div
        style={{
          display: "flex",
          gap: 2,
          alignSelf: "flex-start",
          opacity: 0.7,
        }}
      >
        {!row.readAt && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead();
            }}
            aria-label="Mark read"
            title="Mark read"
            style={iconBtnStyle}
          >
            <Check size={11} />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenSnooze();
          }}
          aria-label="Snooze"
          aria-expanded={isSnoozeOpen ? "true" : "false"}
          title="Snooze"
          style={iconBtnStyle}
        >
          <Clock size={11} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Dismiss"
          title="Dismiss"
          style={iconBtnStyle}
        >
          <X size={11} />
        </button>
      </div>

      {isSnoozeOpen && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: 36,
            right: 8,
            zIndex: 5,
            padding: 4,
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 8,
            boxShadow: "var(--shadow-md, 0 6px 16px rgba(0,0,0,0.12))",
            minWidth: 160,
          }}
        >
          {SNOOZE_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              role="menuitem"
              onClick={() => onSnoozePick(p.mins)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "6px 8px",
                borderRadius: 6,
                border: "none",
                background: "transparent",
                color: "var(--text-primary)",
                fontSize: 12,
                cursor: "pointer",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "var(--content-secondary)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "transparent")
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "transparent",
  color: "var(--text-tertiary)",
  borderRadius: 4,
  cursor: "pointer",
};

// Re-export the module type so callers don't need to import from two places.
export type { ModuleId };
