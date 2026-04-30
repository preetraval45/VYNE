"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity as ActivityIcon,
  Search,
  Filter,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  GitCommit,
  MessageSquare,
  Package,
  DollarSign,
  Users,
  FileText,
} from "lucide-react";

type EventModule =
  | "projects"
  | "chat"
  | "ops"
  | "finance"
  | "ai"
  | "members"
  | "docs"
  | "deploy";

interface ActivityEvent {
  id: string;
  at: string;
  module: EventModule;
  actor: string;
  title: string;
  body: string;
  link?: string;
  severity?: "info" | "warning" | "critical";
}

const MODULE_META: Record<
  EventModule,
  { label: string; icon: React.ElementType; color: string }
> = {
  projects: { label: "Projects", icon: FileText, color: "var(--vyne-accent, #06B6D4)" },
  chat: { label: "Chat", icon: MessageSquare, color: "#3B82F6" },
  ops: { label: "ERP", icon: Package, color: "#F59E0B" },
  finance: { label: "Finance", icon: DollarSign, color: "#22C55E" },
  ai: { label: "AI", icon: Sparkles, color: "#EC4899" },
  members: { label: "Members", icon: Users, color: "#8B5CF6" },
  docs: { label: "Docs", icon: FileText, color: "#14B8A6" },
  deploy: { label: "Deploy", icon: GitCommit, color: "#EF4444" },
};

const EVENTS: ActivityEvent[] = [
  {
    id: "a1",
    at: "2026-04-14T14:22:00Z",
    module: "deploy",
    actor: "ci/cd",
    title: "api-service v2.4.1 deployment failed",
    body: "Missing IAM permission kms:Decrypt on staging-secrets KMS key. 47 orders stuck in processing.",
    severity: "critical",
    link: "/observe",
  },
  {
    id: "a2",
    at: "2026-04-14T14:24:00Z",
    module: "ai",
    actor: "Vyne AI",
    title: "Incident auto-detected + rollback queued",
    body: "Revenue at risk: $12,400. Suggested rollback to v2.4.0 — awaiting approval in #alerts.",
    severity: "warning",
    link: "/chat",
  },
  {
    id: "a3",
    at: "2026-04-14T13:08:00Z",
    module: "finance",
    actor: "Stripe",
    title: "Invoice INV-2026-042 paid",
    body: "Acme Corp · $1,920 · annual subscription renewal.",
    severity: "info",
    link: "/invoicing",
  },
  {
    id: "a4",
    at: "2026-04-14T12:45:00Z",
    module: "projects",
    actor: "Preet Raval",
    title: "Closed ENG-43 — Fix Secrets Manager IAM permission",
    body: "Shipped patch, verified in staging, ready for prod after rollback.",
    severity: "info",
    link: "/projects",
  },
  {
    id: "a5",
    at: "2026-04-14T11:02:00Z",
    module: "members",
    actor: "Preet Raval",
    title: "Invited sarah@vyne.ai as Admin",
    severity: "info",
    body: "Invitation email sent; pending acceptance.",
    link: "/settings",
  },
  {
    id: "a6",
    at: "2026-04-14T10:18:00Z",
    module: "ops",
    actor: "Vyne AI",
    title: "Stock critical: PWR-003 · 38 units left",
    body: "Reorder PO drafted with supplier. Lead time 14 days.",
    severity: "warning",
    link: "/ops",
  },
  {
    id: "a7",
    at: "2026-04-14T09:30:00Z",
    module: "chat",
    actor: "Tony M.",
    title: "Mentioned you in #alerts",
    body: "\"@Preet can you approve the rollback? Need sign-off before pushing.\"",
    severity: "info",
    link: "/chat",
  },
  {
    id: "a8",
    at: "2026-04-14T08:45:00Z",
    module: "docs",
    actor: "Sarah K.",
    title: "Published postmortem — April 10 AI outage",
    body: "Root cause, timeline, action items · 12-min read.",
    severity: "info",
    link: "/docs",
  },
  {
    id: "a9",
    at: "2026-04-13T18:24:00Z",
    module: "ai",
    actor: "Vyne AI",
    title: "Billing anomaly: AI token spend +4.2×",
    body: "Spike traced to Zapier integration calling /ai/query in a tight loop.",
    severity: "warning",
    link: "/settings",
  },
  {
    id: "a10",
    at: "2026-04-13T16:15:00Z",
    module: "projects",
    actor: "Preet Raval",
    title: "Deleted project PROJ-archived-2025",
    body: "Cleanup of inactive workspace.",
    severity: "info",
    link: "/projects",
  },
  {
    id: "a11",
    at: "2026-04-13T14:02:00Z",
    module: "members",
    actor: "Preet Raval",
    title: "Enabled 2FA",
    body: "Authenticator app · TOTP.",
    severity: "warning",
    link: "/settings",
  },
  {
    id: "a12",
    at: "2026-04-13T10:45:00Z",
    module: "ops",
    actor: "Tony M.",
    title: "Approved order ORD-1042 · $8,400",
    body: "Batch ships Monday.",
    severity: "info",
    link: "/ops",
  },
];

