"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
} from "lucide-react";

type ServiceStatus = "operational" | "degraded" | "down" | "maintenance";

interface Service {
  name: string;
  status: ServiceStatus;
  uptime: number;
  region?: string;
}

interface Incident {
  id: string;
  title: string;
  status: "resolved" | "investigating" | "monitoring";
  severity: "minor" | "major" | "critical";
  startedAt: string;
  resolvedAt?: string;
  updates: Array<{ at: string; body: string }>;
}

const STATUS_STYLE: Record<
  ServiceStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  operational: {
    label: "Operational",
    color: "#4ADE80",
    bg: "rgba(34,197,94,0.12)",
    dot: "#22C55E",
  },
  degraded: {
    label: "Degraded performance",
    color: "#FCD34D",
    bg: "rgba(245,158,11,0.12)",
    dot: "#F59E0B",
  },
  down: {
    label: "Outage",
    color: "#F87171",
    bg: "rgba(239,68,68,0.12)",
    dot: "#EF4444",
  },
  maintenance: {
    label: "Scheduled maintenance",
    color: "#93C5FD",
    bg: "rgba(59,130,246,0.12)",
    dot: "#3B82F6",
  },
};

const SERVICES: Service[] = [
  { name: "Web app (vyne.vercel.app)", status: "operational", uptime: 99.98 },
  { name: "API gateway", status: "operational", uptime: 99.95 },
  { name: "Core service (auth, orgs)", status: "operational", uptime: 99.97 },
  { name: "Messaging service (WebSocket)", status: "operational", uptime: 99.92 },
  { name: "Projects service", status: "operational", uptime: 99.96 },
  { name: "ERP service", status: "operational", uptime: 99.9 },
  { name: "AI service (LangGraph agents)", status: "operational", uptime: 99.85 },
  { name: "Notification service (SES)", status: "operational", uptime: 99.99 },
  { name: "Stripe billing webhook", status: "operational", uptime: 99.99 },
  { name: "S3 document storage", status: "operational", uptime: 100 },
];

const INCIDENTS: Incident[] = [
  {
    id: "inc-042",
    title: "AI response latency elevated (p95 > 5s)",
    status: "resolved",
    severity: "minor",
    startedAt: "2026-04-10T14:22:00Z",
    resolvedAt: "2026-04-10T15:08:00Z",
    updates: [
      {
        at: "2026-04-10T15:08:00Z",
        body: "Anthropic API latency returned to baseline. Closing incident.",
      },
      {
        at: "2026-04-10T14:45:00Z",
        body: "Degradation traced to upstream model provider. Monitoring.",
      },
      {
        at: "2026-04-10T14:22:00Z",
        body: "Detected p95 latency spike on /api/ai/agents/query.",
      },
    ],
  },
  {
    id: "inc-041",
    title: "Scheduled RDS failover drill",
    status: "resolved",
    severity: "minor",
    startedAt: "2026-04-05T04:00:00Z",
    resolvedAt: "2026-04-05T04:12:00Z",
    updates: [
      {
        at: "2026-04-05T04:12:00Z",
        body: "Failover drill completed. Zero user impact.",
      },
      {
        at: "2026-04-05T04:00:00Z",
        body: "Starting scheduled RDS failover as announced 48 hours ago.",
      },
    ],
  },
];

function Dot({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        boxShadow: `0 0 0 3px ${color}22`,
      }}
    />
  );
}

function overallStatus(services: Service[]): ServiceStatus {
  if (services.some((s) => s.status === "down")) return "down";
  if (services.some((s) => s.status === "degraded")) return "degraded";
  if (services.some((s) => s.status === "maintenance")) return "maintenance";
  return "operational";
}

