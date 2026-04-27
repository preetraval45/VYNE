"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  GitBranch,
  AlertCircle,
  CreditCard,
  TrendingUp,
  GitPullRequest,
  Bell,
  Zap,
  Filter,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  useTimelineStore,
  type TimelineEvent,
  type TimelineSource,
} from "@/lib/stores/timeline";

const SOURCE_META: Record<
  TimelineSource,
  { label: string; color: string; bg: string }
> = {
  github: { label: "GitHub", color: "#fff", bg: "#24292e" },
  sentry: { label: "Sentry", color: "#fff", bg: "#362d59" },
  datadog: { label: "Datadog", color: "#fff", bg: "#632ca6" },
  stripe: { label: "Stripe", color: "#fff", bg: "#635bff" },
  hubspot: { label: "HubSpot", color: "#fff", bg: "#ff7a59" },
  linear: { label: "Linear", color: "#fff", bg: "#5e6ad2" },
  pagerduty: { label: "PagerDuty", color: "#fff", bg: "#06ac38" },
  slack: { label: "Slack", color: "#fff", bg: "#4a154b" },
  vyne: { label: "VYNE AI", color: "#fff", bg: "#6C47FF" },
};

const KIND_ICON = (kind: string) => {
  switch (kind) {
    case "deploy":
    case "release":
      return GitBranch;
    case "pr_merged":
    case "pr_opened":
    case "push":
      return GitPullRequest;
    case "alert":
    case "incident":
    case "error_spike":
      return AlertCircle;
    case "deal_won":
    case "deal_lost":
    case "deal_advanced":
    case "new_customer":
    case "churn":
      return CreditCard;
    case "issue_created":
    case "issue_resolved":
      return Activity;
    case "comment":
      return Sparkles;
    default:
      return Bell;
  }
};

export default function TimelinePage() {
  const events = useTimelineStore((s) => s.events);
  const ingestMany = useTimelineStore((s) => s.ingestMany);
  const [filter, setFilter] = useState<TimelineSource | "all">("all");
  const [polling, setPolling] = useState(false);

  // Pull live GitHub webhook events from the buffer on demand
  async function syncGithub() {
    setPolling(true);
    try {
      const res = await fetch("/api/integrations/github/webhook");
      if (!res.ok) return;
      const data = (await res.json()) as { events: TimelineEvent[] };
      if (data.events?.length > 0) {
        ingestMany(data.events);
      }
    } finally {
      setPolling(false);
    }
  }

  // Auto-poll every 30s while the page is open
  useEffect(() => {
    void syncGithub();
    const t = setInterval(() => void syncGithub(), 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return events;
    return events.filter((e) => e.source === filter);
  }, [events, filter]);

  // Group by day
  const byDay = useMemo(() => {
    const groups = new Map<string, TimelineEvent[]>();
    for (const e of filtered) {
      const d = new Date(e.timestamp);
      const key = d.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(e);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  const sources: Array<TimelineSource | "all"> = [
    "all",
    "github",
    "sentry",
    "stripe",
    "hubspot",
    "linear",
    "pagerduty",
    "vyne",
  ];

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--content-bg)",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--content-border)",
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(108, 71, 255, 0.15)",
              color: "var(--vyne-purple)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Zap size={18} />
          </div>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              Timeline
            </h1>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              Every event across your stack — deploys, alerts, deals,
              billing — on one feed
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={syncGithub}
          disabled={polling}
          style={{
            marginLeft: "auto",
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid var(--content-border)",
            background: "var(--content-secondary)",
            color: "var(--text-secondary)",
            fontSize: 11,
            fontWeight: 500,
            cursor: polling ? "default" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <RefreshCw
            size={11}
            style={{
              animation: polling ? "spin 1s linear infinite" : "none",
            }}
          />
          Sync GitHub
        </button>
      </header>

      <div
        style={{
          padding: "10px 20px",
          borderBottom: "1px solid var(--content-border)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          overflowX: "auto",
        }}
      >
        <Filter size={12} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
        {sources.map((s) => {
          const isAll = s === "all";
          const count = isAll
            ? events.length
            : events.filter((e) => e.source === s).length;
          if (!isAll && count === 0) return null;
          const meta = isAll
            ? { label: "All", color: "var(--text-primary)", bg: "var(--content-secondary)" }
            : SOURCE_META[s];
          const active = filter === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              style={{
                padding: "5px 10px",
                borderRadius: 99,
                border: active
                  ? "1px solid var(--vyne-purple)"
                  : "1px solid var(--content-border)",
                background: active ? "rgba(108, 71, 255, 0.12)" : meta.bg,
                color: active ? "var(--vyne-purple)" : meta.color,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
            >
              {meta.label}
              <span
                style={{
                  fontVariantNumeric: "tabular-nums",
                  opacity: 0.8,
                }}
              >
                · {count}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className="content-scroll"
        style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}
      >
        {byDay.length === 0 && (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: 13,
            }}
          >
            No events yet — connect GitHub via{" "}
            <code
              style={{
                padding: "1px 6px",
                borderRadius: 4,
                background: "var(--content-secondary)",
                fontSize: 11,
              }}
            >
              /api/integrations/github/webhook
            </code>{" "}
            to start ingesting real events.
          </div>
        )}
        {byDay.map(([day, dayEvents]) => (
          <section key={day} style={{ marginBottom: 24 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 10,
                position: "sticky",
                top: 0,
                background: "var(--content-bg)",
                padding: "4px 0",
                zIndex: 1,
              }}
            >
              {day} · {dayEvents.length} event
              {dayEvents.length === 1 ? "" : "s"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {dayEvents.map((e) => (
                <TimelineRow key={e.id} event={e} />
              ))}
            </div>
          </section>
        ))}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function TimelineRow({ event: e }: { readonly event: TimelineEvent }) {
  const meta = SOURCE_META[e.source];
  const Icon = KIND_ICON(e.kind);
  const time = new Date(e.timestamp).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const sevColor =
    e.severity && e.severity >= 3
      ? "#EF4444"
      : e.severity && e.severity >= 2
        ? "#F59E0B"
        : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: "flex",
        gap: 12,
        padding: 12,
        borderRadius: 10,
        border: "1px solid var(--content-border)",
        background: "var(--content-bg)",
        borderLeft: sevColor
          ? `3px solid ${sevColor}`
          : `3px solid ${meta.bg}`,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: meta.bg,
          color: meta.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={14} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 3,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              padding: "1px 7px",
              borderRadius: 5,
              background: meta.bg,
              color: meta.color,
              fontSize: 9,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {meta.label}
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              lineHeight: 1.35,
            }}
          >
            {e.title}
          </span>
          {e.amountUSD !== undefined && (
            <span
              style={{
                padding: "1px 7px",
                borderRadius: 5,
                background: "rgba(34, 197, 94, 0.12)",
                color: "#22C55E",
                fontSize: 10,
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              ${e.amountUSD.toLocaleString()}
            </span>
          )}
        </div>
        {e.detail && (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: 1.45,
            }}
          >
            {e.detail}
          </div>
        )}
        {e.customer && (
          <div
            style={{
              marginTop: 4,
              fontSize: 10.5,
              color: "var(--text-tertiary)",
            }}
          >
            <TrendingUp size={10} style={{ display: "inline" }} /> {e.customer}
          </div>
        )}
      </div>
      <div
        style={{
          fontSize: 10.5,
          color: "var(--text-tertiary)",
          fontVariantNumeric: "tabular-nums",
          flexShrink: 0,
          alignSelf: "flex-start",
          marginTop: 2,
        }}
      >
        {time}
      </div>
    </motion.div>
  );
}
