"use client";

import { useInvoicingStore } from "@/lib/stores/invoicing";
import { Sparkline } from "@/components/code/Sparkline";

// 30-day cash-in chart from Paid invoices. Date is grouped by ISO day.
// Renders inside a card with a big aggregate total + the sparkline.

export function CashFlowSparkline() {
  const invoices = useInvoicingStore((s) => s.invoices);
  const now = Date.now();
  const days = 30;
  const series = Array.from({ length: days }, () => 0);
  let total30 = 0;
  for (const inv of invoices) {
    if (inv.status !== "Paid") continue;
    const ts = new Date(inv.date).getTime();
    if (!Number.isFinite(ts)) continue;
    const ageDays = Math.floor((now - ts) / 86400000);
    if (ageDays >= 0 && ageDays < days) {
      series[days - 1 - ageDays] += inv.amount;
      total30 += inv.amount;
    }
  }
  return (
    <section
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
          Cash flow · last 30 days
        </h3>
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "var(--text-primary)",
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.01em",
          }}
        >
          ${total30.toLocaleString()}
        </span>
      </div>
      {total30 === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)" }}>
          No paid invoices in the last 30 days.
        </p>
      ) : (
        <span style={{ color: "var(--vyne-accent, #5B5BD6)", display: "inline-block" }}>
          <Sparkline values={series} width={280} height={36} ariaLabel="30-day cash-in" />
        </span>
      )}
    </section>
  );
}
