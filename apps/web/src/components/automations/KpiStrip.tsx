import React from "react";
import { Zap, BarChart2, Clock } from "lucide-react";

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard(
  props: Readonly<{
    icon: React.ReactNode;
    label: string;
    value: string;
    sub: string;
    accent: string;
  }>,
) {
  return (
    <div
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 12,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `${props.accent}18`,
          flexShrink: 0,
        }}
      >
        {props.icon}
      </div>
      <div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-secondary)",
            marginBottom: 2,
          }}
        >
          {props.label}
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.1,
          }}
        >
          {props.value}
        </div>
        <div
          style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}
        >
          {props.sub}
        </div>
      </div>
    </div>
  );
}

// ─── KPI Strip ────────────────────────────────────────────────────────────────

export default function KpiStrip(
  props: Readonly<{
    totalAutomations: number;
    activeCount: number;
    totalRuns: number;
  }>,
) {
  const { totalAutomations, activeCount, totalRuns } = props;

  return (
    <div
      style={{
        padding: "12px 18px",
        borderBottom: "1px solid var(--content-border)",
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 220px))",
        gap: 12,
        background: "var(--content-bg)",
        flexShrink: 0,
      }}
    >
      <KpiCard
        icon={<Zap size={18} color="var(--vyne-accent, #06B6D4)" />}
        label="Total Automations"
        value={String(totalAutomations)}
        sub={`${activeCount} active right now`}
        accent="var(--vyne-accent, #06B6D4)"
      />
      <KpiCard
        icon={<BarChart2 size={18} color="#22C55E" />}
        label="Runs This Month"
        value={totalRuns.toLocaleString()}
        sub="Across all automations"
        accent="#22C55E"
      />
      <KpiCard
        icon={<Clock size={18} color="#F59E0B" />}
        label="Time Saved (est.)"
        value="47h"
        sub="Based on avg. 5 min / run"
        accent="#F59E0B"
      />
    </div>
  );
}
