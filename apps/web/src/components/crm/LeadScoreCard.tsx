"use client";

import { Flame } from "lucide-react";
import type { Deal } from "@/lib/fixtures/crm";
import { scoreDeal, tierColor } from "@/lib/crm/scoring";

/** Full lead-score card for the deal detail page — score gauge + tier + the
 *  reasons that drove it (the explainable "why this is hot" signal). */
export function LeadScoreCard({ deal }: { deal: Deal }) {
  const { score, tier, reasons } = scoreDeal(deal);
  const c = tierColor(tier);

  return (
    <section
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 14,
        padding: 24,
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* Score gauge */}
        <div
          style={{
            position: "relative",
            width: 64,
            height: 64,
            flexShrink: 0,
          }}
        >
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle
              cx="32"
              cy="32"
              r="27"
              fill="none"
              stroke="var(--content-border)"
              strokeWidth="6"
            />
            <circle
              cx="32"
              cy="32"
              r="27"
              fill="none"
              stroke={c.fg}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 27}
              strokeDashoffset={2 * Math.PI * 27 * (1 - score / 100)}
              transform="rotate(-90 32 32)"
            />
            <text
              x="32"
              y="33"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontSize: 18,
                fontWeight: 700,
                fill: "var(--text-primary)",
              }}
            >
              {score}
            </text>
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <h2
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              Lead score
            </h2>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 9px",
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: 700,
                color: c.fg,
                background: c.bg,
              }}
            >
              {tier === "hot" && <Flame size={11} />}
              {c.label}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            {reasons.map((r) => (
              <span
                key={r}
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  background: "var(--content-secondary)",
                  border: "1px solid var(--content-border)",
                  borderRadius: 6,
                  padding: "2px 8px",
                }}
              >
                {r}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Compact inline badge for pipeline cards / table rows. */
export function LeadScoreBadge({ deal }: { deal: Deal }) {
  const { score, tier } = scoreDeal(deal);
  const c = tierColor(tier);
  return (
    <span
      title={`Lead score ${score}/100 — ${c.label}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "1px 7px",
        borderRadius: 999,
        fontSize: 10.5,
        fontWeight: 700,
        color: c.fg,
        background: c.bg,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {tier === "hot" && <Flame size={10} />}
      {score}
    </span>
  );
}
