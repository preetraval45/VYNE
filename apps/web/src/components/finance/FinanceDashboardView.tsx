"use client";

import { useMemo } from "react";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Percent,
  BookOpen,
  Wallet,
} from "lucide-react";
import { useJournalEntries } from "@/lib/stores/finance";
import {
  Card,
  HeroBanner,
  GradientKpiTile,
  Donut,
  Legend,
  AreaChart,
  BarChart,
  Treemap,
  Gauge,
  CHART_COLORS,
  fmtMoney,
  greetingFor,
} from "@/components/shared/dashboard/primitives";
import {
  countBy,
  sumBy,
  topN,
  syntheticMonthly,
} from "@/lib/dashboard/aggregations";

export function FinanceDashboardView() {
  const journal = useJournalEntries();

  const {
    statusCounts,
    statusValues,
    totalDebits,
    postedTotal,
    draftCount,
    postedCount,
  } = useMemo(() => {
    const statusCounts = countBy(journal, (j) => j.status);
    const statusValues = sumBy(
      journal,
      (j) => j.status,
      (j) => j.totalDebits ?? 0,
    );
    const totalDebits = journal.reduce((s, j) => s + (j.totalDebits ?? 0), 0);
    return {
      statusCounts,
      statusValues,
      totalDebits,
      postedTotal: statusValues.get("posted") ?? 0,
      draftCount: statusCounts.get("draft") ?? 0,
      postedCount: statusCounts.get("posted") ?? 0,
    };
  }, [journal]);

  // Synthetic monthly P&L (fallback to derived data)
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthlyRevenue = syntheticMonthly(
    Math.max(totalDebits / 12, 50000),
    12,
    0.04,
  );
  const monthlyExpenses = syntheticMonthly(
    Math.max(totalDebits / 16, 35000),
    12,
    0.03,
  );

  const revenueYTD = monthlyRevenue.reduce((s, v) => s + v, 0);
  const expensesYTD = monthlyExpenses.reduce((s, v) => s + v, 0);
  const netProfit = revenueYTD - expensesYTD;
  const margin =
    revenueYTD > 0 ? Math.round((netProfit / revenueYTD) * 100) : 0;

  const kpis = [
    {
      label: "Revenue (YTD)",
      value: fmtMoney(revenueYTD),
      delta: "+11.2%",
      positive: true,
      icon: <TrendingUp size={16} />,
      accent: "#22C55E",
      sparkline: monthlyRevenue,
    },
    {
      label: "Expenses (YTD)",
      value: fmtMoney(expensesYTD),
      delta: "+4.8%",
      positive: false,
      icon: <TrendingDown size={16} />,
      accent: "#F59E0B",
      sparkline: monthlyExpenses,
    },
    {
      label: "Net Profit",
      value: fmtMoney(netProfit),
      delta: netProfit > 0 ? "in the black" : "in the red",
      positive: netProfit > 0,
      icon: <DollarSign size={16} />,
      accent: "#6C47FF",
      sparkline: monthlyRevenue.map((r, i) => r - monthlyExpenses[i]),
    },
    {
      label: "Profit Margin",
      value: `${margin}%`,
      delta: margin >= 20 ? "healthy" : margin >= 10 ? "watch" : "low",
      positive: margin >= 20,
      icon: <Percent size={16} />,
      accent: "#06B6D4",
      sparkline: monthlyRevenue.map((r, i) =>
        Math.round(((r - monthlyExpenses[i]) / r) * 100),
      ),
    },
  ];

  /* ─── Revenue vs Expenses area ─── */
  /* ─── Journal status donut ─── */
  const statusDonut = Array.from(statusCounts.entries()).map(
    ([label, value], i) => ({
      label: label[0].toUpperCase() + label.slice(1),
      value,
      color:
        label === "posted"
          ? "#22C55E"
          : label === "draft"
            ? "#F59E0B"
            : CHART_COLORS[i % CHART_COLORS.length],
    }),
  );

  /* ─── Top journal entries by debit (treemap) ─── */
  const topEntries = topN(journal, 8, (j) => j.totalDebits ?? 0).map(
    (j, i) => ({
      label: j.description?.slice(0, 12) ?? j.entryNumber,
      value: Math.round((j.totalDebits ?? 0) / 1000),
      color: CHART_COLORS[i % CHART_COLORS.length],
    }),
  );

  /* ─── Expense categories (synthetic split) ─── */
  const expenseCategories = [
    { label: "Salaries", value: 45, color: "#6C47FF" },
    { label: "Cloud/SaaS", value: 22, color: "#06B6D4" },
    { label: "Marketing", value: 14, color: "#EC4899" },
    { label: "Office", value: 8, color: "#F59E0B" },
    { label: "Travel", value: 6, color: "#22C55E" },
    { label: "Other", value: 5, color: "#94A3B8" },
  ];

  /* ─── Top accounts (synthetic from journal lines) ─── */
  const accountsBars = (() => {
    const acctMap = new Map<string, number>();
    for (const j of journal) {
      for (const line of j.lines ?? []) {
        const v = (line.debit ?? 0) + (line.credit ?? 0);
        acctMap.set(line.account, (acctMap.get(line.account) ?? 0) + v);
      }
    }
    return Array.from(acctMap.entries())
      .map(([label, value]) => ({ label, value: Math.round(value / 1000) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  })();

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
        greeting={`${greetingFor()} — finance overview`}
        metrics={[
          { label: "Revenue", value: fmtMoney(revenueYTD) },
          { label: "Net Profit", value: fmtMoney(netProfit) },
          { label: "Margin", value: `${margin}%` },
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
              <BookOpen size={13} /> Revenue vs Expenses (12 months)
            </>
          }
        >
          <AreaChart
            series={[
              {
                color: "#22C55E",
                values: monthlyRevenue.map((v) => Math.round(v / 1000)),
              },
              {
                color: "#F59E0B",
                values: monthlyExpenses.map((v) => Math.round(v / 1000)),
              },
            ]}
            height={150}
          />
          <div style={{ display: "flex", gap: 12, fontSize: 10.5 }}>
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
              Revenue ($K)
            </span>
            <span style={{ color: "var(--text-secondary)" }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  background: "#F59E0B",
                  display: "inline-block",
                  borderRadius: 2,
                  marginRight: 4,
                }}
              />
              Expenses ($K)
            </span>
          </div>
        </Card>
        <Card
          title={
            <>
              <Wallet size={13} /> Cash Position
            </>
          }
        >
          <Gauge
            value={Math.max(0, Math.min(100, margin + 50))}
            max={100}
            label={margin >= 20 ? "Healthy" : margin >= 10 ? "Stable" : "Tight"}
            unit="%"
          />
          <div
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              textAlign: "center",
              marginTop: 4,
            }}
          >
            Posted:{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {postedCount}
            </strong>{" "}
            · Draft:{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {draftCount}
            </strong>
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
        <Card title="Journal Entries by Status">
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
                statusDonut.length
                  ? statusDonut
                  : [{ label: "None", value: 1, color: "#94A3B8" }]
              }
              centerValue={journal.length.toString()}
              centerLabel="Entries"
            />
            <Legend
              items={statusDonut.map((s) => ({
                label: s.label,
                value: s.value,
                color: s.color,
              }))}
            />
          </div>
        </Card>
        <Card title="Top Journal Entries ($K)">
          {topEntries.length === 0 ? (
            <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              No entries yet.
            </p>
          ) : (
            <Treemap items={topEntries} />
          )}
        </Card>
        <Card title="Expense Categories (%)">
          <Treemap items={expenseCategories} />
        </Card>
      </div>

      {accountsBars.length > 0 && (
        <Card title="Top Accounts by Activity ($K)">
          <BarChart bars={accountsBars} horizontal width={520} />
        </Card>
      )}
    </div>
  );
}
