"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  AlertTriangle,
  MessageSquare,
  GitPullRequest,
  Package,
  Bot,
  Clock,
  ChevronRight,
} from "lucide-react";

interface Notification {
  id: string;
  type: "mention" | "alert" | "deploy" | "order" | "ai" | "reminder";
  title: string;
  body: string;
  time: string;
  priority: "critical" | "high" | "medium" | "low";
  read: boolean;
  channel?: string;
  /** AI-explained reason for the priority assignment (set after re-rank). */
  aiReason?: string;
  aiScore?: number;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "alert",
    title: "Deployment Failed",
    body: "api-service v2.4.1 failed — Missing IAM permission. 47 orders affected, ~$12,400 at risk.",
    time: "7m ago",
    priority: "critical",
    read: false,
    channel: "#alerts",
  },
  {
    id: "n2",
    type: "mention",
    title: "Sarah K. mentioned you",
    body: "@Preet can you review the Acme Corp contract before EOD?",
    time: "12m ago",
    priority: "high",
    read: false,
    channel: "#general",
  },
  {
    id: "n3",
    type: "order",
    title: "Order Requires Approval",
    body: "PO-2047 from TechWorld Inc — $8,450. Awaiting your approval.",
    time: "25m ago",
    priority: "high",
    read: false,
  },
  {
    id: "n4",
    type: "ai",
    title: "AI Insight",
    body: "Revenue trend: 3 large orders cancelled this week. Churn risk for 2 accounts detected.",
    time: "1h ago",
    priority: "medium",
    read: false,
  },
  {
    id: "n5",
    type: "deploy",
    title: "Deploy Succeeded",
    body: "auth-service v1.8.2 deployed to production. All health checks green.",
    time: "2h ago",
    priority: "low",
    read: true,
    channel: "#deployments",
  },
  {
    id: "n6",
    type: "reminder",
    title: "Reminder",
    body: "Sprint retrospective at 3pm today.",
    time: "3h ago",
    priority: "low",
    read: true,
  },
];

const PRIORITY_CONFIG: Record<
  string,
  { color: string; bg: string; label: string; rank: number }
> = {
  critical: {
    color: "#EF4444",
    bg: "rgba(239,68,68,0.08)",
    label: "CRITICAL",
    rank: 0,
  },
  high: {
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.08)",
    label: "HIGH",
    rank: 1,
  },
  medium: {
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.08)",
    label: "MEDIUM",
    rank: 2,
  },
  low: {
    color: "var(--text-secondary)",
    bg: "rgba(107,107,138,0.06)",
    label: "LOW",
    rank: 3,
  },
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  mention: MessageSquare,
  alert: AlertTriangle,
  deploy: GitPullRequest,
  order: Package,
  ai: Bot,
  reminder: Clock,
};

interface NotificationPanelProps {
  readonly onClose: () => void;
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [reranking, setReranking] = useState(false);
  const [rerankProvider, setRerankProvider] = useState<string | null>(null);

