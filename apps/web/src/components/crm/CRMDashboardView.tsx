"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Briefcase,
  DollarSign,
  Target,
  TrendingUp,
  Activity,
  Calendar as CalendarIcon,
  ArrowRight,
} from "lucide-react";
import { useDeals } from "@/lib/stores/crm";
import { useActivityStore } from "@/lib/stores/activity";
import {
  Card,
  HeroBanner,
  GradientKpiTile,
  Donut,
  Legend,
  AreaChart,
  BarChart,
  FunnelChart,
  Treemap,
  ActivityCalendar,
  CHART_COLORS,
  fmtMoney,
  greetingFor,
  relativeTime,
} from "@/components/shared/dashboard/primitives";
import {
  countBy,
  sumBy,
  topN,
  bucketByDayMap,
  syntheticMonthly,
} from "@/lib/dashboard/aggregations";

const STAGE_ORDER = [
  "Lead",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Won",
] as const;
const STAGE_COLORS: Record<string, string> = {
  Lead: "#94A3B8",
  Qualified: "#06B6D4",
  Proposal: "#A855F7",
  Negotiation: "#F59E0B",
  Won: "#22C55E",
  Lost: "#EF4444",
};

export function CRMDashboardView() {
  const deals = useDeals();
  const allActivity = useActivityStore((s) => s.entries);
  const recentActivity = useMemo(
    () => allActivity.filter((e) => e.recordType === "deal").slice(0, 6),
    [allActivity],
  );

  /* ─── DSA: build all indices in one pass, then derive ─── */
  const {
    byStage,
    bySource,
    byAssignee,
    valueByStage,
    valueBySource,
    pipelineValue,
    weightedPipeline,
    wonValue,
    activeDeals,
    wonCount,
    lostCount,
  } = useMemo(() => {
    const byStage = countBy(deals, (d) => d.stage);
    const bySource = countBy(deals, (d) => d.source);
    const byAssignee = countBy(
      deals.filter((d) => d.stage !== "Won" && d.stage !== "Lost"),
      (d) => d.assignee,
    );
    const valueByStage = sumBy(
      deals,
      (d) => d.stage,
      (d) => d.value,
    );
    const valueBySource = sumBy(
      deals,
      (d) => d.source,
      (d) => d.value,
    );
    const pipelineValue = deals
      .filter((d) => d.stage !== "Won" && d.stage !== "Lost")
      .reduce((s, d) => s + d.value, 0);
    const weightedPipeline = deals
      .filter((d) => d.stage !== "Won" && d.stage !== "Lost")
      .reduce((s, d) => s + d.value * (d.probability / 100), 0);
    const wonValue = valueByStage.get("Won") ?? 0;
    const wonCount = byStage.get("Won") ?? 0;
    const lostCount = byStage.get("Lost") ?? 0;
    const activeDeals = deals.length - wonCount - lostCount;
    return {
      byStage,
      bySource,
      byAssignee,
      valueByStage,
      valueBySource,
      pipelineValue,
      weightedPipeline,
      wonValue,
      activeDeals,
      wonCount,
      lostCount,
    };
  }, [deals]);

  const winRate =
    wonCount + lostCount > 0
      ? Math.round((wonCount / (wonCount + lostCount)) * 100)
      : 0;
  const avgDeal = activeDeals > 0 ? Math.round(pipelineValue / activeDeals) : 0;

  /* ─── KPI tiles with sparklines from synthetic + real data ─── */
  const kpis = [
    {
      label: "Pipeline Value",
      value: fmtMoney(pipelineValue),
      delta: "+8.4%",
      positive: true,
      icon: <DollarSign size={16} />,
      accent: "#22C55E",
      sparkline: syntheticMonthly(pipelineValue / 6 || 50000, 14, 0.04),
    },
    {
      label: "Weighted Pipeline",
      value: fmtMoney(weightedPipeline),
      delta: `${Math.round((weightedPipeline / Math.max(pipelineValue, 1)) * 100)}% likely`,
      positive: true,
      icon: <Target size={16} />,
      accent: "#06B6D4",
      sparkline: syntheticMonthly(weightedPipeline / 6 || 30000, 14, 0.05),
    },
    {
      label: "Active Deals",
      value: activeDeals.toString(),
      delta: `${deals.length} total`,
      positive: true,
      icon: <Briefcase size={16} />,
      accent: "#6C47FF",
      sparkline: [2, 3, 3, 4, 5, 5, 6, 7, 7, 8, 9, 10, activeDeals],
    },
    {
      label: "Win Rate",
      value: `${winRate}%`,
      delta: winRate >= 30 ? "healthy" : "improve",
      positive: winRate >= 30,
      icon: <TrendingUp size={16} />,
      accent: "#F59E0B",
      sparkline: [22, 25, 28, 30, 28, 32, 34, 30, 28, 32, 35, 38, winRate],
    },
  ];

  /* ─── Funnel: deals by stage ─── */
  const funnelStages = STAGE_ORDER.map((s) => ({
    label: s,
    value: byStage.get(s) ?? 0,
    color: STAGE_COLORS[s],
  })).filter((s) => s.value > 0);

  /* ─── Source donut ─── */
  const sourceSegments = Array.from(bySource.entries()).map(
    ([label, value], i) => ({
      label: label[0].toUpperCase() + label.slice(1),
      value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }),
  );

  /* ─── Pipeline value trend (synthetic 6-month w/ won baseline) ─── */
  const pipelineSeries = syntheticMonthly(pipelineValue / 6 || 50000, 6, 0.06);
  const actualSeries = syntheticMonthly(wonValue / 6 || 20000, 6, 0.08);

  /* ─── Top deals by value (treemap) ─── */
  const topDeals = topN(
    deals.filter((d) => d.stage !== "Won" && d.stage !== "Lost"),
    8,
    (d) => d.value,
  ).map((d, i) => ({
    label: d.company,
    value: Math.round(d.value / 1000),
    color: STAGE_COLORS[d.stage] || CHART_COLORS[i % CHART_COLORS.length],
  }));

  /* ─── Assignee horizontal bar ─── */
  const assigneeBars = Array.from(byAssignee.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  /* ─── Activity calendar from deal lastActivity ─── */
  const activityMap = useMemo(
    () => bucketByDayMap(deals, (d) => d.lastActivity),
    [deals],
  );

  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        padding: "16px 20px 32px",
        background: "var(--content-bg-secondary)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <HeroBanner
        greeting={`${greetingFor()} — CRM pulse`}
        metrics={[
          { label: "Pipeline", value: fmtMoney(pipelineValue) },
          { label: "Won YTD", value: fmtMoney(wonValue) },
          { label: "Win Rate", value: `${winRate}%` },
        ]}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 10,
        }}
      >
        {kpis.map((k) => (
          <GradientKpiTile key={k.label} {...k} />
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
          gap: 10,
        }}
      >
        <Card
          title={
            <>
              <Target size={13} /> Pipeline Funnel
            </>
          }
        >
          {funnelStages.length === 0 ? (
            <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              No deals yet.
            </p>
          ) : (
            <FunnelChart stages={funnelStages} />
          )}
        </Card>
        <Card
          title={
            <>
              <CalendarIcon size={13} /> Pipeline Value vs Closed-Won
            </>
          }
        >
          <AreaChart
            series={[
              { color: "#06B6D4", values: pipelineSeries },
              { color: "#22C55E", values: actualSeries },
            ]}
            height={140}
          />
          <div style={{ display: "flex", gap: 12, fontSize: 10.5 }}>
            <span style={{ color: "var(--text-secondary)" }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  background: "#06B6D4",
                  display: "inline-block",
                  borderRadius: 2,
                  marginRight: 4,
                }}
              />
              Pipeline
            </span>
            <span style={{ color: "var(--text-secondary)" }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  background: "#22C55E",
                  display: "inline-block",
                  borderRadius: 2,
                  marginRight: 4,
                }}
              />
              Closed-Won
            </span>
          </div>
        </Card>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 10,
        }}
      >
        <Card title="Deals by Source">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <Donut
              segments={sourceSegments}
              centerValue={deals.length.toString()}
              centerLabel="Deals"
            />
            <Legend
              items={sourceSegments.map((s) => ({
                label: s.label,
                value: s.value,
                color: s.color,
              }))}
            />
          </div>
        </Card>
        <Card title="Top Deals (by value, $K)">
          {topDeals.length === 0 ? (
            <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              No active deals.
            </p>
          ) : (
            <Treemap items={topDeals} />
          )}
        </Card>
        <Card title="Workload by Owner">
          {assigneeBars.length === 0 ? (
            <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              No assignees.
            </p>
          ) : (
            <BarChart bars={assigneeBars} horizontal width={300} />
          )}
        </Card>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
          gap: 10,
        }}
      >
        <Card
          title={
            <>
              <Activity size={13} /> Activity heatmap (12 weeks)
            </>
          }
        >
          <ActivityCalendar data={activityMap} weeks={12} tone="#06B6D4" />
        </Card>
        <Card
          title="Recent activity"
          actions={
            <Link
              href="/crm"
              style={{
                fontSize: 11,
                color: "var(--vyne-accent)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              View all <ArrowRight size={11} />
            </Link>
          }
        >
          {recentActivity.length === 0 ? (
            <p
              style={{ fontSize: 11, color: "var(--text-tertiary)", margin: 0 }}
            >
              No recent activity.
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontSize: 11,
              }}
            >
              {recentActivity.map((a) => (
                <li
                  key={a.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 6,
                    padding: "5px 8px",
                    borderRadius: 6,
                    background: "var(--content-secondary)",
                  }}
                >
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "var(--text-primary)",
                    }}
                  >
                    <strong style={{ fontWeight: 600 }}>
                      {a.actor ?? "You"}
                    </strong>{" "}
                    {a.verb} {a.summary}
                  </span>
                  <span style={{ color: "var(--text-tertiary)", fontSize: 10 }}>
                    {relativeTime(a.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
