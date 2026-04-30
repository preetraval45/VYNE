"use client";

import { useInvoicingStore } from "@/lib/stores/invoicing";

// AR aging buckets unpaid invoices by days-past-due. Useful for any
// CFO who wants to know cash that's stuck. Reads useInvoicingStore so
// the bars update live as invoices are marked Paid.

const BUCKETS = [
  { label: "0–30", maxDays: 30 },
  { label: "31–60", maxDays: 60 },
  { label: "61–90", maxDays: 90 },
  { label: "90+", maxDays: Infinity },
];

export function ARAgingCard() {
  const invoices = useInvoicingStore((s) => s.invoices);
  const now = new Date();
  const unpaid = invoices.filter(
    (i) => i.status === "Sent" || i.status === "Overdue",
  );
  const tally = BUCKETS.map((b) => ({ ...b, total: 0 }));
  for (const inv of unpaid) {
    const due = new Date(inv.dueDate);
    if (Number.isNaN(due.getTime())) continue;
    const days = Math.floor((now.getTime() - due.getTime()) / 86400000);
    if (days < 0) continue; // not due yet
    const bucket = tally.find((b) => days <= b.maxDays);
    if (bucket) bucket.total += inv.amount;
  }
  const total = tally.reduce((s, b) => s + b.total, 0);

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
          Accounts receivable aging
        </h3>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          ${total.toLocaleString()} outstanding
        </span>
      </div>
      {total === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)" }}>
          All invoices paid on time. Nothing to age.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {tally.map((b) => {
            const pct = total > 0 ? Math.round((b.total / total) * 100) : 0;
            return (
              <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 56, fontSize: 11, color: "var(--text-secondary)" }}>{b.label} d</div>
                <div
                  style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 6,
                    background: "var(--content-secondary)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background:
                        b.maxDays === 30
                          ? "var(--vyne-accent, #5B5BD6)"
                          : b.maxDays === 60
                            ? "var(--status-warning, #d97706)"
                            : "var(--status-danger, #dc2626)",
                    }}
                  />
                </div>
                <div
                  style={{
                    width: 90,
                    textAlign: "right",
                    fontSize: 12,
                    fontVariantNumeric: "tabular-nums",
                    color: "var(--text-primary)",
                  }}
                >
                  ${b.total.toLocaleString()} · {pct}%
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
