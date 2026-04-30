"use client";

import { Sparkline } from "./Sparkline";
import type { DoraSummary } from "@/lib/dora";

interface Props {
  summary: DoraSummary;
}

/**
 * DORA-style metrics card: deploy frequency (with 14-day sparkline),
 * change failure rate, lead time, MTTR. All four are computed from the
 * deploy list — no extra backend needed.
 */
export function DoraCard({ summary }: Props) {
  const cfRate = summary.changeFailureRate;
  const cfColor =
    cfRate < 15
      ? "var(--status-success, #16a34a)"
      : cfRate < 30
        ? "var(--status-warning, #d97706)"
        : "var(--status-danger, #dc2626)";

  const items: Array<{ label: string; value: string; sub?: string; color?: string; spark?: number[] }> = [
    {
      label: "Deploy frequency · 7d",
      value: String(summary.freq7d),
      sub: `${summary.freq30d} in 30d`,
      color: "var(--vyne-accent, #5B5BD6)",
      spark: summary.spark,
    },
    {
      label: "Change failure rate",
      value: `${cfRate}%`,
      sub: cfRate < 15 ? "Elite" : cfRate < 30 ? "Watch" : "Investigate",
      color: cfColor,
    },
    {
      label: "Lead time (median)",
      value: summary.leadTimeMedianMin != null ? formatMin(summary.leadTimeMedianMin) : "—",
      sub: "Build → success",
    },
    {
      label: "Mean time to recovery",
      value: summary.mttrMedianMin != null ? formatMin(summary.mttrMedianMin) : "—",
      sub: "Failed → next success",
    },
  ];

  return (
    <div
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--text-tertiary)",
          marginBottom: 10,
        }}
      >
        DORA metrics
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 14,
        }}
      >
        {items.map((it) => (
          <div key={it.label}>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                marginBottom: 4,
              }}
            >
              {it.label}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: it.color ?? "var(--text-primary)",
                }}
              >
                {it.value}
              </span>
              {it.spark && (
                <span style={{ color: it.color ?? "var(--vyne-accent, #5B5BD6)" }}>
                  <Sparkline values={it.spark} ariaLabel={`${it.label} 14-day trend`} />
                </span>
              )}
            </div>
            {it.sub && (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  marginTop: 2,
                }}
              >
                {it.sub}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatMin(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
