"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────
type ServiceHealth = "green" | "yellow" | "red";

interface Service {
  readonly name: string;
  readonly key: string;
  readonly status: ServiceHealth;
  readonly uptime: string;
  readonly responseTime: string;
  readonly cpu: number;
  readonly memory: number;
  readonly connections: number;
  readonly lastIncident: string;
}

interface ErrorLog {
  readonly id: string;
  readonly service: string;
  readonly message: string;
  readonly level: "error" | "warn";
  readonly timestamp: string;
  readonly count: number;
}

// ─── Mock Data ────────────────────────────────────────────────────
const SERVICES: Service[] = [
  {
    name: "API Gateway",
    key: "api-gateway",
    status: "green",
    uptime: "99.98%",
    responseTime: "42ms",
    cpu: 22,
    memory: 58,
    connections: 1240,
    lastIncident: "Feb 14, 2026",
  },
  {
    name: "Projects Service",
    key: "projects",
    status: "green",
    uptime: "99.95%",
    responseTime: "68ms",
    cpu: 31,
    memory: 64,
    connections: 380,
    lastIncident: "Feb 28, 2026",
  },
  {
    name: "Messaging Service",
    key: "messaging",
    status: "green",
    uptime: "99.99%",
    responseTime: "12ms",
    cpu: 18,
    memory: 45,
    connections: 2100,
    lastIncident: "Jan 5, 2026",
  },
  {
    name: "AI Service",
    key: "ai",
    status: "yellow",
    uptime: "99.2%",
    responseTime: "380ms",
    cpu: 78,
    memory: 89,
    connections: 240,
    lastIncident: "Mar 20, 2026",
  },
  {
    name: "Code Service",
    key: "code",
    status: "green",
    uptime: "99.97%",
    responseTime: "95ms",
    cpu: 35,
    memory: 52,
    connections: 180,
    lastIncident: "Mar 2, 2026",
  },
  {
    name: "ERP Service",
    key: "erp",
    status: "green",
    uptime: "99.94%",
    responseTime: "55ms",
    cpu: 28,
    memory: 61,
    connections: 420,
    lastIncident: "Feb 22, 2026",
  },
  {
    name: "Notification Service",
    key: "notifications",
    status: "green",
    uptime: "99.99%",
    responseTime: "8ms",
    cpu: 12,
    memory: 32,
    connections: 890,
    lastIncident: "Dec 15, 2025",
  },
  {
    name: "Observability Service",
    key: "observability",
    status: "green",
    uptime: "99.96%",
    responseTime: "25ms",
    cpu: 42,
    memory: 71,
    connections: 560,
    lastIncident: "Mar 10, 2026",
  },
  {
    name: "Auth Service",
    key: "auth",
    status: "green",
    uptime: "99.99%",
    responseTime: "18ms",
    cpu: 15,
    memory: 38,
    connections: 3200,
    lastIncident: "Jan 20, 2026",
  },
];

