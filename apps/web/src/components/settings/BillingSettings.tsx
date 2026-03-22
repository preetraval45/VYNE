"use client";

import { useState } from "react";
import { CreditCard, Check, ArrowUpRight, Download } from "lucide-react";

// ─── Shared UI ───────────────────────────────────────────────────
function SectionCard({
  title,
  children,
  action,
}: Readonly<{
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}>) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 10,
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A2E" }}>
          {title}
        </span>
        {action}
      </div>
      <div style={{ padding: "16px 18px" }}>{children}</div>
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────────────
type PlanTier = "starter" | "growth" | "enterprise";

interface PlanInfo {
  name: string;
  price: string;
  features: string[];
  highlighted?: boolean;
}

const PLANS: Record<PlanTier, PlanInfo> = {
  starter: {
    name: "Starter",
    price: "$29/mo",
    features: ["5 team members", "10 GB storage", "1,000 API calls/day"],
  },
  growth: {
    name: "Growth",
    price: "$79/mo",
    features: [
      "25 team members",
      "100 GB storage",
      "10,000 API calls/day",
      "Priority support",
    ],
    highlighted: true,
  },
  enterprise: {
    name: "Enterprise",
    price: "Custom",
    features: [
      "Unlimited members",
      "Unlimited storage",
      "Unlimited API calls",
      "Dedicated support",
      "SLA",
    ],
  },
};

const MOCK_INVOICES = [
  {
    id: "inv-003",
    date: "2026-03-01",
    amount: "$79.00",
    status: "paid" as const,
  },
  {
    id: "inv-002",
    date: "2026-02-01",
    amount: "$79.00",
    status: "paid" as const,
  },
  {
    id: "inv-001",
    date: "2026-01-01",
    amount: "$79.00",
    status: "paid" as const,
  },
];

// ─── Props ───────────────────────────────────────────────────────
interface BillingSettingsProps {
  readonly onToast: (message: string) => void;
}