export default function ActivityTimelinePage() {
  const [query, setQuery] = useState("");
  const [modules, setModules] = useState<Set<EventModule>>(new Set());
  const [severity, setSeverity] = useState<"all" | "info" | "warning" | "critical">("all");

  const filtered = useMemo(() => {
    return EVENTS.filter((e) => {
      if (modules.size > 0 && !modules.has(e.module)) return false;
      if (severity !== "all" && (e.severity ?? "info") !== severity) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return (
          e.title.toLowerCase().includes(q) ||
          e.body.toLowerCase().includes(q) ||
          e.actor.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [query, modules, severity]);

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityEvent[]>();
    for (const e of filtered) {
      const day = e.at.slice(0, 10);
      const list = map.get(day) ?? [];
      list.push(e);
      map.set(day, list);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  function toggleModule(m: EventModule) {
    setModules((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  }

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          padding: "14px 24px",
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <ActivityIcon size={17} style={{ color: "var(--vyne-accent, var(--vyne-purple))" }} />
          Activity timeline
        </h1>
        <p
          style={{
            margin: "2px 0 0",
            fontSize: 12,
            color: "var(--text-tertiary)",
          }}
        >
          Every event across every module — chat, projects, ops, finance, AI —
          in one searchable stream.
        </p>
      </header>

      <div
        style={{
          padding: "12px 24px",
          borderBottom: "1px solid var(--content-border)",
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div
          style={{
            position: "relative",
            flex: "1 1 240px",
            maxWidth: 360,
          }}
        >
          <Search
            size={13}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-tertiary)",
            }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actor, title, or body…"
            aria-label="Search activity"
            style={{
              width: "100%",
              padding: "7px 10px 7px 30px",
              borderRadius: 8,
              border: "1px solid var(--input-border)",
              background: "var(--input-bg)",
              color: "var(--text-primary)",
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>

        <Filter size={14} style={{ color: "var(--text-tertiary)" }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {(Object.keys(MODULE_META) as EventModule[]).map((m) => {
            const meta = MODULE_META[m];
            const Icon = meta.icon;
            const on = modules.has(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() => toggleModule(m)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "5px 10px",
                  borderRadius: 999,
                  border: `1px solid ${on ? meta.color : "var(--content-border)"}`,
                  background: on ? `${meta.color}15` : "var(--content-bg)",
                  color: on ? meta.color : "var(--text-secondary)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Icon size={11} />
                {meta.label}
              </button>
            );
          })}
        </div>

        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as typeof severity)}
          aria-label="Severity filter"
          style={{
            padding: "6px 10px",
            borderRadius: 7,
            border: "1px solid var(--input-border)",
            background: "var(--input-bg)",
            color: "var(--text-primary)",
            fontSize: 12,
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="all">All severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>

        <div style={{ flex: 1 }} />
        <span
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
          }}
        >
          {filtered.length} of {EVENTS.length} events
        </span>
      </div>

      <div
        className="content-scroll"
        style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}
      >
        {grouped.length === 0 && (
          <div
            style={{
              padding: 60,
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: 13,
            }}
          >
            No events match your filters.
          </div>
        )}
        {grouped.map(([day, items]) => (
          <section key={day} style={{ marginBottom: 22 }}>
            <h2
              style={{
                margin: "0 0 10px",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-tertiary)",
              }}
            >
              {new Date(day).toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </h2>
            <ol
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                position: "relative",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: 13,
                  top: 4,
                  bottom: 4,
                  width: 2,
                  background: "var(--content-border)",
                }}
              />
              {items.map((e) => {
                const meta = MODULE_META[e.module];
                const Icon = meta.icon;
                return (
                  <li
                    key={e.id}
                    style={{
                      display: "flex",
                      gap: 14,
                      marginBottom: 12,
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: `${meta.color}15`,
                        color: meta.color,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        zIndex: 1,
                        border: `1.5px solid ${meta.color}`,
                      }}
                    >
                      <Icon size={13} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                          }}
                        >
                          {e.title}
                        </span>
                        {e.severity === "critical" && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                              padding: "1px 7px",
                              borderRadius: 999,
                              background: "var(--badge-danger-bg)",
                              color: "var(--badge-danger-text)",
                              fontSize: 9,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                            }}
                          >
                            <AlertTriangle size={9} /> Critical
                          </span>
                        )}
                        {e.severity === "warning" && (
                          <span
                            style={{
                              padding: "1px 7px",
                              borderRadius: 999,
                              background: "var(--badge-warning-bg)",
                              color: "var(--badge-warning-text)",
                              fontSize: 9,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                            }}
                          >
                            Warning
                          </span>
                        )}
                      </div>
                      <p
                        style={{
                          margin: "3px 0 0",
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          lineHeight: 1.5,
                        }}
                      >
                        {e.body}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 4,
                          fontSize: 11,
                          color: "var(--text-tertiary)",
                        }}
                      >
                        <span>{e.actor}</span>
                        <span>·</span>
                        <span
                          style={{
                            fontFamily:
                              "var(--font-geist-mono), ui-monospace, monospace",
                          }}
                        >
                          {new Date(e.at).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {e.link && (
                          <>
                            <span>·</span>
                            <Link
                              href={e.link}
                              style={{
                                color: "var(--vyne-accent, var(--vyne-purple))",
                                fontWeight: 600,
                                textDecoration: "none",
                              }}
                            >
                              Open →
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}

// Suppress unused-import warning
void CheckCircle2;
