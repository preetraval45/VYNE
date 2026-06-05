"use client";

import { useMemo } from "react";
import {
  TrendingUp,
  Target,
  Briefcase,
  DollarSign,
  Award,
  Activity,
} from "lucide-react";
import { useSalesStore } from "@/lib/stores/sales";
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
} from "@/components/shared/dashboard/primitives";
import {
  countBy,
  sumBy,
  topN,
  bucketByDayMap,
  syntheticMonthly,
} from "@/lib/dashboard/aggregations";

// PH-F typecheck fix — OpportunityStage from the store doesn't include
// "Prospecting". The dashboard pipeline funnel walks the four pre-Won
// stages plus Closed Won; Closed Lost is shown via the dedicated lost
// counter, not in the main funnel.
const STAGE_ORDER = [
  "Qualification",
  "Proposal",
  "Negotiation",
  "Closed Won",
] as const;
const STAGE_COLORS: Record<string, string> = {
  Qualification: "#06B6D4",
  Proposal: "#A855F7",
  Negotiation: "#F59E0B",
  "Closed Won": "#22C55E",
  "Closed Lost": "#EF4444",
};

export function SalesDashboardView() {
  // PH-F typecheck fix — SalesStore exposes `deals` + `salesOrders`,
  // not `opportunities`/`orders`. The dashboard's variable names match
  // the entity-level domain, but the store names are kept for
  // backwards compatibility with older callers.
  const opportunities = useSalesStore((s) => s.deals);
  const orders = useSalesStore((s) => s.salesOrders);
  const products = useSalesStore((s) => s.products);
  const customers = useSalesStore((s) => s.customers);

  const {
    byStage,
    byAssignee,
    valueByStage,
    pipelineValue,
    weightedPipeline,
    wonValue,
    activeCount,
    wonCount,
    lostCount,
    avgDeal,
    activityMap,
  } = useMemo(() => {
    const byStage = countBy(opportunities, (o) => o.stage);
    const byAssignee = countBy(
      opportunities.filter(
        (o) => o.stage !== "Closed Won" && o.stage !== "Closed Lost",
      ),
      (o) => o.assignee,
    );
    const valueByStage = sumBy(
      opportunities,
      (o) => o.stage,
      (o) => o.value,
    );
    const pipelineValue = opportunities
      .filter((o) => o.stage !== "Closed Won" && o.stage !== "Closed Lost")
      .reduce((s, o) => s + o.value, 0);
    const weightedPipeline = opportunities
      .filter((o) => o.stage !== "Closed Won" && o.stage !== "Closed Lost")
      .reduce((s, o) => s + o.value * (o.probability / 100), 0);
    const wonValue = valueByStage.get("Closed Won") ?? 0;
    const wonCount = byStage.get("Closed Won") ?? 0;
    const lostCount = byStage.get("Closed Lost") ?? 0;
    const activeCount = opportunities.length - wonCount - lostCount;
    const avgDeal =
      activeCount > 0 ? Math.round(pipelineValue / activeCount) : 0;
    const activityMap = bucketByDayMap(opportunities, (o) => o.createdAt);
    return {
      byStage,
      byAssignee,
      valueByStage,
      pipelineValue,
      weightedPipeline,
      wonValue,
      activeCount,
      wonCount,
      lostCount,
      avgDeal,
      activityMap,
    };
  }, [opportunities]);

  const winRate =
    wonCount + lostCount > 0
      ? Math.round((wonCount / (wonCount + lostCount)) * 100)
      : 0;
  const orderRevenue = orders.reduce((s, o) => s + (o.amount ?? 0), 0);

  const kpis = [
    {
      label: "Pipeline Value",
      value: fmtMoney(pipelineValue),
      delta: `${activeCount} active`,
      positive: true,
      icon: <DollarSign size={16} />,
      accent: "#22C55E",
      sparkline: syntheticMonthly(pipelineValue / 6 || 50000, 14, 0.05),
    },
    {
      label: "Weighted Pipeline",
      value: fmtMoney(weightedPipeline),
      delta: `${Math.round((weightedPipeline / Math.max(pipelineValue, 1)) * 100)}% likely`,
      positive: true,
      icon: <Target size={16} />,
      accent: "#06B6D4",
      sparkline: syntheticMonthly(weightedPipeline / 6 || 30000, 14, 0.04),
    },
    {
      label: "Avg Deal Size",
      value: fmtMoney(avgDeal),
      delta: "+6.2%",
      positive: true,
      icon: <Briefcase size={16} />,
      accent: "#6C47FF",
      sparkline: syntheticMonthly(avgDeal || 10000, 14, 0.02),
    },
    {
      label: "Win Rate",
      value: `${winRate}%`,
      delta: winRate >= 30 ? "healthy" : "improve",
      positive: winRate >= 30,
      icon: <Award size={16} />,
      accent: "#F59E0B",
      sparkline: [22, 26, 24, 28, 30, 32, 30, 28, 32, 35, 36, 38, winRate],
    },
  ];

  const funnelStages = STAGE_ORDER.map((s) => ({
    label: s,
    value: byStage.get(s) ?? 0,
    color: STAGE_COLORS[s],
  })).filter((s) => s.value > 0);

  const topOpps = topN(
    opportunities.filter(
      (o) => o.stage !== "Closed Won" && o.stage !== "Closed Lost",
    ),
    8,
    (o) => o.value,
  ).map((o, i) => ({
    label: o.company,
    value: Math.round(o.value / 1000),
    color: STAGE_COLORS[o.stage] || CHART_COLORS[i % CHART_COLORS.length],
  }));

  const assigneeBars = Array.from(byAssignee.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const pipelineTrend = syntheticMonthly(pipelineValue / 6 || 50000, 6, 0.06);
  const wonTrend = syntheticMonthly(wonValue / 6 || 20000, 6, 0.08);

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
        greeting={`${greetingFor()} — sales pulse`}
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
              <Target size={13} /> Opportunity Funnel
            </>
          }
        >
          {funnelStages.length === 0 ? (
            <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              No opportunities yet.
            </p>
          ) : (
            <FunnelChart stages={funnelStages} />
          )}
        </Card>
        <Card
          title={
            <>
              <TrendingUp size={13} /> Pipeline vs Closed-Won
            </>
          }
        >
          <AreaChart
            series={[
              { color: "#06B6D4", values: pipelineTrend },
              { color: "#22C55E", values: wonTrend },
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
        <Card title="Top Opportunities ($K)">
          {topOpps.length === 0 ? (
            <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              No active opps.
            </p>
          ) : (
            <Treemap items={topOpps} />
          )}
        </Card>
        <Card title="Pipeline by Stage">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <Donut
              segments={Array.from(byStage.entries()).map(
                ([label, value], i) => ({
                  label,
                  value,
                  color:
                    STAGE_COLORS[label] ??
                    CHART_COLORS[i % CHART_COLORS.length],
                }),
              )}
              centerValue={opportunities.length.toString()}
              centerLabel="Opps"
            />
            <Legend
              items={Array.from(byStage.entries()).map(([label, value], i) => ({
                label,
                value,
                color:
                  STAGE_COLORS[label] ?? CHART_COLORS[i % CHART_COLORS.length],
              }))}
            />
          </div>
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

      <Card
        title={
          <>
            <Activity size={13} /> Activity Heatmap (12 weeks)
          </>
        }
      >
        <ActivityCalendar data={activityMap} weeks={12} tone="#22C55E" />
      </Card>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
        }}
      >
        <Card title="Quick Stats">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              fontSize: 11.5,
            }}
          >
            <div>
              <div style={{ color: "var(--text-tertiary)", fontSize: 10 }}>
                Orders
              </div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                {orders.length}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--text-tertiary)", fontSize: 10 }}>
                Order revenue
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#22C55E" }}>
                {fmtMoney(orderRevenue)}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--text-tertiary)", fontSize: 10 }}>
                Products
              </div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                {products.length}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--text-tertiary)", fontSize: 10 }}>
                Customers
              </div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                {customers.length}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