// ─── Component ───────────────────────────────────────────────────
export default function BillingSettings({ onToast }: BillingSettingsProps) {
  const [currentPlan] = useState<PlanTier>("growth");

  const usageStats = {
    users: { used: 8, total: 25 },
    storage: { used: 34, total: 100, unit: "GB" },
    apiCalls: { used: 4200, total: 10000, unit: "/day" },
  };

  function usageBar(used: number, total: number) {
    const pct = Math.min((used / total) * 100, 100);
    const color = pct > 85 ? "#EF4444" : pct > 60 ? "#F59E0B" : "#6C47FF";
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
        }}
      >
        <div
          style={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            background: "#F0F0F8",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              borderRadius: 3,
              background: color,
              transition: "width 0.4s ease",
            }}
          />
        </div>
        <span
          style={{
            fontSize: 12,
            color: "#6B6B8A",
            flexShrink: 0,
            minWidth: 60,
            textAlign: "right",
          }}
        >
          {used.toLocaleString()} / {total.toLocaleString()}
        </span>
      </div>
    );
  }

  return (
    <div>
      {/* Current Plan */}
      <SectionCard title="Current Plan">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {(Object.entries(PLANS) as [PlanTier, PlanInfo][]).map(
            ([tier, plan]) => {
              const isCurrent = tier === currentPlan;
              return (
                <div
                  key={tier}
                  style={{
                    flex: "1 1 180px",
                    minWidth: 180,
                    padding: 16,
                    borderRadius: 10,
                    border: isCurrent
                      ? "2px solid #6C47FF"
                      : "1px solid rgba(0,0,0,0.08)",
                    background: isCurrent ? "rgba(108,71,255,0.03)" : "#fff",
                    position: "relative",
                  }}
                >
                  {isCurrent && (
                    <div
                      style={{
                        position: "absolute",
                        top: -1,
                        right: 12,
                        padding: "2px 10px",
                        borderRadius: "0 0 8px 8px",
                        background: "#6C47FF",
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                      }}
                    >
                      CURRENT
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#1A1A2E",
                      marginBottom: 4,
                    }}
                  >
                    {plan.name}
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#6C47FF",
                      marginBottom: 12,
                    }}
                  >
                    {plan.price}
                  </div>
                  {plan.features.map((f) => (
                    <div
                      key={f}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 6,
                      }}
                    >
                      <Check
                        size={12}
                        style={{ color: "#16A34A", flexShrink: 0 }}
                      />
                      <span style={{ fontSize: 12, color: "#6B6B8A" }}>
                        {f}
                      </span>
                    </div>
                  ))}
                  {!isCurrent && (
                    <button
                      onClick={() =>
                        onToast(`Plan upgrade to ${plan.name} requested`)
                      }
                      style={{
                        width: "100%",
                        marginTop: 12,
                        padding: "7px 0",
                        borderRadius: 8,
                        border: "1px solid #D8D8E8",
                        background: "#fff",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#6C47FF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                      }}
                    >
                      {tier === "enterprise" ? "Contact Sales" : "Upgrade"}{" "}
                      <ArrowUpRight size={12} />
                    </button>
                  )}
                </div>
              );
            },
          )}
        </div>
      </SectionCard>

      {/* Usage */}
      <SectionCard title="Usage">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 500, color: "#1A1A2E" }}>
                Team Members
              </span>
            </div>
            {usageBar(usageStats.users.used, usageStats.users.total)}
          </div>
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 500, color: "#1A1A2E" }}>
                Storage ({usageStats.storage.unit})
              </span>
            </div>
            {usageBar(usageStats.storage.used, usageStats.storage.total)}
          </div>
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 500, color: "#1A1A2E" }}>
                API Calls {usageStats.apiCalls.unit}
              </span>
            </div>
            {usageBar(usageStats.apiCalls.used, usageStats.apiCalls.total)}
          </div>
        </div>
      </SectionCard>

      {/* Payment Method */}
      <SectionCard title="Payment Method">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 28,
                borderRadius: 6,
                background: "#1A1A2E",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CreditCard size={16} style={{ color: "#fff" }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#1A1A2E" }}>
                Visa ending in 4242
              </div>
              <div style={{ fontSize: 11, color: "#A0A0B8" }}>
                Expires 12/2027
              </div>
            </div>
          </div>
          <button
            onClick={() => onToast("Payment method update flow coming soon")}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid #D8D8E8",
              background: "#fff",
              cursor: "pointer",
              fontSize: 12,
              color: "#6B6B8A",
            }}
          >
            Update
          </button>
        </div>
      </SectionCard>

      {/* Billing History */}
      <SectionCard title="Billing History">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Invoice", "Date", "Amount", "Status", ""].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "6px 0",
                    textAlign: "left",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#6B6B8A",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_INVOICES.map((inv) => (
              <tr
                key={inv.id}
                style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}
              >
                <td
                  style={{
                    padding: "10px 0",
                    fontSize: 13,
                    color: "#1A1A2E",
                    fontWeight: 500,
                  }}
                >
                  {inv.id.toUpperCase()}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    fontSize: 12,
                    color: "#6B6B8A",
                  }}
                >
                  {new Date(inv.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#1A1A2E",
                  }}
                >
                  {inv.amount}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 500,
                      background: "#F0FDF4",
                      color: "#166534",
                      textTransform: "capitalize",
                    }}
                  >
                    {inv.status}
                  </span>
                </td>
                <td style={{ padding: "10px 0", textAlign: "right" }}>
                  <button
                    onClick={() => onToast(`Downloading ${inv.id}...`)}
                    style={{
                      padding: "4px 6px",
                      borderRadius: 6,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      color: "#A0A0B8",
                      display: "flex",
                      alignItems: "center",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = "#6C47FF";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color = "#A0A0B8";
                    }}
                  >
                    <Download size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
