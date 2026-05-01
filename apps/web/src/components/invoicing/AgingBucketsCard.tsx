"use client";

import { useMemo } from "react";
import { useInvoicingStore } from "@/lib/stores/invoicing";

const BUCKETS = [
  { id: "current", label: "Current", maxDays: 0, color: "#0F9D58" },
  { id: "0_30", label: "0–30 d", maxDays: 30, color: "#1E40AF" },
  { id: "31_60", label: "31–60 d", maxDays: 60, color: "#C2410C" },
  { id: "61_90", label: "61–90 d", maxDays: 90, color: "#B91C1C" },
  { id: "over_90", label: "90+ d", maxDays: Infinity, color: "#7F1D1D" },
] as const;

export function AgingBucketsCard() {
  const invoices = useInvoicingStore((s) => s.invoices);

  const tally = useMemo(() => {
    const rows = BUCKETS.map((b) => ({ ...b, count: 0, total: 0 }));
    const now = Date.now();
    for (const inv of invoices) {
      if (inv.status === "Paid" || inv.status === "Cancelled" || inv.status === "Draft") continue;
      const due = new Date(inv.dueDate).getTime();
      if (Number.isNaN(due)) continue;
      const days = Math.floor((now - due) / 86400000);
      if (days < 0) {
        rows[0].count += 1;
        rows[0].total += inv.amount;
        continue;
      }
      // Find first bucket whose maxDays >= days, skipping the "Current" row.
      const target = rows.slice(1).find((b) => days <= b.maxDays);
      if (target) {
        target.count += 1;
        target.total += inv.amount;
      }
    }
    return rows;
  }, [invoices]);

  const totalAmt = tally.reduce((s, r) => s + r.total, 0);
  if (totalAmt === 0 && tally.every((r) => r.count === 0)) return null;

  return (
    <section
      aria-label="Aging buckets"
      style={{
        marginBottom: 14,
        padding: 14,
        borderRadius: 12,
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
            Aging buckets
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 2 }}>
            ${totalAmt.toLocaleString()} across all open invoices
          </div>
        </div>
      </header>

      {/* Stacked bar */}
      <div
        role="img"
        aria-label="Aging buckets stacked bar"
        style={{
          display: "flex",
          width: "100%",
          height: 18,
          borderRadius: 6,
          overflow: "hidden",
          background: "var(--content-secondary)",
          border: "1px solid var(--content-border)",
          marginBottom: 12,
        }}
      >
        {tally.map((r) => {
          const pct = totalAmt > 0 ? (r.total / totalAmt) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={r.id}
              style={{
                width: `${pct}%`,
                background: r.color,
                transition: "width 0.4s ease-out",
              }}
              title={`${r.label}: $${r.total.toLocaleString()} (${pct.toFixed(0)}%)`}
            />
          );
        })}
      </div>

      {/* Bucket tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 8,
        }}
      >
        {tally.map((r) => {
          const pct = totalAmt > 0 ? Math.round((r.total / totalAmt) * 100) : 0;
          return (
            <div
              key={r.id}
              style={{
                padding: "10px 12px",
                borderRadius: 9,
                background: "var(--content-secondary)",
                border: "1px solid var(--content-border)",
                position: "relative",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: 8,
                  top: 8,
                  bottom: 8,
                  width: 3,
                  borderRadius: 2,
                  background: r.color,
                }}
              />
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: r.color,
                  paddingLeft: 10,
                }}
              >
                {r.label}
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  paddingLeft: 10,
                  marginTop: 2,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                ${r.total.toLocaleString()}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  paddingLeft: 10,
                  marginTop: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {r.count} invoice{r.count === 1 ? "" : "s"} · {pct}%
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
