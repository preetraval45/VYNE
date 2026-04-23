"use client";

import { useMemo, useState } from "react";
import {
  Download,
  Search,
  User,
  Shield,
  Package,
  DollarSign,
  FileText,
  AlertTriangle,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────
type AuditCategory =
  | "auth"
  | "billing"
  | "orders"
  | "projects"
  | "members"
  | "security"
  | "api";

type AuditSeverity = "info" | "warning" | "critical";

interface AuditEvent {
  id: string;
  timestamp: string;
  category: AuditCategory;
  severity: AuditSeverity;
  actor: { name: string; avatar?: string };
  action: string;
  target: string;
  ip: string;
}

const CATEGORY_STYLE: Record<
  AuditCategory,
  { label: string; color: string; icon: React.ElementType }
> = {
  auth: { label: "Auth", color: "#3B82F6", icon: Shield },
  billing: { label: "Billing", color: "#22C55E", icon: DollarSign },
  orders: { label: "Orders", color: "#F59E0B", icon: Package },
  projects: { label: "Projects", color: "#06B6D4", icon: FileText },
  members: { label: "Members", color: "#8B5CF6", icon: User },
  security: { label: "Security", color: "#EF4444", icon: Shield },
  api: { label: "API", color: "#64748B", icon: FileText },
};

const SEVERITY_STYLE: Record<AuditSeverity, { color: string; bg: string }> = {
  info: { color: "var(--text-tertiary)", bg: "transparent" },
  warning: { color: "var(--badge-warning-text)", bg: "var(--badge-warning-bg)" },
  critical: { color: "var(--badge-danger-text)", bg: "var(--badge-danger-bg)" },
};

const MOCK_EVENTS: AuditEvent[] = [
  {
    id: "a1",
    timestamp: "2026-04-14T14:22:00Z",
    category: "security",
    severity: "warning",
    actor: { name: "Preet Raval" },
    action: "Enabled 2FA",
    target: "Account preet@vyne.ai",
    ip: "73.221.14.22",
  },
  {
    id: "a2",
    timestamp: "2026-04-14T13:08:00Z",
    category: "billing",
    severity: "info",
    actor: { name: "Preet Raval" },
    action: "Upgraded plan",
    target: "Starter → Business",
    ip: "73.221.14.22",
  },
  {
    id: "a3",
    timestamp: "2026-04-14T11:47:00Z",
    category: "api",
    severity: "info",
    actor: { name: "Zapier Integration" },
    action: "Created API key",
    target: "vyne_live_•••a8k3 (write)",
    ip: "54.188.2.14",
  },
  {
    id: "a4",
    timestamp: "2026-04-14T10:30:00Z",
    category: "members",
    severity: "info",
    actor: { name: "Preet Raval" },
    action: "Invited member",
    target: "sarah@vyne.ai as Admin",
    ip: "73.221.14.22",
  },
  {
    id: "a5",
    timestamp: "2026-04-14T09:12:00Z",
    category: "orders",
    severity: "info",
    actor: { name: "Tony M." },
    action: "Approved order",
    target: "ORD-1042 · $8,400",
    ip: "68.102.88.14",
  },
  {
    id: "a6",
    timestamp: "2026-04-13T22:04:00Z",
    category: "security",
    severity: "critical",
    actor: { name: "Unknown" },
    action: "Failed login attempts (5x)",
    target: "preet@vyne.ai",
    ip: "91.202.14.88",
  },
  {
    id: "a7",
    timestamp: "2026-04-13T18:33:00Z",
    category: "auth",
    severity: "info",
    actor: { name: "Sarah K." },
    action: "Signed in",
    target: "Chrome · macOS",
    ip: "172.58.102.11",
  },
  {
    id: "a8",
    timestamp: "2026-04-13T16:15:00Z",
    category: "projects",
    severity: "info",
    actor: { name: "Preet Raval" },
    action: "Deleted project",
    target: "PROJ-archived-2025",
    ip: "73.221.14.22",
  },
  {
    id: "a9",
    timestamp: "2026-04-13T14:02:00Z",
    category: "security",
    severity: "warning",
    actor: { name: "Preet Raval" },
    action: "Rotated SSO certificate",
    target: "Okta SAML provider",
    ip: "73.221.14.22",
  },
  {
    id: "a10",
    timestamp: "2026-04-13T09:48:00Z",
    category: "billing",
    severity: "info",
    actor: { name: "Stripe" },
    action: "Invoice paid",
    target: "INV-2026-042 · $1,920",
    ip: "54.187.205.235",
  },
];

// ─── Component ───────────────────────────────────────────────────
interface Props {
  readonly onToast: (message: string) => void;
}

export default function AuditSettings({ onToast }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<AuditCategory | "all">("all");
  const [severity, setSeverity] = useState<AuditSeverity | "all">("all");

  const filtered = useMemo(() => {
    return MOCK_EVENTS.filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (severity !== "all" && e.severity !== severity) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          e.actor.name.toLowerCase().includes(q) ||
          e.action.toLowerCase().includes(q) ||
          e.target.toLowerCase().includes(q) ||
          e.ip.includes(q)
        );
      }
      return true;
    });
  }, [search, category, severity]);

  function exportJson() {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vyne-audit-log-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onToast(`Exported ${filtered.length} event${filtered.length === 1 ? "" : "s"}`);
  }

  function exportCsv() {
    const header = "timestamp,category,severity,actor,action,target,ip";
    const rows = filtered
      .map(
        (e) =>
          `${e.timestamp},${e.category},${e.severity},"${e.actor.name}","${e.action}","${e.target}",${e.ip}`,
      )
      .join("\n");
    const blob = new Blob([header + "\n" + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vyne-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onToast(`Exported ${filtered.length} event${filtered.length === 1 ? "" : "s"} as CSV`);
  }

  return (
    <div>
      {/* ── Header + filters ────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 16,
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
            size={14}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-tertiary)",
            }}
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actor, action, target, or IP…"
            aria-label="Search audit events"
            style={{
              width: "100%",
              padding: "8px 12px 8px 34px",
              borderRadius: 8,
              border: "1px solid var(--input-border)",
              background: "var(--input-bg)",
              color: "var(--text-primary)",
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as AuditCategory | "all")}
          aria-label="Filter by category"
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid var(--input-border)",
            background: "var(--input-bg)",
            color: "var(--text-primary)",
            fontSize: 13,
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="all">All categories</option>
          {(Object.keys(CATEGORY_STYLE) as AuditCategory[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_STYLE[c].label}
            </option>
          ))}
        </select>

        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as AuditSeverity | "all")}
          aria-label="Filter by severity"
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid var(--input-border)",
            background: "var(--input-bg)",
            color: "var(--text-primary)",
            fontSize: 13,
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

        <button
          type="button"
          onClick={exportCsv}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid var(--content-border)",
            background: "var(--content-bg)",
            color: "var(--text-secondary)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Download size={13} /> CSV
        </button>
        <button
          type="button"
          onClick={exportJson}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "none",
            background: "var(--vyne-purple)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Download size={13} /> Export JSON
        </button>
      </div>

      {/* ── Event list ─────────────────────────────────────── */}
      <div
        style={{
          borderRadius: 10,
          border: "1px solid var(--content-border)",
          overflow: "hidden",
          background: "var(--content-bg)",
        }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              fontSize: 13,
              color: "var(--text-tertiary)",
            }}
          >
            No events match your filters.
          </div>
        ) : (
          filtered.map((e, idx) => {
            const cat = CATEGORY_STYLE[e.category];
            const sev = SEVERITY_STYLE[e.severity];
            const Icon = cat.icon;
            return (
              <div
                key={e.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr auto",
                  gap: 16,
                  padding: "12px 16px",
                  borderTop:
                    idx > 0 ? "1px solid var(--content-border)" : "none",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    fontFamily:
                      "var(--font-geist-mono), ui-monospace, monospace",
                  }}
                >
                  {new Date(e.timestamp).toLocaleString(undefined, {
                    month: "short",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      background: `${cat.color}18`,
                      color: cat.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={14} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--text-primary)",
                        lineHeight: 1.4,
                      }}
                    >
                      <strong style={{ fontWeight: 600 }}>
                        {e.actor.name}
                      </strong>{" "}
                      <span style={{ color: "var(--text-secondary)" }}>
                        {e.action}
                      </span>{" "}
                      <span
                        style={{
                          color: "var(--text-primary)",
                          fontWeight: 500,
                        }}
                      >
                        {e.target}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                        marginTop: 2,
                        fontFamily:
                          "var(--font-geist-mono), ui-monospace, monospace",
                      }}
                    >
                      {e.ip}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {e.severity !== "info" && (
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: sev.bg,
                        color: sev.color,
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {e.severity === "critical" && <AlertTriangle size={10} />}
                      {e.severity}
                    </span>
                  )}
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 600,
                      color: cat.color,
                      background: `${cat.color}15`,
                      textTransform: "capitalize",
                    }}
                  >
                    {cat.label}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div
        style={{
          marginTop: 10,
          fontSize: 11,
          color: "var(--text-tertiary)",
          textAlign: "right",
        }}
      >
        {filtered.length} of {MOCK_EVENTS.length} events · retention: 365 days
      </div>
    </div>
  );
}
