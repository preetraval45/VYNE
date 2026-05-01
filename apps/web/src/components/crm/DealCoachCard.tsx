"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Sparkles, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { useCRMStore } from "@/lib/stores/crm";
import type { Deal } from "@/lib/fixtures/crm";
import { InlineEmptyState } from "@/components/shared/InlineEmptyState";

interface CoachInsight {
  deal: Deal;
  daysIdle: number;
  reason: string;
  suggestion: string;
}

const STALE_DAYS_BY_STAGE: Record<Deal["stage"], number> = {
  Lead: 14,
  Qualified: 10,
  Proposal: 9,
  Negotiation: 7,
  Won: 9999,
  Lost: 9999,
};

function buildInsights(deals: Deal[]): CoachInsight[] {
  const now = Date.now();
  const insights: CoachInsight[] = [];
  for (const d of deals) {
    if (d.stage === "Won" || d.stage === "Lost") continue;
    const daysIdle = Math.floor((now - new Date(d.lastActivity).getTime()) / 86400000);
    const threshold = STALE_DAYS_BY_STAGE[d.stage];
    if (daysIdle < threshold) continue;
    insights.push({
      deal: d,
      daysIdle,
      reason: `${daysIdle}d idle in ${d.stage} (median moves in ${threshold}d).`,
      suggestion:
        d.stage === "Negotiation"
          ? "Send a final-offer nudge with a deadline."
          : d.stage === "Proposal"
          ? "Follow up with social proof from a similar customer."
          : d.stage === "Qualified"
          ? "Book a discovery call this week."
          : "Re-engage with a personalized check-in.",
    });
  }
  return insights.sort((a, b) => b.deal.value * b.deal.probability - a.deal.value * a.deal.probability).slice(0, 3);
}

export function DealCoachCard() {
  const deals = useCRMStore((s) => s.deals);
  const insights = useMemo(() => buildInsights(deals), [deals]);

  // No active deals at all → don't render anything; the page-level empty state
  // already covers it. But if there ARE active deals and none are stalling,
  // surface a calm "all on track" placeholder so the AI card still earns its
  // pixels and reinforces the assistant pattern.
  const hasActiveDeals = deals.some((d) => d.stage !== "Won" && d.stage !== "Lost");
  if (!hasActiveDeals) return null;

  if (insights.length === 0) {
    return (
      <section
        aria-label="AI deal coach"
        style={{
          marginBottom: 16,
          borderRadius: 12,
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
        }}
      >
        <InlineEmptyState
          icon={<CheckCircle2 size={14} style={{ color: "#0F9D58" }} />}
          title="All deals on pace"
          body="No deals are stalling beyond their stage's median move time. The AI deal coach will flag risks here as soon as anything goes idle."
        />
      </section>
    );
  }

  const totalAtRisk = insights.reduce((s, i) => s + i.deal.value * (i.deal.probability / 100), 0);

  return (
    <section
      aria-label="AI deal coach"
      style={{
        marginBottom: 16,
        borderRadius: 12,
        background:
          "linear-gradient(135deg, rgba(108,71,255,0.08), rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.06))",
        border: "1px solid rgba(108,71,255,0.18)",
        padding: 14,
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
              background: "rgba(108,71,255,0.16)",
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
              AI deal coach
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
              {insights.length} deal{insights.length === 1 ? "" : "s"} stalling · ~$
              {Math.round(totalAtRisk).toLocaleString()} weighted at risk
            </div>
          </div>
        </div>
      </header>

      <ul style={{ display: "flex", flexDirection: "column", gap: 8, listStyle: "none", padding: 0, margin: 0 }}>
        {insights.map((i) => (
          <li
            key={i.deal.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 9,
              background: "var(--content-bg)",
              border: "1px solid var(--content-border)",
            }}
          >
            <AlertTriangle
              size={14}
              style={{ color: "#C2410C", flexShrink: 0, marginTop: 2 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span>{i.deal.company}</span>
                <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 500 }}>
                  ${i.deal.value.toLocaleString()} · {i.deal.stage} · {i.deal.probability}%
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 3 }}>
                {i.reason}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                <span style={{ fontWeight: 600 }}>Suggested:</span> {i.suggestion}
              </div>
            </div>
            <Link
              href={`/ai?prompt=${encodeURIComponent(
                `Draft a personalized re-engagement email for ${i.deal.company} (deal in ${i.deal.stage}, idle ${i.daysIdle}d). Suggest the next move.`,
              )}`}
              style={{
                alignSelf: "center",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "5px 10px",
                borderRadius: 6,
                fontSize: 11.5,
                fontWeight: 600,
                color: "#fff",
                background: "var(--vyne-accent, var(--vyne-purple))",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Draft outreach <ArrowRight size={11} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
