"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Clock, CheckCircle2 } from "lucide-react";
import { useInvoicingStore } from "@/lib/stores/invoicing";
import type { Invoice } from "@/lib/stores/invoicing";
import { InlineEmptyState } from "@/components/shared/InlineEmptyState";

type DunningStage = "friendly" | "firm" | "final" | "collections";

const STAGE_META: Record<
  DunningStage,
  { label: string; tone: string; bg: string; tone2: string }
> = {
  friendly: { label: "Friendly", tone: "#1E40AF", bg: "rgba(37,99,235,0.08)", tone2: "rgba(37,99,235,0.18)" },
  firm: { label: "Firm", tone: "#C2410C", bg: "rgba(217,119,6,0.08)", tone2: "rgba(217,119,6,0.20)" },
  final: { label: "Final notice", tone: "#B91C1C", bg: "rgba(220,38,38,0.08)", tone2: "rgba(220,38,38,0.20)" },
  collections: { label: "Collections", tone: "#7F1D1D", bg: "rgba(127,29,29,0.10)", tone2: "rgba(127,29,29,0.22)" },
};

function stageFor(daysOverdue: number): DunningStage {
  if (daysOverdue >= 60) return "collections";
  if (daysOverdue >= 30) return "final";
  if (daysOverdue >= 14) return "firm";
  return "friendly";
}

function templateFor(stage: DunningStage, customer: string, invoiceNumber: string, amount: number, daysOverdue: number): string {
  const amountStr = `$${amount.toLocaleString()}`;
  switch (stage) {
    case "friendly":
      return `Hi ${customer.split(" ")[0]} — quick reminder that invoice ${invoiceNumber} (${amountStr}) was due ${daysOverdue}d ago. If it's already on its way, ignore this; otherwise the portal link is at the bottom. Thanks!`;
    case "firm":
      return `Hello ${customer.split(" ")[0]}, invoice ${invoiceNumber} is now ${daysOverdue}d overdue (${amountStr}). Please confirm payment status this week. Happy to set up a payment plan if helpful.`;
    case "final":
      return `${customer.split(" ")[0]}, this is a final notice on ${invoiceNumber} (${amountStr}, ${daysOverdue}d overdue). If we don't see payment or hear from you in 5 business days we'll pause services and escalate to collections. Please reply today.`;
    case "collections":
      return `${customer}, ${invoiceNumber} (${amountStr}) is ${daysOverdue}d overdue. Per our terms this account is being referred to collections unless paid in full within 48 hours. Reply if there's a dispute we should resolve first.`;
  }
}

export function DunningLadderCard() {
  const invoices = useInvoicingStore((s) => s.invoices);

  const overdueRows = useMemo(() => {
    const now = Date.now();
    const overdue: Array<{
      invoice: Invoice;
      daysOverdue: number;
      stage: DunningStage;
    }> = [];
    for (const inv of invoices) {
      if (inv.status === "Paid" || inv.status === "Cancelled" || inv.status === "Draft") continue;
      const due = new Date(inv.dueDate).getTime();
      if (Number.isNaN(due) || due >= now) continue;
      const days = Math.floor((now - due) / 86400000);
      overdue.push({ invoice: inv, daysOverdue: days, stage: stageFor(days) });
    }
    return overdue.sort((a, b) => b.daysOverdue - a.daysOverdue).slice(0, 4);
  }, [invoices]);

  if (overdueRows.length === 0) {
    // Only render the empty state when there ARE invoices in the system, so
    // brand-new workspaces don't see two stacked empty states (this + InvoicesTab).
    if (invoices.length === 0) return null;
    return (
      <section
        aria-label="AI dunning ladder"
        style={{
          marginBottom: 14,
          borderRadius: 12,
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
        }}
      >
        <InlineEmptyState
          icon={<CheckCircle2 size={14} style={{ color: "#0F9D58" }} />}
          title="No overdue invoices"
          body="Everything is current. The dunning ladder will draft escalating reminders here as soon as anything ages past its due date."
        />
      </section>
    );
  }

  const totalOverdue = overdueRows.reduce((s, r) => s + r.invoice.amount, 0);

  return (
    <section
      aria-label="AI dunning ladder"
      style={{
        marginBottom: 14,
        padding: 14,
        borderRadius: 12,
        background:
          "linear-gradient(135deg, rgba(108,71,255,0.07), rgba(220,38,38,0.05))",
        border: "1px solid rgba(108,71,255,0.16)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "rgba(108,71,255,0.14)",
              color: "var(--vyne-accent, var(--vyne-purple))",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={15} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
              AI dunning ladder
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "var(--vyne-accent, var(--vyne-purple))",
                }}
              >
                AI
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 2 }}>
              {overdueRows.length} overdue invoice{overdueRows.length === 1 ? "" : "s"} ·{" "}
              ${totalOverdue.toLocaleString()} at risk · escalation drafted automatically
            </div>
          </div>
        </div>
      </header>

      <ul style={{ display: "flex", flexDirection: "column", gap: 8, listStyle: "none", padding: 0, margin: 0 }}>
        {overdueRows.map(({ invoice, daysOverdue, stage }) => {
          const meta = STAGE_META[stage];
          const draft = templateFor(stage, invoice.customer, invoice.number, invoice.amount, daysOverdue);
          return (
            <li
              key={invoice.id}
              style={{
                padding: "10px 12px",
                borderRadius: 9,
                background: "var(--content-bg)",
                border: "1px solid var(--content-border)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: 6,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                    {invoice.customer}
                  </span>
                  <span style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>
                    {invoice.number} · ${invoice.amount.toLocaleString()}
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "2px 7px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      background: meta.bg,
                      color: meta.tone,
                      border: `1px solid ${meta.tone2}`,
                    }}
                  >
                    {meta.label}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Clock size={10} /> {daysOverdue}d overdue
                  </span>
                </div>
                <Link
                  href={`/ai?prompt=${encodeURIComponent(
                    `Refine this dunning email for ${invoice.customer} (invoice ${invoice.number}, ${daysOverdue}d overdue, $${invoice.amount}): ${draft}`,
                  )}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 9px",
                    borderRadius: 6,
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: "#fff",
                    background: "var(--vyne-accent, var(--vyne-purple))",
                    textDecoration: "none",
                  }}
                >
                  Refine + send <ArrowRight size={11} />
                </Link>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                  background: "var(--content-secondary)",
                  padding: "8px 10px",
                  borderRadius: 7,
                  fontFamily: "var(--font-sans, system-ui)",
                }}
              >
                {draft}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