export default function StatusPage() {
  const overall = overallStatus(SERVICES);
  const overallStyle = STATUS_STYLE[overall];
  const avgUptime =
    SERVICES.reduce((sum, s) => sum + s.uptime, 0) / SERVICES.length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0A0A1A 0%, #0F0F20 100%)",
        color: "#E8E8F0",
      }}
    >
      {/* Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(10,10,26,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "16px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "rgba(255,255,255,0.7)",
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={16} />
            Back to home
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "linear-gradient(135deg, #6C47FF, #8B6BFF)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              V
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>VYNE</span>
          </div>
        </div>
      </header>

      {/* Hero — overall status */}
      <section style={{ padding: "80px 24px 40px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 12,
              fontWeight: 600,
              color: "rgba(255,255,255,0.5)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 14,
            }}
          >
            <Activity size={14} />
            VYNE system status
          </div>

          <div
            style={{
              padding: "28px 32px",
              borderRadius: 16,
              background: overallStyle.bg,
              border: `1px solid ${overallStyle.color}44`,
              display: "flex",
              alignItems: "center",
              gap: 18,
            }}
          >
            {overall === "operational" ? (
              <CheckCircle2 size={36} style={{ color: overallStyle.color }} />
            ) : overall === "down" ? (
              <XCircle size={36} style={{ color: overallStyle.color }} />
            ) : (
              <AlertTriangle size={36} style={{ color: overallStyle.color }} />
            )}
            <div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#fff",
                  marginBottom: 4,
                }}
              >
                {overall === "operational"
                  ? "All systems operational"
                  : overallStyle.label}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                30-day uptime across all services:{" "}
                <strong style={{ color: "#fff" }}>
                  {avgUptime.toFixed(2)}%
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section style={{ padding: "20px 24px 40px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#fff",
              marginBottom: 14,
              letterSpacing: "-0.01em",
            }}
          >
            Services
          </h2>

          <div
            style={{
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.06)",
              overflow: "hidden",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            {SERVICES.map((s, i) => {
              const style = STATUS_STYLE[s.status];
              return (
                <div
                  key={s.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 18px",
                    borderTop:
                      i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}
                >
                  <Dot color={style.dot} />
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: "rgba(255,255,255,0.9)",
                      flex: 1,
                    }}
                  >
                    {s.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.5)",
                      fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
                    }}
                  >
                    {s.uptime.toFixed(2)}% uptime
                  </div>
                  <span
                    style={{
                      padding: "2px 10px",
                      borderRadius: 999,
                      background: style.bg,
                      color: style.color,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {style.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Incidents */}
      <section style={{ padding: "20px 24px 80px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#fff",
              marginBottom: 14,
              letterSpacing: "-0.01em",
            }}
          >
            Recent incidents
          </h2>

          {INCIDENTS.length === 0 ? (
            <div
              style={{
                padding: "40px 20px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.02)",
                textAlign: "center",
                color: "rgba(255,255,255,0.5)",
                fontSize: 14,
              }}
            >
              No incidents in the last 30 days.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {INCIDENTS.map((inc) => (
                <article
                  key={inc.id}
                  style={{
                    padding: 20,
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 10,
                    }}
                  >
                    <h3
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: "#fff",
                        margin: 0,
                      }}
                    >
                      {inc.title}
                    </h3>
                    <span
                      style={{
                        padding: "2px 10px",
                        borderRadius: 999,
                        background:
                          inc.status === "resolved"
                            ? "rgba(34,197,94,0.15)"
                            : "rgba(245,158,11,0.15)",
                        color:
                          inc.status === "resolved" ? "#4ADE80" : "#FCD34D",
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "capitalize",
                      }}
                    >
                      {inc.status}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.5)",
                      marginBottom: 14,
                    }}
                  >
                    {new Date(inc.startedAt).toLocaleString()}
                    {inc.resolvedAt
                      ? ` · Resolved in ${Math.round(
                          (new Date(inc.resolvedAt).getTime() -
                            new Date(inc.startedAt).getTime()) /
                            60000,
                        )} min`
                      : " · In progress"}
                  </div>
                  <ol
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      borderLeft: "2px solid rgba(255,255,255,0.08)",
                      paddingLeft: 14,
                    }}
                  >
                    {inc.updates.map((u) => (
                      <li key={u.at}>
                        <div
                          style={{
                            fontSize: 11,
                            color: "rgba(255,255,255,0.4)",
                            marginBottom: 2,
                            fontFamily:
                              "var(--font-geist-mono), ui-monospace, monospace",
                          }}
                        >
                          {new Date(u.at).toLocaleTimeString()}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: "rgba(255,255,255,0.85)",
                            lineHeight: 1.5,
                          }}
                        >
                          {u.body}
                        </div>
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
