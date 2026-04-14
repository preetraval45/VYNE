"use client";

import { useState, useEffect } from "react";
import {
  SERVICES,
  REQUEST_BARS,
  ERROR_BARS,
  SLOWEST_ENDPOINTS,
  DEPLOY_EVENTS,
  CPU_USAGE,
  MEM_USAGE,
  DB_POOL,
  BUSINESS_METRICS,
  LOG_ENTRIES,
  ACTIVE_ALERTS,
  ALERT_HISTORY,
  TRACE_SPANS,
  TOTAL_TRACE_MS,
  type ServiceStatus,
  type LogLevel,
  type AlertSeverity,
  type Service,
  type LogEntry,
  type AlertEntry,
} from "@/lib/fixtures/observe";

type TabId = "overview" | "metrics" | "logs" | "alerts" | "traces";
type Environment = "Production" | "Staging" | "Dev";
type TimeRange = "1h" | "6h" | "24h" | "7d";
type LogFilter = "All" | "Error" | "Warn" | "Info" | "Debug";

// ─── Helper functions (no nested ternaries) ───────────────────────
function getStatusColor(status: ServiceStatus): string {
  if (status === "healthy") {
    return "var(--status-success)";
  }
  if (status === "degraded") {
    return "var(--status-warning)";
  }
  return "var(--status-danger)";
}

function getStatusLabel(status: ServiceStatus): string {
  if (status === "healthy") {
    return "Healthy";
  }
  if (status === "degraded") {
    return "Degraded";
  }
  return "Down";
}

function getLevelColor(level: LogLevel): string {
  if (level === "error") {
    return "var(--status-danger)";
  }
  if (level === "warn") {
    return "var(--status-warning)";
  }
  if (level === "info") {
    return "var(--status-info)";
  }
  return "var(--text-secondary)";
}

function getLevelBg(level: LogLevel): string {
  if (level === "error") {
    return "#FEF2F2";
  }
  if (level === "warn") {
    return "#FFFBEB";
  }
  if (level === "info") {
    return "#EFF6FF";
  }
  return "#F0F0F8";
}

function getSeverityColor(severity: AlertSeverity): string {
  if (severity === "critical") {
    return "var(--status-danger)";
  }
  if (severity === "warning") {
    return "var(--status-warning)";
  }
  return "var(--status-info)";
}

function getSeverityBg(severity: AlertSeverity): string {
  if (severity === "critical") {
    return "#FEF2F2";
  }
  if (severity === "warning") {
    return "#FFFBEB";
  }
  return "#EFF6FF";
}

function getBarColor(pct: number): string {
  if (pct >= 80) {
    return "var(--status-danger)";
  }
  if (pct >= 60) {
    return "var(--status-warning)";
  }
  return "var(--vyne-purple)";
}

function getErrorBarColor(val: number): string {
  if (val > 10) {
    return "var(--status-danger)";
  }
  if (val > 5) {
    return "var(--status-warning)";
  }
  return "var(--status-success)";
}

function matchesLogFilter(entry: LogEntry, filter: LogFilter): boolean {
  if (filter === "All") {
    return true;
  }
  if (filter === "Error") {
    return entry.level === "error";
  }
  if (filter === "Warn") {
    return entry.level === "warn";
  }
  if (filter === "Info") {
    return entry.level === "info";
  }
  return entry.level === "debug";
}

function filterLogEntries(
  entries: readonly LogEntry[],
  filter: LogFilter,
  search: string,
  service: string,
): readonly LogEntry[] {
  return entries.filter((e) => {
    const levelOk = matchesLogFilter(e, filter);
    const searchOk =
      search.length === 0 ||
      e.message.toLowerCase().includes(search.toLowerCase());
    const serviceOk = service === "All Services" || e.service === service;
    return levelOk && searchOk && serviceOk;
  });
}

// ─── Sub-components ───────────────────────────────────────────────