  async function aiRerank() {
    setReranking(true);
    try {
      const res = await fetch("/api/ai/rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: notifications.map((n) => ({
            id: n.id,
            text: `${n.title} — ${n.body}`,
            context: `${n.type} in ${n.channel ?? "DM"}`,
          })),
        }),
      });
      const data = (await res.json()) as {
        ranked?: Array<{
          id: string;
          priority: "critical" | "high" | "medium" | "low";
          reason: string;
          score: number;
        }>;
        provider?: string;
      };
      if (data.ranked) {
        const byId = new Map(data.ranked.map((r) => [r.id, r]));
        setNotifications((prev) =>
          prev.map((n) => {
            const r = byId.get(n.id);
            if (!r) return n;
            return {
              ...n,
              priority: r.priority,
              aiReason: r.reason,
              aiScore: r.score,
            };
          }),
        );
      }
      setRerankProvider(data.provider ?? null);
    } catch {
      // swallow — keep existing priorities
    } finally {
      setReranking(false);
    }
  }

  // AI-ranked: sort by priority then time
  const sorted = [...notifications]
    .filter((n) => filter === "all" || !n.read)
    .sort(
      (a, b) =>
        PRIORITY_CONFIG[a.priority].rank - PRIORITY_CONFIG[b.priority].rank,
    );

  function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      style={{
        position: "absolute",
        bottom: 70,
        right: 16,
        width: 380,
        maxHeight: 460,
        zIndex: 40,
        background: "var(--content-bg, #fff)",
        border: "1px solid var(--content-border, var(--content-border))",
        borderRadius: 14,
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 16px 10px",
          borderBottom:
            "1px solid var(--content-border, var(--content-border))",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--text-primary, var(--text-primary))",
              }}
            >
              Notifications
            </span>
            {unreadCount > 0 && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#fff",
                  background: "#EF4444",
                  padding: "1px 7px",
                  borderRadius: 10,
                }}
              >
                {unreadCount}
              </span>
            )}
            <span
              style={{
                fontSize: 10,
                color: "var(--vyne-accent, #06B6D4)",
                background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.1)",
                padding: "2px 6px",
                borderRadius: 4,
                fontWeight: 600,
              }}
            >
              AI RANKED
            </span>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            type="button"
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--text-tertiary, var(--text-tertiary))",
              display: "flex",
              padding: 4,
              borderRadius: 5,
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 4 }}>
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{
                padding: "4px 12px",
                borderRadius: 6,
                border: "none",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                background:
                  filter === f ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.1)" : "transparent",
                color:
                  filter === f
                    ? "var(--vyne-accent, #06B6D4)"
                    : "var(--text-tertiary, var(--text-tertiary))",
                textTransform: "capitalize",
              }}
            >
              {f}
            </button>
          ))}
          <button
            type="button"
            onClick={aiRerank}
            disabled={reranking}
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 9px",
              borderRadius: 6,
              border: "1px solid var(--vyne-accent, var(--vyne-purple))",
              fontSize: 10,
              fontWeight: 600,
              cursor: reranking ? "default" : "pointer",
              background: rerankProvider
                ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.1)"
                : "transparent",
              color: "var(--vyne-accent, var(--vyne-purple))",
              opacity: reranking ? 0.6 : 1,
            }}
            title={
              rerankProvider
                ? `Last re-ranked via ${rerankProvider}`
                : "Re-prioritise with Vyne AI"
            }
          >
            {reranking ? "Ranking…" : "✨ AI rank"}
          </button>
          <button
            type="button"
            onClick={markAllRead}
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              border: "none",
              fontSize: 10,
              fontWeight: 500,
              cursor: "pointer",
              background: "transparent",
              color: "var(--text-tertiary, var(--text-tertiary))",
            }}
          >
            Mark all read
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div
        className="content-scroll"
        style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}
      >
        {sorted.length === 0 ? (
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
              color: "var(--text-tertiary, var(--text-tertiary))",
              fontSize: 13,
            }}
          >
            No notifications
          </div>
        ) : (
          sorted.map((notif) => {
            const Icon = TYPE_ICONS[notif.type] || MessageSquare;
            const pConfig = PRIORITY_CONFIG[notif.priority];
            return (
              <button
                key={notif.id}
                type="button"
                onClick={() => markRead(notif.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  gap: 10,
                  padding: "10px 16px",
                  border: "none",
                  borderLeft: notif.read
                    ? "3px solid transparent"
                    : `3px solid ${pConfig.color}`,
                  background: notif.read ? "transparent" : pConfig.bg,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.15s",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: `${pConfig.color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <Icon size={15} color={pConfig.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: notif.read ? 500 : 700,
                        color: "var(--text-primary, var(--text-primary))",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {notif.title}
                    </span>
                    {!notif.read && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: pConfig.color,
                          padding: "1px 5px",
                          borderRadius: 3,
                          background: `${pConfig.color}18`,
                          flexShrink: 0,
                        }}
                      >
                        {pConfig.label}
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--text-secondary, var(--text-secondary))",
                      lineHeight: 1.4,
                      margin: 0,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {notif.body}
                  </p>
                  {notif.aiReason && (
                    <div
                      style={{
                        marginTop: 5,
                        padding: "3px 8px",
                        borderRadius: 5,
                        background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.08)",
                        border: "1px solid rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.18)",
                        fontSize: 10,
                        color: "var(--vyne-accent, var(--vyne-purple))",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                      title={`AI score ${notif.aiScore ?? ""}`}
                    >
                      ✨ {notif.aiReason}
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text-tertiary, var(--text-tertiary))",
                      }}
                    >
                      {notif.time}
                    </span>
                    {notif.channel && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--vyne-accent, #06B6D4)",
                          fontWeight: 500,
                        }}
                      >
                        {notif.channel}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight
                  size={14}
                  style={{
                    color: "var(--text-tertiary, var(--text-tertiary))",
                    flexShrink: 0,
                    alignSelf: "center",
                  }}
                />
              </button>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
