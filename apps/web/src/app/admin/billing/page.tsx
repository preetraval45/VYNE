"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────
type Plan = "Starter" | "Growth" | "Enterprise";
type PaymentStatus = "Paid" | "Due" | "Failed";

interface PlanTier {
  readonly plan: Plan;
  readonly tenants: number;
  readonly totalMrr: number;
  readonly color: string;
}

interface Renewal {
  readonly tenant: string;
  readonly plan: Plan;
  readonly amount: number;
  readonly date: string;
  readonly daysUntil: number;
}

interface FailedPayment {
  readonly tenant: string;
  readonly amount: number;
  readonly date: string;
  readonly reason: string;
  readonly retryCount: number;
}

interface RevenueMonth {
  readonly month: string;
  readonly starter: number;
  readonly growth: number;
  readonly enterprise: number;
  readonly total: number;
}

// ─── Mock Data ────────────────────────────────────────────────────
const PLAN_TIERS: PlanTier[] = [
  { plan: "Starter", tenants: 2, totalMrr: 198, color: "#3B82F6" },
  { plan: "Growth", tenants: 2, totalMrr: 1320, color: "#22C55E" },
  { plan: "Enterprise", tenants: 2, totalMrr: 5600, color: "var(--vyne-accent, #06B6D4)" },
];

const RENEWALS: Renewal[] = [
  {
    tenant: "Acme Manufacturing",
    plan: "Enterprise",
    amount: 2400,
    date: "Apr 1, 2026",
    daysUntil: 11,
  },
  {
    tenant: "TechStart Inc",
    plan: "Growth",
    amount: 480,
    date: "Apr 5, 2026",
    daysUntil: 15,
  },
  {
    tenant: "Global Retail Ltd",
    plan: "Growth",
    amount: 840,
    date: "Apr 8, 2026",
    daysUntil: 18,
  },
  {
    tenant: "DataFlow Analytics",
    plan: "Starter",
    amount: 99,
    date: "Apr 8, 2026",
    daysUntil: 18,
  },
  {
    tenant: "RetailPlus Corp",
    plan: "Enterprise",
    amount: 3200,
    date: "Apr 12, 2026",
    daysUntil: 22,
  },
  {
    tenant: "NovaTech Solutions",
    plan: "Starter",
    amount: 99,
    date: "Apr 15, 2026",
    daysUntil: 25,
  },
];

const FAILED_PAYMENTS: FailedPayment[] = [
  {
    tenant: "NovaTech Solutions",
    amount: 99,
    date: "Mar 8, 2026",
    reason: "Card declined - insufficient funds",
    retryCount: 3,
  },
  {
    tenant: "DataFlow Analytics",
    amount: 99,
    date: "Mar 3, 2026",
    reason: "Card expired",
    retryCount: 1,
  },
];

const REVENUE_TREND: RevenueMonth[] = [
  { month: "Oct", starter: 198, growth: 960, enterprise: 3600, total: 4758 },
  { month: "Nov", starter: 198, growth: 1080, enterprise: 3900, total: 5178 },
  { month: "Dec", starter: 198, growth: 1200, enterprise: 4500, total: 5898 },
  { month: "Jan", starter: 198, growth: 1320, enterprise: 4900, total: 6418 },
  { month: "Feb", starter: 198, growth: 1320, enterprise: 5300, total: 6818 },
  { month: "Mar", starter: 198, growth: 1320, enterprise: 5600, total: 7118 },
];

// ─── Helpers ──────────────────────────────────────────────────────
function planColor(plan: Plan): { bg: string; color: string } {
  if (plan === "Starter")
    return { bg: "rgba(59,130,246,0.12)", color: "#60A5FA" };
  if (plan === "Growth")
    return { bg: "rgba(34,197,94,0.12)", color: "#4ADE80" };
  return { bg: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.12)", color: "#67E8F9" };
}