function KpiCard({
  label,
  value,
  unit,
  color,
  note,
}: Readonly<{
  label: string;
  value: string;
  unit: string;
  color: string;
  note: string;
}>) {
  return (
    <div
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 12,
        padding: "16px 18px",
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "var(--text-secondary)",
          marginBottom: 6,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span
          style={{
            fontSize: 28,
            fontWeight: 700,
            color,
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        <span
          style={{
            fontSize: 13,
            color: "var(--text-tertiary)",
            fontWeight: 500,
          }}
        >
          {unit}
        </span>
      </div>
      <div
        style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 5 }}
      >
        {note}
      </div>
    </div>
  );
}

function Sparkline({ data }: Readonly<{ data: readonly number[] }>) {
  const max = Math.max(...data);
  return (
    <div
      style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 24 }}
    >
      {data.map((val, idx) => (
        <div
          key={`spark-${idx}-${val}`}
          style={{
            width: 4,
            height: `${Math.round((val / max) * 100)}%`,
            background: "var(--vyne-purple)",
            opacity: 0.4 + 0.6 * (idx / (data.length - 1)),
            borderRadius: 1,
            minHeight: 2,
          }}
        />
      ))}
    </div>
  );
}

function ServiceCard({ svc }: Readonly<{ svc: Service }>) {
  const dotColor = getStatusColor(svc.status);
  const statusLabel = getStatusLabel(svc.status);
  return (
    <div
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 12,
        padding: "14px 16px",
        borderTop: `3px solid ${dotColor}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 18 }}>{svc.icon}</span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {svc.name}
        </span>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: dotColor,
            flexShrink: 0,
          }}
          title={statusLabel}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
            Response
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {svc.responseMs}ms
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
            Error rate
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color:
                svc.errorRate > 0.5
                  ? "var(--status-danger)"
                  : "var(--text-primary)",
            }}
          >
            {svc.errorRate.toFixed(2)}%
          </div>
        </div>
      </div>
      <Sparkline data={svc.sparkline} />
    </div>
  );
}

function RequestRateChart({
  bars,
  animated,
}: Readonly<{ bars: readonly number[]; animated: boolean }>) {
  const max = Math.max(...bars);
  return (
    <div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: 10,
        }}
      >
        Request Rate (req/s) — last 24h
      </div>
      <div
        style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 80 }}
      >
        {bars.map((val, idx) => (
          <div
            key={`reqbar-${idx}-${val}`}
            style={{
              flex: 1,
              height: animated ? `${Math.round((val / max) * 100)}%` : "0%",
              background: "linear-gradient(to top, #6C47FF, #9B7DFF)",
              borderRadius: "2px 2px 0 0",
              minHeight: 2,
              transition: `height 0.6s ease ${(idx * 25).toString()}ms`,
            }}
            title={`${val} req/s`}
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
        }}
      >
        <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
          -24h
        </span>
        <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
          -12h
        </span>
        <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>now</span>
      </div>
    </div>
  );
}

function ErrorRateChart({ bars }: Readonly<{ bars: readonly number[] }>) {
  const max = Math.max(...bars);
  return (
    <div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: 10,
        }}
      >
        Error Rate (errors/min) — last 24h
      </div>
      <div
        style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 60 }}
      >
        {bars.map((val, idx) => (
          <div
            key={`errbar-${idx}-${val}`}
            style={{
              flex: 1,
              height: `${Math.round((val / max) * 100)}%`,
              background: getErrorBarColor(val),
              borderRadius: "2px 2px 0 0",
              minHeight: 2,
              opacity: 0.85,
            }}
            title={`${val} err/min`}
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
        }}
      >
        <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
          -24h
        </span>
        <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>now</span>
      </div>
    </div>
  );
}

function ProgressBar({
  pct,
  label,
  sublabel,
}: Readonly<{ pct: number; label: string; sublabel?: string }>) {
  const color = getBarColor(pct);
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--text-primary)" }}>
          {label}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color }}>
          {sublabel ?? `${pct.toString()}%`}
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: "var(--content-secondary)",
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct.toString()}%`,
            background: color,
            borderRadius: 6,
            transition: "width 0.8s ease",
          }}
        />
      </div>
    </div>
  );
}

