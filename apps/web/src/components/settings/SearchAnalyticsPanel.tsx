"use client";

import { useMemo } from "react";
import { Search, TrendingUp, AlertTriangle, Trash2 } from "lucide-react";
import { useSearchAnalytics } from "@/lib/stores/searchAnalytics";

/**
 * SearchAnalyticsPanel — admin-only Settings panel.
 *
 * Reads from `useSearchAnalytics` (every Cmd+K + global search submission
 * is logged client-side). Surfaces:
 *   - top 20 queries by volume
 *   - zero-result rate as a single KPI
 *   - per-query click-through rate
 *   - a "Clear log" action
 *
 * No server round-trip; counts are scoped to this device. Treat as a
 * sample, not a workspace-wide stat.
 */
export default function SearchAnalyticsPanel() {
  const events = useSearchAnalytics((s) => s.events);
  const topQueries = useSearchAnalytics((s) => s.topQueries);
  const zeroResultRate = useSearchAnalytics((s) => s.zeroResultRate);
  const clear = useSearchAnalytics((s) => s.clear);

  const top = useMemo(() => topQueries(20), [topQueries, events]);
  const zr = useMemo(() => zeroResultRate(), [zeroResultRate, events]);
  const totalQueries = events.length;
  const clicks = events.filter((e) => e.clicked).length;
  const avgCtr = totalQueries === 0 ? 0 : clicks / totalQueries;

  return (
    <div>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.10)",
            color: "var(--vyne-accent, var(--vyne-purple))",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Search size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Search analytics
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "var(--text-tertiary)",
            }}
          >
            Top queries + zero-result rate from this device. Last {totalQueries}{" "}
            search{totalQueries === 1 ? "" : "es"}.
          </p>
        </div>
        <button
          type="button"
          onClick={clear}
          disabled={totalQueries === 0}
          aria-label="Clear analytics"
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid var(--content-border)",
            background: "var(--content-bg)",
            color: "var(--text-secondary)",
            fontSize: 12,
            fontWeight: 500,
            cursor: totalQueries === 0 ? "default" : "pointer",
            opacity: totalQueries === 0 ? 0.5 : 1,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Trash2 size={11} /> Clear
        </button>
      </header>

      {/* KPI tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 10,
          marginBottom: 18,
        }}
      >
        <Kpi
          label="Total searches"
          value={totalQueries.toString()}
          accent="var(--vyne-accent, var(--vyne-purple))"
          icon={<Search size={12} />}
        />
        <Kpi
          label="Click-through"
          value={`${(avgCtr * 100).toFixed(0)}%`}
          accent="#22C55E"
          icon={<TrendingUp size={12} />}
        />
        <Kpi
          label="Zero-result rate"
          value={`${(zr * 100).toFixed(0)}%`}
          accent={zr > 0.3 ? "var(--status-danger, #EF4444)" : "var(--status-warning, #F59E0B)"}
          icon={<AlertTriangle size={12} />}
        />
      </div>

      {/* Top queries table */}
      <section
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <header
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid var(--content-border)",
            fontSize: 12,
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          Top queries
        </header>
        {top.length === 0 ? (
          <div
            style={{
              padding: 28,
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: 12,
            }}
          >
            No searches yet — open Ctrl+/ to try the global search.
          </div>
        ) : (
          <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {top.map((row, idx) => (
              <li
                key={row.query}
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 1fr 80px 60px",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 14px",
                  borderTop:
                    idx === 0 ? undefined : "1px solid var(--content-border)",
                  fontSize: 12.5,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                  }}
                >
                  #{idx + 1}
                </span>
                <span
                  style={{
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={row.query}
                >
                  {row.query}
                </span>
                <span
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    color: "var(--text-secondary)",
                    fontSize: 11,
                  }}
                >
                  {row.count} run{row.count === 1 ? "" : "s"}
                </span>
                <span
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    color:
                      row.ctr > 0.5
                        ? "#22C55E"
                        : row.ctr > 0.2
                          ? "var(--status-warning, #F59E0B)"
                          : "var(--text-tertiary)",
                    fontSize: 11,
                    fontWeight: 600,
                    textAlign: "right",
                  }}
                >
                  {(row.ctr * 100).toFixed(0)}%
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 10,
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: accent,
          marginBottom: 6,
        }}
      >
        {icon}
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "var(--text-primary)",
          lineHeight: 1.1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}
