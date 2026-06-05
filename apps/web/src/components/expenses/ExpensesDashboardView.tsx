"use client";

import { useMemo } from "react";
import { Receipt, Clock, DollarSign, PieChart, Activity } from "lucide-react";
import { useExpensesStore } from "@/lib/stores/expenses";
import {
  Card,
  HeroBanner,
  GradientKpiTile,
  Donut,
  Legend,
  AreaChart,
  BarChart,
  Treemap,
  ActivityCalendar,
  Histogram,
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

const STATUS_COLORS: Record<string, string> = {
  draft: "#94A3B8",
  submitted: "#06B6D4",
  approved: "#22C55E",
  rejected: "#EF4444",
  paid: "#8B5CF6",
};

const CATEGORY_COLORS: Record<string, string> = {
  travel: "#6C47FF",
  meals: "#F59E0B",
  software: "#06B6D4",
  office: "#EC4899",
  other: "#94A3B8",
};

export function ExpensesDashboardView() {
  const expenses = useExpensesStore((s) => s.expenses);

  const {
    byCategory,
    byStatus,
    bySubmitter,
    amountByCategory,
    amountByStatus,
    amountBySubmitter,
    totalSpent,
    pendingCount,
    approvedCount,
    rejectedCount,
    avgExpense,
    activityMap,
  } = useMemo(() => {
    const byCategory = countBy(expenses, (e) => e.category);
    const byStatus = countBy(expenses, (e) => e.status);
    const bySubmitter = countBy(expenses, (e) => e.submittedBy);
    const amountByCategory = sumBy(
      expenses,
      (e) => e.category,
      (e) => e.amount,
    );
    const amountByStatus = sumBy(
      expenses,
      (e) => e.status,
      (e) => e.amount,
    );
    const amountBySubmitter = sumBy(
      expenses,
      (e) => e.submittedBy,
      (e) => e.amount,
    );
    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
    const pendingCount =
      (byStatus.get("submitted") ?? 0) + (byStatus.get("draft") ?? 0);
    const approvedCount = byStatus.get("approved") ?? 0;
    const rejectedCount = byStatus.get("rejected") ?? 0;
    const avgExpense =
      expenses.length > 0 ? Math.round(totalSpent / expenses.length) : 0;
    const activityMap = bucketByDayMap(expenses, (e) => e.date);
    return {
      byCategory,
      byStatus,
      bySubmitter,
      amountByCategory,
      amountByStatus,
      amountBySubmitter,
      totalSpent,
      pendingCount,
      approvedCount,
      rejectedCount,
      avgExpense,
      activityMap,
    };
  }, [expenses]);

  const kpis = [
    {
      label: "Spend (YTD)",
      value: fmtMoney(totalSpent),
      delta: "+8.2%",
      positive: false,
      icon: <DollarSign size={16} />,
      accent: "#F59E0B",
      sparkline: syntheticMonthly(totalSpent / 12 || 1000, 14, 0.03),
    },
    {
      label: "Pending Approval",
      value: pendingCount.toString(),
      delta: pendingCount > 5 ? "needs review" : "ok",
      positive: pendingCount <= 5,
      icon: <Clock size={16} />,
      accent: "#06B6D4",
      sparkline: [3, 4, 5, 4, 6, 5, 4, 3, 5, 6, 4, 3, pendingCount],
    },
    {
      label: "Approved",
      value: approvedCount.toString(),
      delta: `${Math.round((approvedCount / Math.max(expenses.length, 1)) * 100)}%`,
      positive: true,
      icon: <Receipt size={16} />,
      accent: "#22C55E",
      sparkline: syntheticMonthly(approvedCount || 1, 14, 0.05),
    },
    {
      label: "Avg Expense",
      value: fmtMoney(avgExpense),
      delta: avgExpense < 500 ? "low" : "watch",
      positive: avgExpense < 500,
      icon: <PieChart size={16} />,
      accent: "#6C47FF",
      sparkline: syntheticMonthly(avgExpense || 100, 14, 0.02),
    },
  ];

  const categoryDonut = Array.from(byCategory.entries()).map(
    ([label, value]) => ({
      label,
      value,
      color: CATEGORY_COLORS[label] ?? CHART_COLORS[0],
    }),
  );

  const categoryTreemap = Array.from(amountByCategory.entries()).map(
    ([label, value]) => ({
      label,
      value: Math.round(value),
      color: CATEGORY_COLORS[label] ?? CHART_COLORS[0],
    }),
  );

  const topSpenderBars = topN(
    Array.from(amountBySubmitter.entries()),
    6,
    ([, v]) => v,
  ).map(([label, value]) => ({
    label,
    value: Math.round(value),
  }));

  /* Status by category histogram */
  const statusByCategoryBuckets = Array.from(byCategory.keys());
  const statusOrder = ["approved", "submitted", "draft", "rejected"] as const;
  const histogramSeries = statusOrder.map((st) => ({
    color: STATUS_COLORS[st],
    label: st[0].toUpperCase() + st.slice(1),
    values: statusByCategoryBuckets.map(
      (cat) =>
        expenses.filter((e) => e.category === cat && e.status === st).length,
    ),
  }));

  const spendTrend = syntheticMonthly(totalSpent / 12 || 1000, 12, 0.04);

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
        greeting={`${greetingFor()} — expense overview`}
        metrics={[
          { label: "Total", value: fmtMoney(totalSpent) },
          { label: "Pending", value: pendingCount },
          { label: "Approved", value: approvedCount },
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
        <Card title="Spend Trend (12 months)">
          <AreaChart
            series={[{ color: "#F59E0B", values: spendTrend }]}
            forecast={{ steps: 3, spread: 80 }}
            height={150}
          />
          <p style={{ fontSize: 10, color: "var(--text-tertiary)", margin: 0 }}>
            Shaded = 3-month forecast cone
          </p>
        </Card>
        <Card title="By Category">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <Donut
              segments={
                categoryDonut.length
                  ? categoryDonut
                  : [{ label: "None", value: 1, color: "#94A3B8" }]
              }
              centerValue={expenses.length.toString()}
              centerLabel="Expenses"
            />
            <Legend
              items={categoryDonut.map((s) => ({
                label: s.label,
                value: s.value,
                color: s.color,
              }))}
            />
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
        <Card title="Spend by Category ($)">
          <Treemap items={categoryTreemap} />
        </Card>
        <Card title="Top Spenders ($)">
          {topSpenderBars.length === 0 ? (
            <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              No expenses yet.
            </p>
          ) : (
            <BarChart bars={topSpenderBars} horizontal width={300} />
          )}
        </Card>
        <Card title="Status by Category">
          {statusByCategoryBuckets.length === 0 ? (
            <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              No data.
            </p>
          ) : (
            <>
              <Histogram
                buckets={statusByCategoryBuckets}
                series={histogramSeries}
              />
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  fontSize: 10,
                  flexWrap: "wrap",
                }}
              >
                {histogramSeries.map((s) => (
                  <span
                    key={s.label}
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        background: s.color,
                        display: "inline-block",
                        borderRadius: 2,
                        marginRight: 4,
                      }}
                    />
                    {s.label}
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      <Card
        title={
          <>
            <Activity size={13} /> Submission Heatmap (12 weeks)
          </>
        }
      >
        <ActivityCalendar data={activityMap} weeks={12} tone="#F59E0B" />
      </Card>
    </div>
  );
}