function OverviewTab({ animated }: Readonly<{ animated: boolean }>) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div
          style={{
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 12,
            padding: "16px 18px",
          }}
        >
          <RequestRateChart bars={REQUEST_BARS} animated={animated} />
        </div>
        <div
          style={{
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 12,
            padding: "16px 18px",
          }}
        >
          <ErrorRateChart bars={ERROR_BARS} />
        </div>
      </div>

      {/* Slowest endpoints */}
      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 12,
          padding: "16px 18px",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 12,
          }}
        >
          Top 5 Slowest Endpoints
        </div>
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
        >
          <thead>
            <tr>
              {["Method", "Path", "p50", "p95", "p99", "Count"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    color: "var(--text-tertiary)",
                    fontWeight: 500,
                    paddingBottom: 8,
                    fontSize: 11,
                    borderBottom: "1px solid var(--content-border)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOWEST_ENDPOINTS.map((ep) => (
              <tr
                key={ep.id}
                style={{ borderBottom: "1px solid var(--content-border)" }}
              >
                <td style={{ padding: "8px 0" }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: ep.method === "GET" ? "#EFF6FF" : "#F0FDF4",
                      color: ep.method === "GET" ? "#1E40AF" : "#166534",
                    }}
                  >
                    {ep.method}
                  </span>
                </td>
                <td
                  style={{
                    padding: "8px 8px 8px 0",
                    color: "var(--text-primary)",
                    fontFamily: "monospace",
                    fontSize: 11,
                  }}
                >
                  {ep.path}
                </td>
                <td style={{ padding: "8px 0", color: "var(--text-primary)" }}>
                  {ep.p50.toString()}ms
                </td>
                <td
                  style={{
                    padding: "8px 0",
                    color:
                      ep.p95 > 400
                        ? "var(--status-warning)"
                        : "var(--text-primary)",
                  }}
                >
                  {ep.p95.toString()}ms
                </td>
                <td
                  style={{
                    padding: "8px 0",
                    color:
                      ep.p99 > 700
                        ? "var(--status-danger)"
                        : "var(--text-primary)",
                    fontWeight: ep.p99 > 700 ? 600 : 400,
                  }}
                >
                  {ep.p99.toString()}ms
                </td>
                <td
                  style={{ padding: "8px 0", color: "var(--text-secondary)" }}
                >
                  {ep.count.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent deploys */}
      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 12,
          padding: "16px 18px",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 14,
          }}
        >
          Recent Deploys
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {DEPLOY_EVENTS.map((dep, idx) => (
            <div
              key={dep.id}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                paddingBottom: idx < DEPLOY_EVENTS.length - 1 ? 14 : 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "var(--vyne-purple)",
                    marginTop: 2,
                  }}
                />
                {idx < DEPLOY_EVENTS.length - 1 && (
                  <div
                    style={{
                      width: 2,
                      flex: 1,
                      background: "rgba(108,71,255,0.15)",
                      minHeight: 14,
                      marginTop: 2,
                    }}
                  />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      fontFamily: "monospace",
                    }}
                  >
                    {dep.time}
                  </span>
                  <code
                    style={{
                      fontSize: 11,
                      background: "var(--content-secondary)",
                      padding: "1px 6px",
                      borderRadius: 4,
                      color: "var(--vyne-purple)",
                    }}
                  >
                    {dep.version}
                  </code>
                  <span
                    style={{ fontSize: 11, color: "var(--text-secondary)" }}
                  >
                    {dep.service}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    marginTop: 2,
                  }}
                >
                  {dep.note}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricsTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div
          style={{
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 12,
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 14,
            }}
          >
            CPU Usage
          </div>
          {CPU_USAGE.map((row) => (
            <ProgressBar key={row.id} label={row.service} pct={row.pct} />
          ))}
        </div>
        <div
          style={{
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 12,
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 14,
            }}
          >
            Memory Usage
          </div>
          {MEM_USAGE.map((row) => (
            <ProgressBar
              key={row.id}
              label={row.service}
              pct={row.pct}
              sublabel={`${row.used} / ${row.total}`}
            />
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div
          style={{
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 12,
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 14,
            }}
          >
            Network I/O
          </div>
          {[
            {
              id: "net1",
              label: "API Gateway — In",
              pct: 38,
              sublabel: "142 MB/s",
            },
            {
              id: "net2",
              label: "API Gateway — Out",
              pct: 55,
              sublabel: "210 MB/s",
            },
            {
              id: "net3",
              label: "ERP Service — In",
              pct: 71,
              sublabel: "272 MB/s",
            },
            {
              id: "net4",
              label: "Database (Aurora) — In",
              pct: 49,
              sublabel: "188 MB/s",
            },
            {
              id: "net5",
              label: "Database (Aurora) — Out",
              pct: 62,
              sublabel: "238 MB/s",
            },
          ].map((row) => (
            <ProgressBar
              key={row.id}
              label={row.label}
              pct={row.pct}
              sublabel={row.sublabel}
            />
          ))}
        </div>
        <div
          style={{
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 12,
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 14,
            }}
          >
            DB Connection Pool
          </div>
          {DB_POOL.map((pool) => {
            const pct = Math.round((pool.used / pool.total) * 100);
            return (
              <div key={pool.id} style={{ marginBottom: 14 }}>
                <ProgressBar
                  label={pool.label}
                  pct={pct}
                  sublabel={`${pool.used.toString()} / ${pool.total.toString()} connections`}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <span
                    style={{ fontSize: 10, color: "var(--text-secondary)" }}
                  >
                    Active: {pool.used.toString()}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                    •
                  </span>
                  <span
                    style={{ fontSize: 10, color: "var(--text-secondary)" }}
                  >
                    Idle: {(pool.total - pool.used).toString()}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                    •
                  </span>
                  <span
                    style={{ fontSize: 10, color: "var(--text-secondary)" }}
                  >
                    Max: {pool.total.toString()}
                  </span>
                </div>
              </div>
            );
          })}
          <div
            style={{
              borderTop: "1px solid var(--content-border)",
              paddingTop: 14,
              marginTop: 4,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 10,
              }}
            >
              Business Metrics
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              {BUSINESS_METRICS.map((m) => (
                <div
                  key={m.id}
                  style={{
                    background: "var(--table-header-bg)",
                    borderRadius: 8,
                    padding: "10px 12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-secondary)",
                      marginBottom: 4,
                    }}
                  >
                    {m.label}
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    {m.value}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: m.trendUp
                        ? "var(--status-success)"
                        : "var(--status-danger)",
                      marginTop: 2,
                    }}
                  >
                    {m.trend}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogsTab() {
  const [filter, setFilter] = useState<LogFilter>("All");
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("All Services");
  const [autoRefresh, setAutoRefresh] = useState(false);

  const LOG_FILTERS: readonly LogFilter[] = [
    "All",
    "Error",
    "Warn",
    "Info",
    "Debug",
  ];
  const SERVICE_OPTIONS = [
    "All Services",
    ...Array.from(new Set(LOG_ENTRIES.map((e) => e.service))),
  ];

  const filtered = filterLogEntries(LOG_ENTRIES, filter, search, serviceFilter);

  return (
    <div
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 12,
        padding: "16px 18px",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        {/* Level filter pills */}
        <div style={{ display: "flex", gap: 4 }}>
          {LOG_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "4px 10px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
                background: filter === f ? "var(--vyne-purple)" : "#F0F0F8",
                color: filter === f ? "#fff" : "var(--text-secondary)",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Service filter */}
        <label
          htmlFor="log-service-select"
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clip: "rect(0,0,0,0)",
          }}
        >
          Service
        </label>
        <select aria-label="Select option"
          id="log-service-select"
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          style={{
            padding: "4px 8px",
            borderRadius: 8,
            fontSize: 11,
            border: "1px solid var(--content-border)",
            background: "var(--content-bg)",
            color: "var(--text-primary)",
            cursor: "pointer",
          }}
        >
          {SERVICE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* Search */}
        <label
          htmlFor="log-search-input"
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clip: "rect(0,0,0,0)",
          }}
        >
          Search logs
        </label>
        <input
          id="log-search-input"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search logs..."
          style={{
            flex: 1,
            minWidth: 160,
            padding: "4px 10px",
            borderRadius: 8,
            fontSize: 11,
            border: "1px solid var(--content-border)",
            background: "var(--content-bg)",
            color: "var(--text-primary)",
          }}
        />

        {/* Auto-refresh toggle */}
        <label
          htmlFor="auto-refresh-toggle"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            fontSize: 11,
            color: "var(--text-secondary)",
          }}
        >
          <input
            id="auto-refresh-toggle"
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            style={{ accentColor: "#6C47FF", cursor: "pointer" }}
          />
          <span>Auto-refresh</span>
        </label>
      </div>

      {/* Count */}
      <div
        style={{
          fontSize: 11,
          color: "var(--text-tertiary)",
          marginBottom: 10,
        }}
      >
        Showing {filtered.length.toString()} of {LOG_ENTRIES.length.toString()}{" "}
        entries
      </div>

      {/* Log list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {filtered.map((entry) => (
          <div
            key={entry.id}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              padding: "8px 10px",
              borderRadius: 6,
              background: "var(--content-secondary)",
              fontFamily: "monospace",
              borderLeft: `3px solid ${getLevelColor(entry.level)}`,
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: "var(--text-tertiary)",
                flexShrink: 0,
                lineHeight: 1.8,
              }}
            >
              {entry.timestamp}
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 3,
                flexShrink: 0,
                lineHeight: 1.6,
                background: getLevelBg(entry.level),
                color: getLevelColor(entry.level),
                textTransform: "uppercase",
              }}
            >
              {entry.level}
            </span>
            <span
              style={{
                fontSize: 10,
                color: "var(--vyne-purple)",
                flexShrink: 0,
                lineHeight: 1.8,
              }}
            >
              {entry.service}
            </span>
            <span
              style={{
                fontSize: 11,
                color: "var(--text-primary)",
                lineHeight: 1.6,
                flex: 1,
                minWidth: 0,
                wordBreak: "break-word",
                fontFamily: "monospace",
              }}
            >
              {entry.message}
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "32px 0",
              color: "var(--text-tertiary)",
              fontSize: 12,
            }}
          >
            No log entries match your filters.
          </div>
        )}
      </div>
    </div>
  );
}

function AlertBanner({ alert }: Readonly<{ alert: AlertEntry }>) {
  const bg = alert.severity === "critical" ? "#FEF2F2" : "#FFFBEB";
  const border =
    alert.severity === "critical"
      ? "var(--status-danger)"
      : "var(--status-warning)";
  const textColor = alert.severity === "critical" ? "#991B1B" : "#92400E";
  const icon = alert.severity === "critical" ? "🔴" : "🟠";
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 10,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: textColor }}>
          {alert.service} — {alert.condition}
        </div>
        <div
          style={{ fontSize: 11, color: textColor, opacity: 0.8, marginTop: 2 }}
        >
          Triggered: {alert.triggered} · Active
        </div>
      </div>
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: 20,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          background: border,
          color: "#fff",
        }}
      >
        {alert.severity}
      </span>
    </div>
  );
}

function AlertsTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 10,
          }}
        >
          Active Alerts (2)
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ACTIVE_ALERTS.map((a) => (
            <AlertBanner key={a.id} alert={a} />
          ))}
        </div>
      </div>

      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 12,
          padding: "16px 18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Alert History
          </div>
          <button
            style={{
              background: "var(--vyne-purple)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 11,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            + Create Alert Rule
          </button>
        </div>
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
        >
          <thead>
            <tr>
              {[
                "Severity",
                "Service",
                "Condition",
                "Triggered",
                "Resolved",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    color: "var(--text-tertiary)",
                    fontWeight: 500,
                    paddingBottom: 8,
                    fontSize: 11,
                    borderBottom: "1px solid var(--content-border)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALERT_HISTORY.map((a) => (
              <tr
                key={a.id}
                style={{ borderBottom: "1px solid var(--content-border)" }}
              >
                <td style={{ padding: "8px 0" }}>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: 3,
                      textTransform: "uppercase",
                      background: getSeverityBg(a.severity),
                      color: getSeverityColor(a.severity),
                    }}
                  >
                    {a.severity}
                  </span>
                </td>
                <td
                  style={{
                    padding: "8px 8px 8px 0",
                    color: "var(--text-primary)",
                  }}
                >
                  {a.service}
                </td>
                <td
                  style={{
                    padding: "8px 8px 8px 0",
                    color: "var(--text-secondary)",
                    fontFamily: "monospace",
                    fontSize: 11,
                  }}
                >
                  {a.condition}
                </td>
                <td
                  style={{
                    padding: "8px 8px 8px 0",
                    color: "var(--text-secondary)",
                    fontSize: 11,
                  }}
                >
                  {a.triggered}
                </td>
                <td
                  style={{
                    padding: "8px 0",
                    color: "var(--status-success)",
                    fontSize: 11,
                  }}
                >
                  {a.resolved ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TracesTab() {
  return (
    <div
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 12,
        padding: "16px 18px",
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          Distributed Trace Viewer
        </div>
        <div
          style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}
        >
          <span>{"Trace ID: "}</span>
          <code
            style={{
              background: "var(--content-secondary)",
              padding: "1px 5px",
              borderRadius: 3,
              fontSize: 10,
            }}
          >
            {"trc_9f2a1c8e"}
          </code>
          <span>{" · POST /api/orders · Total: "}</span>
          <strong>
            {TOTAL_TRACE_MS.toString()}
            {"ms"}
          </strong>
          <span>{" · Status: "}</span>
          <span style={{ color: "var(--status-success)", fontWeight: 600 }}>
            {"200 OK"}
          </span>
        </div>
      </div>

      {/* Timeline header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 180,
            flexShrink: 0,
            fontSize: 10,
            color: "var(--text-tertiary)",
          }}
        >
          Service / Operation
        </div>
        <div
          style={{ flex: 1, display: "flex", justifyContent: "space-between" }}
        >
          <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
            0ms
          </span>
          <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
            {Math.round(TOTAL_TRACE_MS / 2).toString()}ms
          </span>
          <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
            {TOTAL_TRACE_MS.toString()}ms
          </span>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--content-border)", paddingTop: 12 }}>
        {TRACE_SPANS.map((span, idx) => {
          const leftPct = (span.offsetMs / TOTAL_TRACE_MS) * 100;
          const widthPct = (span.durationMs / TOTAL_TRACE_MS) * 100;
          return (
            <div
              key={span.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 0,
                marginBottom: 10,
                paddingLeft: `${(idx * 16).toString()}px`,
              }}
            >
              <div
                style={{
                  width: `${(180 - idx * 16).toString()}px`,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {span.service}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-secondary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {span.operation}
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  height: 28,
                  position: "relative",
                  background: "var(--table-header-bg)",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: `${leftPct.toString()}%`,
                    width: `${widthPct.toString()}%`,
                    height: "100%",
                    background: span.color,
                    borderRadius: 4,
                    opacity: 0.85,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 32,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#fff",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {span.durationMs.toString()}ms
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 16,
          flexWrap: "wrap",
          borderTop: "1px solid var(--content-border)",
          paddingTop: 12,
        }}
      >
        {TRACE_SPANS.map((span) => (
          <div
            key={span.id}
            style={{ display: "flex", alignItems: "center", gap: 5 }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: span.color,
              }}
            />
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              {span.service}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────
export default function ObservePage() {
  const [env, setEnv] = useState<Environment>("Production");
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [animated, setAnimated] = useState(false);

  const ENVS: readonly Environment[] = ["Production", "Staging", "Dev"];
  const TIME_RANGES: readonly TimeRange[] = ["1h", "6h", "24h", "7d"];
  const TABS: readonly { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "metrics", label: "Metrics" },
    { id: "logs", label: "Logs" },
    { id: "alerts", label: "Alerts" },
    { id: "traces", label: "Traces" },
  ];

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      setAnimated(true);
    }, 80);
    return () => {
      globalThis.clearTimeout(timer);
    };
  }, []);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--table-header-bg)",
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 48,
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          display: "flex",
          alignItems: "center",
          padding: "0 18px",
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "linear-gradient(135deg,#6C47FF,#9B7DFF)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Observe
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              background: "var(--badge-success-bg)",
              color: "var(--badge-success-text)",
              padding: "2px 7px",
              borderRadius: 20,
            }}
          >
            ● LIVE
          </span>
        </div>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {/* Environment picker */}
          <div
            style={{
              display: "flex",
              gap: 2,
              background: "var(--content-secondary)",
              borderRadius: 8,
              padding: 3,
            }}
          >
            {ENVS.map((e) => (
              <button
                key={e}
                onClick={() => setEnv(e)}
                style={{
                  padding: "3px 10px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                  background: env === e ? "#fff" : "transparent",
                  color:
                    env === e ? "var(--text-primary)" : "var(--text-secondary)",
                  boxShadow: env === e ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.15s",
                }}
              >
                {e}
              </button>
            ))}
          </div>

          {/* Time range picker */}
          <div
            style={{
              display: "flex",
              gap: 2,
              background: "var(--content-secondary)",
              borderRadius: 8,
              padding: 3,
            }}
          >
            {TIME_RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                style={{
                  padding: "3px 9px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                  background:
                    timeRange === r ? "var(--vyne-purple)" : "transparent",
                  color: timeRange === r ? "#fff" : "var(--text-secondary)",
                  transition: "all 0.15s",
                }}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            style={{
              background: "transparent",
              border: "1px solid var(--content-border)",
              borderRadius: 8,
              padding: "4px 12px",
              fontSize: 11,
              fontWeight: 500,
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            🔔 Alert Rules
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="content-scroll"
        style={{ flex: 1, overflowY: "auto", padding: 18 }}
      >
        {/* KPI Row */}
        <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
          <KpiCard
            label="Uptime"
            value="99.97"
            unit="%"
            color="#22C55E"
            note="↑ 0.01% from last week"
          />
          <KpiCard
            label="Avg Response"
            value="142"
            unit="ms"
            color="#22C55E"
            note="p50 across all services"
          />
          <KpiCard
            label="Error Rate"
            value="0.03"
            unit="%"
            color="#22C55E"
            note="Global · last 24h"
          />
          <KpiCard
            label="Active Alerts"
            value="2"
            unit=""
            color="#F59E0B"
            note="1 critical · 1 warning"
          />
        </div>

        {/* Service Health Map */}
        <div
          style={{
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 12,
            padding: "16px 18px",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              Service Health Map
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  color: "var(--text-secondary)",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--status-success)",
                    display: "inline-block",
                  }}
                />{" "}
                Healthy
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  color: "var(--text-secondary)",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--status-warning)",
                    display: "inline-block",
                  }}
                />{" "}
                Degraded
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  color: "var(--text-secondary)",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--status-danger)",
                    display: "inline-block",
                  }}
                />{" "}
                Down
              </span>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
            }}
          >
            {SERVICES.map((svc) => (
              <ServiceCard key={svc.id} svc={svc} />
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {/* Tab Bar */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid var(--content-border)",
              padding: "0 18px",
            }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "12px 16px",
                  fontSize: 12,
                  fontWeight: 500,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  borderBottom:
                    activeTab === tab.id
                      ? "2px solid #6C47FF"
                      : "2px solid transparent",
                  color:
                    activeTab === tab.id
                      ? "var(--vyne-purple)"
                      : "var(--text-secondary)",
                  marginBottom: -1,
                  transition: "color 0.15s",
                }}
              >
                {tab.label}
                {tab.id === "alerts" && (
                  <span
                    style={{
                      marginLeft: 5,
                      background: "var(--status-danger)",
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "1px 5px",
                      borderRadius: 20,
                    }}
                  >
                    2
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ padding: 18 }}>
            {activeTab === "overview" && <OverviewTab animated={animated} />}
            {activeTab === "metrics" && <MetricsTab />}
            {activeTab === "logs" && <LogsTab />}
            {activeTab === "alerts" && <AlertsTab />}
            {activeTab === "traces" && <TracesTab />}
          </div>
        </div>

        {/* Footer spacer */}
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}
