"use client";

import { useMemo } from "react";
import {
  Receipt,
  AlertCircle,
  CheckCircle2,
  Users,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { useInvoicingStore } from "@/lib/stores/invoicing";
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
  Gauge,
  Histogram,
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

// PH-F typecheck fix — Invoice.status is PascalCase ("Draft" | "Sent" |
// "Paid" | "Overdue" | "Cancelled"); the dashboard's enum must match.
const INVOICE_STAGE_ORDER = ["Draft", "Sent", "Paid", "Overdue"] as const;
const INVOICE_COLORS: Record<string, string> = {
  Draft: "#94A3B8",
  Sent: "#06B6D4",
  Paid: "#22C55E",
  Overdue: "#EF4444",
  Cancelled: "#A1A1AA",
};

export function InvoicingDashboardView() {
  const invoices = useInvoicingStore((s) => s.invoices);
  const customers = useInvoicingStore((s) => s.customers);
  const payments = useInvoicingStore((s) => s.payments);
  const bills = useInvoicingStore((s) => s.bills);

  const {
    byStatus,
    valueByStatus,
    outstandingTotal,
    paidTotal,
    overdueTotal,
    overdueCount,
    paidCount,
    customerOutstandingMap,
  } = useMemo(() => {
    const byStatus = countBy(invoices, (i) => i.status);
    const valueByStatus = sumBy(
      invoices,
      (i) => i.status,
      (i) => i.amount,
    );
    const outstandingTotal = customers.reduce(
      (s, c) => s + c.outstandingBalance,
      0,
    );
    const paidTotal = valueByStatus.get("Paid") ?? 0;
    const overdueTotal = valueByStatus.get("Overdue") ?? 0;
    const overdueCount = byStatus.get("Overdue") ?? 0;
    const paidCount = byStatus.get("Paid") ?? 0;
    const customerOutstandingMap = sumBy(
      invoices,
      (i) => i.customer,
      (i) => (i.status === "Paid" ? 0 : i.amount),
    );
    return {
      byStatus,
      valueByStatus,
      outstandingTotal,
      paidTotal,
      overdueTotal,
      overdueCount,
      paidCount,
      customerOutstandingMap,
    };
  }, [invoices, customers]);

  const totalRevenue = customers.reduce((s, c) => s + c.totalRevenue, 0);
  const collectionRate =
    paidTotal + overdueTotal > 0
      ? Math.round((paidTotal / (paidTotal + overdueTotal)) * 100)
      : 0;

  const kpis = [
    {
      label: "Revenue (paid)",
      value: fmtMoney(paidTotal),
      delta: "+12%",
      positive: true,
      icon: <CheckCircle2 size={16} />,
      accent: "#22C55E",
      sparkline: syntheticMonthly(paidTotal / 12 || 5000, 14, 0.05),
    },
    {
      label: "Outstanding",
      value: fmtMoney(outstandingTotal),
      delta: overdueCount > 0 ? `${overdueCount} overdue` : "current",
      positive: overdueCount === 0,
      icon: <AlertCircle size={16} />,
      accent: "#F59E0B",
      sparkline: syntheticMonthly(outstandingTotal / 12 || 3000, 14, 0.03),
    },
    {
      label: "Invoices Issued",
      value: invoices.length.toString(),
      delta: `${paidCount} paid`,
      positive: true,
      icon: <Receipt size={16} />,
      accent: "#06B6D4",
      sparkline: [4, 6, 5, 8, 7, 9, 10, 11, 9, 12, 13, 14, invoices.length],
    },
    {
      label: "Collection Rate",
      value: `${collectionRate}%`,
      delta: collectionRate >= 80 ? "healthy" : "watch",
      positive: collectionRate >= 80,
      icon: <TrendingUp size={16} />,
      accent: "#6C47FF",
      sparkline: [
        70,
        72,
        75,
        78,
        80,
        82,
        81,
        79,
        82,
        85,
        84,
        86,
        collectionRate,
      ],
    },
  ];

  const funnelStages = INVOICE_STAGE_ORDER.map((s) => ({
    label: s[0].toUpperCase() + s.slice(1),
    value: byStatus.get(s) ?? 0,
    color: INVOICE_COLORS[s],
  })).filter((s) => s.value > 0);

  const statusDonut = Array.from(byStatus.entries()).map(
    ([label, value], i) => ({
      label: label[0].toUpperCase() + label.slice(1),
      value,
      color: INVOICE_COLORS[label] ?? CHART_COLORS[i % CHART_COLORS.length],
    }),
  );

  const topCustomers = topN(customers, 8, (c) => c.totalRevenue).map(
    (c, i) => ({
      label: c.name,
      value: Math.round(c.totalRevenue / 1000),
      color: CHART_COLORS[i % CHART_COLORS.length],
    }),
  );

  const outstandingBars = Array.from(customerOutstandingMap.entries())
    .map(([label, value]) => ({ label, value: Math.round(value / 1000) }))
    .filter((b) => b.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Aging histogram: bucket overdue invoices by days-late
  const agingBuckets = ["0-30d", "31-60d", "61-90d", "90+d"];
  const today = Date.now();
  const overduePerBucket = [0, 0, 0, 0];
  const paidPerBucket = [0, 0, 0, 0];
  for (const inv of invoices) {
    const due = new Date(inv.dueDate).getTime();
    if (Number.isNaN(due)) continue;
    const ageDays = Math.floor((today - due) / 86400000);
    const bi = ageDays < 31 ? 0 : ageDays < 61 ? 1 : ageDays < 91 ? 2 : 3;
    if (inv.status === "Overdue") overduePerBucket[bi] += 1;
    else if (inv.status === "Paid") paidPerBucket[bi] += 1;
  }

  const revenueTrend = syntheticMonthly(paidTotal / 12 || 5000, 12, 0.05);
  const billsTrend = syntheticMonthly(
    bills.reduce((s, b) => s + b.amount, 0) / 12 || 3000,
    12,
    0.03,
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
        greeting={`${greetingFor()} — billing pulse`}
        metrics={[
          { label: "Outstanding", value: fmtMoney(outstandingTotal) },
          { label: "Paid YTD", value: fmtMoney(paidTotal) },
          { label: "Customers", value: customers.length },
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
              <Calendar size={13} /> Revenue vs Bills (12 months, $K)
            </>
          }
        >
          <AreaChart
            series={[
              {
                color: "#22C55E",
                values: revenueTrend.map((v) => Math.round(v / 1000)),
              },
              {
                color: "#F59E0B",
                values: billsTrend.map((v) => Math.round(v / 1000)),
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
              Revenue
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
              Bills
            </span>
          </div>
        </Card>
        <Card title="Collection Health">
          <Gauge
            value={collectionRate}
            max={100}
            label={
              collectionRate >= 80
                ? "Healthy"
                : collectionRate >= 60
                  ? "Watch"
                  : "Critical"
            }
            unit="%"
          />
          <div
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              textAlign: "center",
            }}
          >
            Payments received: <strong>{payments.length}</strong>
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
        <Card title="Invoice Funnel">
          {funnelStages.length === 0 ? (
            <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              No invoices yet.
            </p>
          ) : (
            <FunnelChart stages={funnelStages} />
          )}
        </Card>
        <Card title="Invoice Status">
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
              centerValue={invoices.length.toString()}
              centerLabel="Invoices"
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
        <Card title="Top Customers (revenue, $K)">
          {topCustomers.length === 0 ? (
            <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              No customers yet.
            </p>
          ) : (
            <Treemap items={topCustomers} />
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
        <Card title="AR Aging (overdue vs paid per bucket)">
          <Histogram
            buckets={agingBuckets}
            series={[
              { color: "#EF4444", values: overduePerBucket, label: "Overdue" },
              { color: "#22C55E", values: paidPerBucket, label: "Paid" },
            ]}
          />
          <div style={{ display: "flex", gap: 10, fontSize: 10 }}>
            <span style={{ color: "var(--text-secondary)" }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  background: "#EF4444",
                  display: "inline-block",
                  borderRadius: 2,
                  marginRight: 4,
                }}
              />
              Overdue
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
              Paid
            </span>
          </div>
        </Card>
        <Card
          title={
            <>
              <Users size={13} /> Top Outstanding ($K)
            </>
          }
        >
          {outstandingBars.length === 0 ? (
            <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              None outstanding.
            </p>
          ) : (
            <BarChart bars={outstandingBars} horizontal width={300} />
          )}
        </Card>
      </div>
    </div>
  );
}