const ERROR_LOGS: ErrorLog[] = [
  {
    id: "e1",
    service: "AI Service",
    message: "GPU memory allocation exceeded threshold (>85%)",
    level: "warn",
    timestamp: "2026-03-21 09:42:18",
    count: 12,
  },
  {
    id: "e2",
    service: "AI Service",
    message: "Model inference timeout after 30s for embeddings batch",
    level: "error",
    timestamp: "2026-03-21 09:38:05",
    count: 3,
  },
  {
    id: "e3",
    service: "API Gateway",
    message: "Rate limit triggered for tenant t5 (>10k req/min)",
    level: "warn",
    timestamp: "2026-03-21 08:15:32",
    count: 1,
  },
  {
    id: "e4",
    service: "Projects Service",
    message: "Database connection pool exhausted briefly (recovered)",
    level: "warn",
    timestamp: "2026-03-20 22:04:11",
    count: 2,
  },
  {
    id: "e5",
    service: "ERP Service",
    message: "Failed to sync inventory data for tenant t3",
    level: "error",
    timestamp: "2026-03-20 18:30:45",
    count: 1,
  },
  {
    id: "e6",
    service: "Observability Service",
    message: "Metrics ingestion lag exceeded 5s threshold",
    level: "warn",
    timestamp: "2026-03-20 14:22:09",
    count: 4,
  },
  {
    id: "e7",
    service: "Code Service",
    message: "Build agent #3 unresponsive, restarted automatically",
    level: "warn",
    timestamp: "2026-03-20 11:05:33",
    count: 1,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────
function statusColor(s: ServiceHealth): string {
  if (s === "green") return "#22C55E";
  if (s === "yellow") return "#F59E0B";
  return "#EF4444";
}

function statusLabel(s: ServiceHealth): string {
  if (s === "green") return "Healthy";
  if (s === "yellow") return "Degraded";
  return "Down";
}

function usageBarColor(pct: number): string {
  if (pct >= 80) return "#EF4444";
  if (pct >= 60) return "#F59E0B";
  return "#22C55E";
}

// ─── Metric bar ───────────────────────────────────────────────────
function MetricBar({
  label,
  value,
  unit,
}: Readonly<{ label: string; value: number; unit: string }>) {
  const color = usageBarColor(value);
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: "#6060A0",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color,
            fontFamily: "monospace",
          }}
        >
          {value}
          {unit}
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${value}%`,
            background: color,
            borderRadius: 3,
            transition: "width 0.5s ease",
          }}
        />
      </div>
    </div>
  );
}

// ─── Service Card ─────────────────────────────────────────────────
function ServiceCard({
  service,
  onRestart,
}: Readonly<{
  service: Service;
  onRestart: (name: string) => void;
}>) {
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const sc = statusColor(service.status);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#13131F",
        border: `1px solid ${hovered ? "rgba(6, 182, 212,0.2)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 14,
        overflow: "hidden",
        transition: "all 0.2s",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          padding: "16px 18px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: "pointer",
          background: "transparent",
          border: "none",
          textAlign: "left",
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: sc,
            boxShadow: `0 0 8px ${sc}50`,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#E8E8F8" }}>
            {service.name}
          </div>
          <div style={{ fontSize: 11, color: "#6060A0", marginTop: 2 }}>
            {statusLabel(service.status)} &middot; {service.responseTime}{" "}
            &middot; {service.uptime} uptime
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            color: "#6060A0",
            transform: expanded ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
            display: "inline-block",
          }}
        >
          &#9660;
        </span>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div
          style={{
            padding: "0 18px 16px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ paddingTop: 14 }}>
            {/* Metrics */}
            <MetricBar label="CPU" value={service.cpu} unit="%" />
            <MetricBar label="Memory" value={service.memory} unit="%" />

            {/* Stats row */}
            <div
              style={{
                display: "flex",
                gap: 16,
                marginTop: 12,
                marginBottom: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#6060A0",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontWeight: 600,
                    marginBottom: 3,
                  }}
                >
                  Connections
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#E8E8F8",
                    fontFamily: "monospace",
                  }}
                >
                  {service.connections.toLocaleString()}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#6060A0",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontWeight: 600,
                    marginBottom: 3,
                  }}
                >
                  Response
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#E8E8F8",
                    fontFamily: "monospace",
                  }}
                >
                  {service.responseTime}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#6060A0",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontWeight: 600,
                    marginBottom: 3,
                  }}
                >
                  Last Incident
                </div>
                <div
                  style={{ fontSize: 12, fontWeight: 500, color: "#9090B0" }}
                >
                  {service.lastIncident}
                </div>
              </div>
            </div>

            {/* Restart button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRestart(service.name);
              }}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                border: "1px solid rgba(245,158,11,0.3)",
                background: "rgba(245,158,11,0.08)",
                color: "#FCD34D",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              &#8635; Restart Service
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main System Health Page ──────────────────────────────────────
export default function SystemHealthPage() {
  const [toast, setToast] = useState<string | null>(null);

  const greenCount = SERVICES.filter((s) => s.status === "green").length;
  const yellowCount = SERVICES.filter((s) => s.status === "yellow").length;
  const redCount = SERVICES.filter((s) => s.status === "red").length;

  const avgCpu = Math.round(
    SERVICES.reduce((s, svc) => s + svc.cpu, 0) / SERVICES.length,
  );
  const avgMemory = Math.round(
    SERVICES.reduce((s, svc) => s + svc.memory, 0) / SERVICES.length,
  );
  const totalConnections = SERVICES.reduce((s, svc) => s + svc.connections, 0);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function handleRestart(name: string) {
    showToast(`Restarting ${name}...`);
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#E8E8F8",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          System Health
        </h1>
        <p style={{ fontSize: 13, color: "#6060A0", margin: "4px 0 0" }}>
          Infrastructure monitoring and service status
        </p>
      </div>

      {/* Overview cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 14,
          marginBottom: 24,
        }}
      >
        {/* Status summary */}
        <div
          style={{
            background: "#13131F",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#6060A0",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 12,
            }}
          >
            Services
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 4,
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 28, fontWeight: 700, color: "#E8E8F8" }}>
              {SERVICES.length}
            </span>
            <span style={{ fontSize: 12, color: "#6060A0" }}>total</span>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "#4ADE80", fontWeight: 600 }}>
              {greenCount} healthy
            </span>
            {yellowCount > 0 && (
              <span style={{ fontSize: 11, color: "#FCD34D", fontWeight: 600 }}>
                {yellowCount} degraded
              </span>
            )}
            {redCount > 0 && (
              <span style={{ fontSize: 11, color: "#F87171", fontWeight: 600 }}>
                {redCount} down
              </span>
            )}
          </div>
        </div>

        {/* Avg CPU */}
        <div
          style={{
            background: "#13131F",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#6060A0",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 12,
            }}
          >
            Avg CPU
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#E8E8F8" }}>
            {avgCpu}%
          </div>
          <div
            style={{
              height: 6,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 3,
              overflow: "hidden",
              marginTop: 10,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${avgCpu}%`,
                background: usageBarColor(avgCpu),
                borderRadius: 3,
              }}
            />
          </div>
        </div>

        {/* Avg Memory */}
        <div
          style={{
            background: "#13131F",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#6060A0",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 12,
            }}
          >
            Avg Memory
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#E8E8F8" }}>
            {avgMemory}%
          </div>
          <div
            style={{
              height: 6,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 3,
              overflow: "hidden",
              marginTop: 10,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${avgMemory}%`,
                background: usageBarColor(avgMemory),
                borderRadius: 3,
              }}
            />
          </div>
        </div>

        {/* DB Connections */}
        <div
          style={{
            background: "#13131F",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#6060A0",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 12,
            }}
          >
            Connections
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#E8E8F8" }}>
            {totalConnections.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: "#6060A0", marginTop: 6 }}>
            active across all services
          </div>
        </div>

        {/* Overall status */}
        <div
          style={{
            background:
              redCount > 0
                ? "rgba(239,68,68,0.06)"
                : yellowCount > 0
                  ? "rgba(245,158,11,0.06)"
                  : "rgba(34,197,94,0.06)",
            border: `1px solid ${
              redCount > 0
                ? "rgba(239,68,68,0.2)"
                : yellowCount > 0
                  ? "rgba(245,158,11,0.2)"
                  : "rgba(34,197,94,0.2)"
            }`,
            borderRadius: 14,
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background:
                redCount > 0
                  ? "#EF4444"
                  : yellowCount > 0
                    ? "#F59E0B"
                    : "#22C55E",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              color: "#fff",
              marginBottom: 8,
              boxShadow: `0 0 16px ${
                redCount > 0
                  ? "rgba(239,68,68,0.4)"
                  : yellowCount > 0
                    ? "rgba(245,158,11,0.4)"
                    : "rgba(34,197,94,0.4)"
              }`,
            }}
          >
            {redCount > 0 ? "!" : yellowCount > 0 ? "~" : "\u2713"}
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color:
                redCount > 0
                  ? "#F87171"
                  : yellowCount > 0
                    ? "#FCD34D"
                    : "#4ADE80",
            }}
          >
            {redCount > 0
              ? "Critical"
              : yellowCount > 0
                ? "Degraded"
                : "All Systems Go"}
          </div>
        </div>
      </div>

      {/* Service Cards Grid */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#E8E8F8",
            marginBottom: 14,
          }}
        >
          Service Status
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
          }}
        >
          {SERVICES.map((svc) => (
            <ServiceCard
              key={svc.key}
              service={svc}
              onRestart={handleRestart}
            />
          ))}
        </div>
      </div>

      {/* Recent Errors Log */}
      <div
        style={{
          background: "#13131F",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#E8E8F8" }}>
              Recent Errors &amp; Warnings
            </div>
            <div style={{ fontSize: 11, color: "#6060A0", marginTop: 2 }}>
              Last 48 hours
            </div>
          </div>
          <span
            style={{
              padding: "3px 10px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              background: "rgba(239,68,68,0.12)",
              color: "#F87171",
            }}
          >
            {ERROR_LOGS.length} entries
          </span>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.02)" }}>
              {["Level", "Service", "Message", "Time", "Count"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 16px",
                    textAlign: "left",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#6060A0",
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ERROR_LOGS.map((log) => (
              <tr
                key={log.id}
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
              >
                <td style={{ padding: "11px 16px" }}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      background:
                        log.level === "error"
                          ? "rgba(239,68,68,0.15)"
                          : "rgba(245,158,11,0.15)",
                      color: log.level === "error" ? "#F87171" : "#FCD34D",
                    }}
                  >
                    {log.level}
                  </span>
                </td>
                <td
                  style={{
                    padding: "11px 16px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#C8C8E0",
                  }}
                >
                  {log.service}
                </td>
                <td
                  style={{
                    padding: "11px 16px",
                    fontSize: 12,
                    color: "#9090B0",
                    maxWidth: 400,
                  }}
                >
                  {log.message}
                </td>
                <td
                  style={{
                    padding: "11px 16px",
                    fontSize: 11,
                    color: "#6060A0",
                    fontFamily: "monospace",
                    whiteSpace: "nowrap",
                  }}
                >
                  {log.timestamp}
                </td>
                <td style={{ padding: "11px 16px" }}>
                  {log.count > 1 ? (
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 20,
                        fontSize: 10,
                        fontWeight: 600,
                        background: "rgba(6, 182, 212,0.12)",
                        color: "#67E8F9",
                      }}
                    >
                      x{log.count}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: "#6060A0" }}>1</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#F59E0B",
            color: "#000",
            padding: "10px 18px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 8px 24px rgba(245,158,11,0.3)",
            zIndex: 400,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
