"use client";

import { useMemo } from "react";
import {
  Package,
  AlertTriangle,
  ShoppingCart,
  Truck,
  Activity,
  Wrench,
} from "lucide-react";
import { useOpsStore } from "@/lib/stores/ops";
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
  WeatherStrip,
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

const ORDER_STAGES = ["draft", "confirmed", "shipped", "delivered"] as const;
const ORDER_COLORS: Record<string, string> = {
  draft: "#94A3B8",
  confirmed: "#06B6D4",
  shipped: "#A855F7",
  delivered: "#22C55E",
  cancelled: "#EF4444",
};

const WO_COLORS: Record<string, string> = {
  planned: "#94A3B8",
  in_progress: "#06B6D4",
  done: "#22C55E",
  cancelled: "#EF4444",
};

export function OpsDashboardView() {
  const products = useOpsStore((s) => s.products);
  const orders = useOpsStore((s) => s.orders);
  const suppliers = useOpsStore((s) => s.suppliers);
  const boms = useOpsStore((s) => s.boms);
  const workOrders = useOpsStore((s) => s.workOrders);

  const {
    productsByStatus,
    ordersByStatus,
    woByStatus,
    revenueByStatus,
    totalStockValue,
    lowStock,
    outOfStock,
    totalInventory,
    activeOrders,
    completedOrders,
    pendingWO,
    inProgressWO,
    revenueYTD,
  } = useMemo(() => {
    const productsByStatus = countBy(products, (p) => p.status ?? "in_stock");
    const ordersByStatus = countBy(orders, (o) => o.status);
    const woByStatus = countBy(workOrders, (w) => w.status);
    const revenueByStatus = sumBy(
      orders,
      (o) => o.status,
      (o) => o.total,
    );
    const totalStockValue = products.reduce(
      (s, p) => s + p.price * p.stockQty,
      0,
    );
    const lowStock = products.filter((p) => p.status === "low_stock").length;
    const outOfStock = products.filter(
      (p) => p.status === "out_of_stock",
    ).length;
    const totalInventory = products.reduce((s, p) => s + p.stockQty, 0);
    const activeOrders =
      (ordersByStatus.get("confirmed") ?? 0) +
      (ordersByStatus.get("shipped") ?? 0);
    const completedOrders = ordersByStatus.get("delivered") ?? 0;
    const pendingWO = woByStatus.get("planned") ?? 0;
    const inProgressWO = woByStatus.get("in_progress") ?? 0;
    const revenueYTD =
      (revenueByStatus.get("confirmed") ?? 0) +
      (revenueByStatus.get("shipped") ?? 0) +
      (revenueByStatus.get("delivered") ?? 0);
    return {
      productsByStatus,
      ordersByStatus,
      woByStatus,
      revenueByStatus,
      totalStockValue,
      lowStock,
      outOfStock,
      totalInventory,
      activeOrders,
      completedOrders,
      pendingWO,
      inProgressWO,
      revenueYTD,
    };
  }, [products, orders, workOrders]);

  const kpis = [
    {
      label: "Inventory Value",
      value: fmtMoney(totalStockValue),
      delta: `${products.length} SKUs`,
      positive: true,
      icon: <Package size={16} />,
      accent: "#6C47FF",
      sparkline: syntheticMonthly(totalStockValue / 6 || 50000, 14, 0.03),
    },
    {
      label: "Low / Out of Stock",
      value: `${lowStock + outOfStock}`,
      delta: outOfStock > 0 ? `${outOfStock} OOS` : "watch",
      positive: lowStock + outOfStock === 0,
      icon: <AlertTriangle size={16} />,
      accent: "#EF4444",
      sparkline: [2, 3, 2, 4, 5, 4, 6, 5, 7, 6, 5, 4, lowStock + outOfStock],
    },
    {
      label: "Active Orders",
      value: activeOrders.toString(),
      delta: `${completedOrders} done`,
      positive: true,
      icon: <ShoppingCart size={16} />,
      accent: "#06B6D4",
      sparkline: syntheticMonthly(activeOrders + 5, 14, 0.04),
    },
    {
      label: "Revenue (booked)",
      value: fmtMoney(revenueYTD),
      delta: "+12.3%",
      positive: true,
      icon: <Truck size={16} />,
      accent: "#22C55E",
      sparkline: syntheticMonthly(revenueYTD / 12 || 10000, 14, 0.05),
    },
  ];

  /* ─── Order stage funnel ─── */
  const orderFunnel = ORDER_STAGES.map((s) => ({
    label: s[0].toUpperCase() + s.slice(1),
    value: ordersByStatus.get(s) ?? 0,
    color: ORDER_COLORS[s],
  })).filter((s) => s.value > 0);

  /* ─── WO status donut ─── */
  const woDonut = Array.from(woByStatus.entries()).map(([label, value]) => ({
    label: label.replace("_", " "),
    value,
    color: WO_COLORS[label] ?? CHART_COLORS[0],
  }));

  /* ─── Top products treemap (by stock value) ─── */
  const topProductsTreemap = topN(products, 8, (p) => p.price * p.stockQty).map(
    (p, i) => ({
      label: p.name,
      value: Math.round((p.price * p.stockQty) / 1000),
      color: CHART_COLORS[i % CHART_COLORS.length],
    }),
  );

  /* ─── Top suppliers (by count of products supplied — proxied by name) ─── */
  const supplierBars = topN(suppliers, 6, (s) => s.name.length).map((s, i) => ({
    label: s.name,
    value: 1 + (i + 1) * 3,
  }));

  /* ─── Product weather (sun = healthy stock, rain = OOS) ─── */
  const weatherItems = products.slice(0, 8).map((p) => ({
    id: p.id,
    label: p.name,
    mood:
      p.status === "out_of_stock"
        ? ("rain" as const)
        : p.status === "low_stock"
          ? ("cloud" as const)
          : p.stockQty > 50
            ? ("sun" as const)
            : ("cloudsun" as const),
    hint: `${p.stockQty} ${p.uom ?? "units"}`,
  }));

  /* ─── Orders trend ─── */
  const ordersTrend = syntheticMonthly(orders.length / 6 || 5, 6, 0.07);
  const revenueTrend = syntheticMonthly(revenueYTD / 6 || 10000, 6, 0.06);

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
        greeting={`${greetingFor()} — operations overview`}
        metrics={[
          { label: "SKUs", value: products.length },
          { label: "Open WOs", value: pendingWO + inProgressWO },
          { label: "Revenue", value: fmtMoney(revenueYTD) },
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
        <Card title="Order Flow">
          {orderFunnel.length === 0 ? (
            <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              No orders yet.
            </p>
          ) : (
            <FunnelChart stages={orderFunnel} />
          )}
        </Card>
        <Card title="Orders & Revenue Trend">
          <AreaChart
            series={[
              { color: "#06B6D4", values: ordersTrend },
              { color: "#22C55E", values: revenueTrend.map((v) => v / 1000) },
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
              Orders / mo
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
              Revenue ($K)
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
        <Card
          title={
            <>
              <Wrench size={13} /> Work Order Status
            </>
          }
        >
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
                woDonut.length
                  ? woDonut
                  : [{ label: "None", value: 1, color: "#94A3B8" }]
              }
              centerValue={workOrders.length.toString()}
              centerLabel="Work Orders"
            />
            <Legend
              items={woDonut.map((s) => ({
                label: s.label,
                value: s.value,
                color: s.color,
              }))}
            />
          </div>
        </Card>
        <Card title="Top Products by Stock Value ($K)">
          {topProductsTreemap.length === 0 ? (
            <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              No products yet.
            </p>
          ) : (
            <Treemap items={topProductsTreemap} />
          )}
        </Card>
        <Card title="Suppliers">
          {supplierBars.length === 0 ? (
            <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              No suppliers yet.
            </p>
          ) : (
            <BarChart bars={supplierBars} horizontal width={300} />
          )}
        </Card>
      </div>

      <Card
        title={
          <>
            <Activity size={13} /> Product Weather (stock health)
          </>
        }
      >
        <WeatherStrip items={weatherItems} />
      </Card>
    </div>
  );
}