// ─── KPI Card ─────────────────────────────────────────────────────
function BillingKPI({
  label,
  value,
  sub,
  accent,
}: Readonly<{
  label: string;
  value: string;
  sub: string;
  accent: string;
}>) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#13131F",
        border: `1px solid ${hovered ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.3)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 14,
        padding: "20px 22px",
        transition: "all 0.2s",
        transform: hovered ? "translateY(-2px)" : "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: accent,
            boxShadow: `0 0 8px ${accent}40`,
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#6060A0",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "#E8E8F8",
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: "#6060A0", marginTop: 6 }}>{sub}</div>
    </div>
  );
}

// ─── Revenue Trend Stacked Bar Chart ──────────────────────────────
function RevenueTrendChart({
  data,
}: Readonly<{ data: readonly RevenueMonth[] }>) {
  const max = Math.max(...data.map((d) => d.total));
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div
      style={{
        background: "#13131F",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: "22px 24px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#E8E8F8" }}>
            Revenue Trend
          </div>
          <div style={{ fontSize: 11, color: "#6060A0", marginTop: 2 }}>
            Stacked by plan tier (last 6 months)
          </div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {[
            { label: "Enterprise", color: "var(--vyne-accent, #06B6D4)" },
            { label: "Growth", color: "#22C55E" },
            { label: "Starter", color: "#3B82F6" },
          ].map((l) => (
            <div
              key={l.label}
              style={{ display: "flex", alignItems: "center", gap: 5 }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: l.color,
                }}
              />
              <span style={{ fontSize: 10, color: "#6060A0" }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 12,
          height: 180,
          padding: "0 4px",
        }}
      >
        {data.map((d, i) => {
          const isHovered = hoveredIdx === i;
          const starterH = (d.starter / max) * 160;
          const growthH = (d.growth / max) * 160;
          const enterpriseH = (d.enterprise / max) * 160;

          return (
            <div
              key={d.month}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                cursor: "default",
              }}
              role="group"
              aria-label={`${d.month}: $${d.total.toLocaleString()}`}
            >
              {isHovered && (
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#E8E8F8",
                    background: "#252538",
                    padding: "3px 8px",
                    borderRadius: 6,
                    whiteSpace: "nowrap",
                  }}
                >
                  ${d.total.toLocaleString()}
                </div>
              )}
              <div
                style={{
                  width: "100%",
                  maxWidth: 48,
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: "8px 8px 4px 4px",
                  overflow: "hidden",
                  transition: "transform 0.2s",
                  transform: isHovered ? "scaleY(1.02)" : "none",
                  transformOrigin: "bottom",
                }}
              >
                <div
                  style={{
                    height: enterpriseH,
                    background: "var(--vyne-accent, #06B6D4)",
                    transition: "height 0.3s",
                  }}
                />
                <div
                  style={{
                    height: growthH,
                    background: "#22C55E",
                    transition: "height 0.3s",
                  }}
                />
                <div
                  style={{
                    height: starterH,
                    background: "#3B82F6",
                    transition: "height 0.3s",
                  }}
                />
              </div>
              <span style={{ fontSize: 10, color: "#6060A0" }}>{d.month}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Billing Page ────────────────────────────────────────────
export default function BillingPage() {
  const totalMrr = PLAN_TIERS.reduce((s, t) => s + t.totalMrr, 0);
  const totalTenants = PLAN_TIERS.reduce((s, t) => s + t.tenants, 0);
  const arr = totalMrr * 12;
  const arpa = Math.round(totalMrr / totalTenants);
  const maxTierMrr = Math.max(...PLAN_TIERS.map((t) => t.totalMrr));

  const [retryToast, setRetryToast] = useState<string | null>(null);

  function handleRetry(tenant: string) {
    setRetryToast(`Retrying payment for ${tenant}...`);
    setTimeout(() => setRetryToast(null), 2500);
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#E8E8F8",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Revenue &amp; Billing
        </h1>
        <p style={{ fontSize: 13, color: "#6060A0", margin: "4px 0 0" }}>
          Financial overview and payment management
        </p>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <BillingKPI
          label="Total MRR"
          value={`$${totalMrr.toLocaleString()}`}
          sub="monthly recurring revenue"
          accent="var(--vyne-accent, #06B6D4)"
        />
        <BillingKPI
          label="ARR"
          value={`$${arr.toLocaleString()}`}
          sub="annualized run rate"
          accent="#22C55E"
        />
        <BillingKPI
          label="ARPA"
          value={`$${arpa.toLocaleString()}`}
          sub="avg revenue per account"
          accent="#3B82F6"
        />
        <BillingKPI
          label="Failed Payments"
          value={String(FAILED_PAYMENTS.length)}
          sub={`$${FAILED_PAYMENTS.reduce((s, p) => s + p.amount, 0)} at risk`}
          accent="#EF4444"
        />
      </div>

      {/* MRR Breakdown by Plan */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "340px 1fr",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: "#13131F",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: "22px 24px",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#E8E8F8",
              marginBottom: 20,
            }}
          >
            MRR by Plan Tier
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {PLAN_TIERS.map((tier) => {
              const pct = ((tier.totalMrr / totalMrr) * 100).toFixed(0);
              return (
                <div key={tier.plan}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 2,
                          background: tier.color,
                        }}
                      />
                      <span style={{ fontSize: 12, color: "#C8C8E0" }}>
                        {tier.plan}
                      </span>
                      <span style={{ fontSize: 10, color: "#6060A0" }}>
                        ({tier.tenants} tenants)
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#E8E8F8",
                        }}
                      >
                        ${tier.totalMrr.toLocaleString()}
                      </span>
                      <span style={{ fontSize: 10, color: "#6060A0" }}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: "rgba(255,255,255,0.06)",
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${(tier.totalMrr / maxTierMrr) * 100}%`,
                        background: tier.color,
                        borderRadius: 4,
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 12, color: "#9090B0" }}>Total MRR</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--vyne-accent, #06B6D4)" }}>
                ${totalMrr.toLocaleString()}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#9090B0" }}>ARR</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--vyne-accent, #06B6D4)" }}>
                ${arr.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Revenue Trend Chart */}
        <RevenueTrendChart data={REVENUE_TREND} />
      </div>

      {/* Bottom row: Renewals + Failed Payments */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Upcoming Renewals */}
        <div
          style={{
            background: "#13131F",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: "#E8E8F8" }}>
              Upcoming Renewals
            </div>
            <div style={{ fontSize: 11, color: "#6060A0", marginTop: 2 }}>
              Next 30 days
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                {["Tenant", "Plan", "Amount", "Date", "Days"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 14px",
                      textAlign: "left",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#6060A0",
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RENEWALS.map((r) => {
                const pc = planColor(r.plan);
                return (
                  <tr
                    key={r.tenant}
                    style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <td
                      style={{
                        padding: "11px 14px",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#E8E8F8",
                      }}
                    >
                      {r.tenant}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 20,
                          fontSize: 10,
                          fontWeight: 600,
                          background: pc.bg,
                          color: pc.color,
                        }}
                      >
                        {r.plan}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "11px 14px",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#E8E8F8",
                      }}
                    >
                      ${r.amount.toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: "11px 14px",
                        fontSize: 11,
                        color: "#9090B0",
                      }}
                    >
                      {r.date}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 20,
                          background:
                            r.daysUntil <= 14
                              ? "rgba(245,158,11,0.12)"
                              : "rgba(255,255,255,0.06)",
                          color: r.daysUntil <= 14 ? "#FCD34D" : "#6060A0",
                        }}
                      >
                        {r.daysUntil}d
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Failed Payments */}
        <div
          style={{
            background: "#13131F",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#E8E8F8" }}>
                Failed Payments
              </div>
              <div style={{ fontSize: 11, color: "#6060A0", marginTop: 2 }}>
                Requires attention
              </div>
            </div>
            {FAILED_PAYMENTS.length > 0 && (
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  background: "rgba(239,68,68,0.12)",
                  color: "#F87171",
                }}
              >
                {FAILED_PAYMENTS.length} issues
              </span>
            )}
          </div>

          {FAILED_PAYMENTS.length === 0 ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "#6060A0",
                fontSize: 13,
              }}
            >
              No failed payments
            </div>
          ) : (
            <div>
              {FAILED_PAYMENTS.map((fp, idx) => (
                <div
                  key={fp.tenant}
                  style={{
                    padding: "14px 20px",
                    borderTop:
                      idx > 0 ? "1px solid rgba(255,255,255,0.05)" : undefined,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#E8E8F8",
                      }}
                    >
                      {fp.tenant}
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#F87171",
                      }}
                    >
                      ${fp.amount}
                    </span>
                  </div>
                  <div
                    style={{ fontSize: 11, color: "#9090B0", marginBottom: 4 }}
                  >
                    {fp.reason}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontSize: 10, color: "#6060A0" }}>
                      {fp.date} &middot; {fp.retryCount} retries
                    </span>
                    <button
                      onClick={() => handleRetry(fp.tenant)}
                      style={{
                        padding: "4px 12px",
                        borderRadius: 6,
                        border: "1px solid rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.3)",
                        background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.1)",
                        color: "#67E8F9",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {retryToast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "var(--vyne-accent, #06B6D4)",
            color: "#fff",
            padding: "10px 18px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 8px 24px rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.3)",
            zIndex: 400,
          }}
        >
          {retryToast}
        </div>
      )}
    </div>
  );
}
