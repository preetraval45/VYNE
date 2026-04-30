"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  Check,
  ArrowUpRight,
  Download,
  Loader2,
} from "lucide-react";
import { billingApi } from "@/lib/api/client";

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
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 10,
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--content-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
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
  const [currentPlan, setCurrentPlan] = useState<PlanTier>("starter");
  const [upgrading, setUpgrading] = useState<PlanTier | null>(null);
  const [billingConfigured, setBillingConfigured] = useState<boolean | null>(null);
  const [hasCustomer, setHasCustomer] = useState(false);

  // Pull current plan + billing-configured flag from /api/stripe/status.
  // Maps the canonical plan keys (free/starter/business/enterprise) to
  // the PlanTier display tier this UI uses (starter/growth/enterprise).
  useEffect(() => {
    let cancelled = false;
    void billingApi
      .status()
      .then((res) => {
        if (cancelled || !res.data) return;
        setBillingConfigured(res.data.billingConfigured);
        setHasCustomer(res.data.hasCustomer);
        // Map "business" → "growth" (the existing UI label).
        if (res.data.plan === "business") setCurrentPlan("growth");
        else if (res.data.plan === "starter") setCurrentPlan("starter");
        else if (res.data.plan === "enterprise") setCurrentPlan("enterprise");
        else setCurrentPlan("starter");
      })
      .catch(() => {
        // Network failure → keep default. Surfaced via toast below.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Show toast on redirect back from Stripe
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const billing = params.get("billing");
    if (billing === "success") {
      onToast("Subscription activated! Your plan has been upgraded.");
      // Clean the URL
      const url = new URL(window.location.href);
      url.searchParams.delete("billing");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.toString());
    } else if (billing === "cancelled") {
      onToast("Plan upgrade cancelled.");
      const url = new URL(window.location.href);
      url.searchParams.delete("billing");
      window.history.replaceState({}, "", url.toString());
    } else if (billing === "demo") {
      onToast(
        "Stripe not configured — add STRIPE_SECRET_KEY to enable payments.",
      );
      const url = new URL(window.location.href);
      url.searchParams.delete("billing");
      window.history.replaceState({}, "", url.toString());
    }
  }, [onToast]);

  async function handleUpgrade(tier: PlanTier) {
    setUpgrading(tier);
    try {
      const res = await billingApi.createCheckout(tier, window.location.origin);
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch {
      onToast("Could not start checkout. Please try again.");
    } finally {
      setUpgrading(null);
    }
  }

  async function handleManagePlan() {
    try {
      const res = await billingApi.createPortal(null, window.location.origin);
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch {
      onToast("Could not open billing portal. Please try again.");
    }
  }

  const usageStats = {
    users: { used: 8, total: 25 },
    storage: { used: 34, total: 100, unit: "GB" },
    apiCalls: { used: 4200, total: 10000, unit: "/day" },
  };

  function usageBar(used: number, total: number) {
    const pct = Math.min((used / total) * 100, 100);
    const color = pct > 85 ? "#EF4444" : pct > 60 ? "#F59E0B" : "var(--vyne-accent, #06B6D4)";
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
            background: "var(--content-secondary)",
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
            color: "var(--text-secondary)",
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
                      ? "2px solid #06B6D4"
                      : "1px solid var(--content-border)",
                    background: isCurrent
                      ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.05)"
                      : "var(--content-bg)",
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
                        background: "var(--vyne-accent, #06B6D4)",
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
                      color: "var(--text-primary)",
                      marginBottom: 4,
                    }}
                  >
                    {plan.name}
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: "var(--vyne-accent, #06B6D4)",
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
                      <span
                        style={{ fontSize: 12, color: "var(--text-secondary)" }}
                      >
                        {f}
                      </span>
                    </div>
                  ))}
                  {isCurrent && (
                    <button
                      onClick={handleManagePlan}
                      style={{
                        width: "100%",
                        marginTop: 12,
                        padding: "7px 0",
                        borderRadius: 8,
                        border: "1px solid var(--input-border)",
                        background: "var(--content-bg)",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--text-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                      }}
                    >
                      Manage Plan <ArrowUpRight size={12} />
                    </button>
                  )}
                  {!isCurrent && (
                    <button
                      onClick={() =>
                        tier === "enterprise"
                          ? onToast(
                              "Contact sales@vyne.ai for Enterprise pricing",
                            )
                          : handleUpgrade(tier)
                      }
                      disabled={upgrading === tier}
                      style={{
                        width: "100%",
                        marginTop: 12,
                        padding: "7px 0",
                        borderRadius: 8,
                        border: "1px solid var(--input-border)",
                        background: "var(--content-bg)",
                        cursor: upgrading === tier ? "not-allowed" : "pointer",
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--vyne-accent, #06B6D4)",
                        opacity: upgrading === tier ? 0.6 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                      }}
                    >
                      {upgrading === tier ? (
                        <Loader2
                          size={12}
                          style={{ animation: "spin 1s linear infinite" }}
                        />
                      ) : tier === "enterprise" ? (
                        <>
                          Contact Sales <ArrowUpRight size={12} />
                        </>
                      ) : (
                        <>
                          Upgrade <ArrowUpRight size={12} />
                        </>
                      )}
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
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
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
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
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
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
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
                background: "var(--sidebar-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CreditCard size={16} style={{ color: "#fff" }} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
                Visa ending in 4242
              </div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                Expires 12/2027
              </div>
            </div>
          </div>
          <button
            onClick={() => onToast("Payment method update flow coming soon")}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid var(--input-border)",
              background: "var(--content-bg)",
              cursor: "pointer",
              fontSize: 12,
              color: "var(--text-secondary)",
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
                    color: "var(--text-secondary)",
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
                style={{ borderTop: "1px solid var(--content-border)" }}
              >
                <td
                  style={{
                    padding: "10px 0",
                    fontSize: 13,
                    color: "var(--text-primary)",
                    fontWeight: 500,
                  }}
                >
                  {inv.id.toUpperCase()}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    fontSize: 12,
                    color: "var(--text-secondary)",
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
                    color: "var(--text-primary)",
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
                      background: "var(--badge-success-bg)",
                      color: "var(--badge-success-text)",
                      textTransform: "capitalize",
                    }}
                  >
                    {inv.status}
                  </span>
                </td>
                <td style={{ padding: "10px 0", textAlign: "right" }}>
                  <button
                    aria-label="Download"
                    onClick={() => onToast(`Downloading ${inv.id}...`)}
                    style={{
                      padding: "4px 6px",
                      borderRadius: 6,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      color: "var(--text-tertiary)",
                      display: "flex",
                      alignItems: "center",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = "var(--vyne-accent, #06B6D4)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color =
                        "var(--text-tertiary)";
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

      {/* ── Advanced billing add-ons ─────────────────────────── */}
      <AdvancedBilling onToast={onToast} />
    </div>
  );
}

// ─── Advanced billing: multi-currency, tax, revenue rec, usage, anomaly ───────
type Currency = "USD" | "EUR" | "GBP" | "CAD" | "AUD" | "INR" | "JPY";

const CURRENCY_RATES: Record<Currency, { symbol: string; rate: number }> = {
  USD: { symbol: "$", rate: 1 },
  EUR: { symbol: "€", rate: 0.92 },
  GBP: { symbol: "£", rate: 0.79 },
  CAD: { symbol: "C$", rate: 1.36 },
  AUD: { symbol: "A$", rate: 1.52 },
  INR: { symbol: "₹", rate: 83.5 },
  JPY: { symbol: "¥", rate: 150 },
};

interface UsageMeter {
  key: string;
  name: string;
  unit: string;
  pricePerUnit: number;
  used: number;
}

interface BillingAnomaly {
  id: string;
  detectedAt: string;
  severity: "low" | "medium" | "high";
  title: string;
  body: string;
  delta: string;
}

const SEED_METERS: UsageMeter[] = [
  {
    key: "ai_tokens",
    name: "AI tokens (Claude)",
    unit: "1k tokens",
    pricePerUnit: 0.003,
    used: 4_182_000,
  },
  {
    key: "storage",
    name: "Document storage",
    unit: "GB-month",
    pricePerUnit: 0.05,
    used: 84,
  },
  {
    key: "ws_minutes",
    name: "Realtime collab minutes",
    unit: "minute",
    pricePerUnit: 0.0008,
    used: 28_400,
  },
  {
    key: "webhook_calls",
    name: "Outbound webhook calls",
    unit: "1k calls",
    pricePerUnit: 0.002,
    used: 142_000,
  },
];

const SEED_ANOMALIES: BillingAnomaly[] = [
  {
    id: "an1",
    detectedAt: "2026-04-13T18:24:00Z",
    severity: "high",
    title: "AI token spend up 4.2× vs 7-day avg",
    body: "Spike traced to Zapier integration calling /ai/query in a tight loop. Suggest adding a per-key rate limit.",
    delta: "+$184 in 6h",
  },
  {
    id: "an2",
    detectedAt: "2026-04-09T09:12:00Z",
    severity: "medium",
    title: "Webhook delivery cost ↑ 38%",
    body: "New endpoint subscribed to all events. Recommend trimming subscription to high-value events.",
    delta: "+$32 / day",
  },
  {
    id: "an3",
    detectedAt: "2026-04-02T15:00:00Z",
    severity: "low",
    title: "Storage growth ahead of plan",
    body: "Document attachments growing 12%/month vs 5% plan. Consider archival policy.",
    delta: "+18 GB",
  },
];

function AdvancedBilling({ onToast }: { onToast: (m: string) => void }) {
  const [currency, setCurrency] = useState<Currency>("USD");
  const [stripeTax, setStripeTax] = useState(true);
  const [taxLocations, setTaxLocations] = useState<string[]>([
    "United States",
    "European Union",
  ]);
  const [meters, setMeters] = useState<UsageMeter[]>(SEED_METERS);
  const [anomalyDetection, setAnomalyDetection] = useState(true);
  const [anomalyAlertThreshold, setAnomalyAlertThreshold] = useState(50);

  const cur = CURRENCY_RATES[currency];

  function fmt(amount: number) {
    const converted = amount * cur.rate;
    return `${cur.symbol}${converted.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })}`;
  }

  function setMeterPrice(idx: number, price: number) {
    setMeters((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, pricePerUnit: price } : m)),
    );
  }

  // Revenue recognition (ASC 606 / IFRS 15) — straight-line over service period
  const recognized = [
    { month: "Nov 2025", booked: 32_000, recognized: 5_333 },
    { month: "Dec 2025", booked: 38_000, recognized: 6_333 },
    { month: "Jan 2026", booked: 41_000, recognized: 6_833 },
    { month: "Feb 2026", booked: 44_000, recognized: 7_333 },
    { month: "Mar 2026", booked: 46_000, recognized: 7_667 },
    { month: "Apr 2026", booked: 48_200, recognized: 8_033 },
  ];
  const totalBooked = recognized.reduce((s, r) => s + r.booked, 0);
  const totalRecognized = recognized.reduce((s, r) => s + r.recognized, 0);
  const totalDeferred = totalBooked - totalRecognized;

  return (
    <>
      {/* Multi-currency */}
      <SectionCard title="Multi-currency support">
        <p
          style={{
            margin: "0 0 12px",
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Display pricing, invoices, and billing reports in your reporting
          currency. Stripe handles FX automatically on customer-facing invoices.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {(Object.keys(CURRENCY_RATES) as Currency[]).map((c) => {
            const m = CURRENCY_RATES[c];
            const active = currency === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: `1px solid ${active ? "var(--vyne-accent, var(--vyne-purple))" : "var(--content-border)"}`,
                  background: active
                    ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.08)"
                    : "var(--content-bg)",
                  color: active ? "var(--vyne-accent, var(--vyne-purple))" : "var(--text-primary)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
                }}
              >
                {m.symbol} {c}
              </button>
            );
          })}
        </div>

        {currency !== "USD" && (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 8,
              background: "var(--content-secondary)",
              fontSize: 12,
              color: "var(--text-secondary)",
            }}
          >
            $1.00 USD ≈ {cur.symbol}
            {cur.rate.toFixed(2)} {currency} · rates updated daily from{" "}
            <code>open.er-api.com</code>
          </div>
        )}
      </SectionCard>

      {/* Stripe Tax */}
      <SectionCard title="Tax automation (Stripe Tax)">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              Auto-calculate VAT, GST, and US sales tax
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                marginTop: 2,
              }}
            >
              Stripe Tax determines the right rate at checkout based on the
              customer&apos;s location, applies it, and remits in regions where
              you&apos;re registered.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={stripeTax ? "true" : "false"}
            aria-label="Toggle Stripe Tax"
            onClick={() => setStripeTax((v) => !v)}
            style={{
              width: 40,
              height: 22,
              borderRadius: 11,
              border: "none",
              background: stripeTax
                ? "var(--vyne-accent, var(--vyne-purple))"
                : "var(--content-border)",
              position: "relative",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 3,
                left: stripeTax ? 21 : 3,
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#fff",
                transition: "left 0.2s",
              }}
            />
          </button>
        </div>

        {stripeTax && (
          <>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              Registered tax jurisdictions
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[
                "United States",
                "European Union",
                "United Kingdom",
                "Canada",
                "Australia",
                "Japan",
                "India",
              ].map((loc) => {
                const active = taxLocations.includes(loc);
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() =>
                      setTaxLocations((prev) =>
                        active ? prev.filter((p) => p !== loc) : [...prev, loc],
                      )
                    }
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      border: `1px solid ${active ? "var(--badge-success-text)" : "var(--content-border)"}`,
                      background: active
                        ? "var(--badge-success-bg)"
                        : "var(--content-bg)",
                      color: active
                        ? "var(--badge-success-text)"
                        : "var(--text-secondary)",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {active ? "✓ " : "+ "}
                    {loc}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </SectionCard>

      {/* Revenue recognition */}
      <SectionCard title="Revenue recognition (ASC 606)">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <RecogStat label="Booked (6mo)" value={fmt(totalBooked)} />
          <RecogStat label="Recognized" value={fmt(totalRecognized)} accent />
          <RecogStat
            label="Deferred"
            value={fmt(totalDeferred)}
            sub="On balance sheet"
          />
        </div>
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
        >
          <thead>
            <tr
              style={{
                background: "var(--table-header-bg)",
                borderBottom: "1px solid var(--content-border)",
              }}
            >
              {["Period", "Booked", "Recognized", "Deferred"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "8px 12px",
                    textAlign: h === "Period" ? "left" : "right",
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--text-tertiary)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recognized.map((r) => (
              <tr
                key={r.month}
                style={{ borderBottom: "1px solid var(--content-border)" }}
              >
                <td
                  style={{
                    padding: "8px 12px",
                    fontWeight: 500,
                    color: "var(--text-primary)",
                  }}
                >
                  {r.month}
                </td>
                <td
                  style={{
                    padding: "8px 12px",
                    textAlign: "right",
                    color: "var(--text-secondary)",
                    fontFamily:
                      "var(--font-geist-mono), ui-monospace, monospace",
                  }}
                >
                  {fmt(r.booked)}
                </td>
                <td
                  style={{
                    padding: "8px 12px",
                    textAlign: "right",
                    color: "var(--badge-success-text)",
                    fontWeight: 600,
                    fontFamily:
                      "var(--font-geist-mono), ui-monospace, monospace",
                  }}
                >
                  {fmt(r.recognized)}
                </td>
                <td
                  style={{
                    padding: "8px 12px",
                    textAlign: "right",
                    color: "var(--text-tertiary)",
                    fontFamily:
                      "var(--font-geist-mono), ui-monospace, monospace",
                  }}
                >
                  {fmt(r.booked - r.recognized)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          onClick={() => onToast("Revenue recognition CSV exported")}
          style={{
            marginTop: 10,
            padding: "7px 14px",
            borderRadius: 8,
            border: "1px solid var(--content-border)",
            background: "var(--content-bg)",
            color: "var(--text-secondary)",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Export waterfall (CSV)
        </button>
      </SectionCard>

      {/* Usage-based pricing */}
      <SectionCard title="Usage-based pricing meters">
        <p
          style={{
            margin: "0 0 12px",
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Meter consumption-based add-ons. Each meter feeds Stripe Billing for
          end-of-cycle invoicing.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {meters.map((m, idx) => {
            const cost =
              (m.used / (m.unit.includes("1k") ? 1000 : 1)) * m.pricePerUnit;
            return (
              <div
                key={m.key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 120px 100px 100px",
                  gap: 12,
                  alignItems: "center",
                  padding: 10,
                  borderRadius: 9,
                  border: "1px solid var(--content-border)",
                  background: "var(--content-secondary)",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {m.name}
                  </div>
                  <code
                    style={{
                      fontSize: 10,
                      color: "var(--text-tertiary)",
                      fontFamily:
                        "var(--font-geist-mono), ui-monospace, monospace",
                    }}
                  >
                    {m.key}
                  </code>
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 3 }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--text-tertiary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Price / {m.unit}
                  </span>
                  <input
                    type="number"
                    step={0.0001}
                    min={0}
                    value={m.pricePerUnit}
                    onChange={(e) => setMeterPrice(idx, Number(e.target.value))}
                    aria-label={`Price for ${m.name}`}
                    style={{
                      padding: "5px 8px",
                      borderRadius: 6,
                      border: "1px solid var(--input-border)",
                      background: "var(--input-bg)",
                      color: "var(--text-primary)",
                      fontSize: 12,
                      fontFamily:
                        "var(--font-geist-mono), ui-monospace, monospace",
                      outline: "none",
                    }}
                  />
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-tertiary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Used (mo)
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      fontFamily:
                        "var(--font-geist-mono), ui-monospace, monospace",
                    }}
                  >
                    {m.used.toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text-tertiary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    MTD cost
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--vyne-accent, var(--vyne-purple))",
                      fontFamily:
                        "var(--font-geist-mono), ui-monospace, monospace",
                    }}
                  >
                    {fmt(cost)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Anomaly detection */}
      <SectionCard title="Billing anomaly detection">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              Auto-detect cost spikes
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                marginTop: 2,
              }}
            >
              ML-based watchdog over usage meters; alerts on any line item that
              jumps {anomalyAlertThreshold}% above its 14-day baseline.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={anomalyDetection ? "true" : "false"}
            aria-label="Toggle anomaly detection"
            onClick={() => setAnomalyDetection((v) => !v)}
            style={{
              width: 40,
              height: 22,
              borderRadius: 11,
              border: "none",
              background: anomalyDetection
                ? "var(--vyne-accent, var(--vyne-purple))"
                : "var(--content-border)",
              position: "relative",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 3,
                left: anomalyDetection ? 21 : 3,
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#fff",
                transition: "left 0.2s",
              }}
            />
          </button>
        </div>

        {anomalyDetection && (
          <>
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  marginBottom: 4,
                }}
              >
                <span>Alert sensitivity</span>
                <span
                  style={{
                    fontFamily:
                      "var(--font-geist-mono), ui-monospace, monospace",
                  }}
                >
                  ≥ {anomalyAlertThreshold}% spike
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={300}
                step={10}
                value={anomalyAlertThreshold}
                onChange={(e) =>
                  setAnomalyAlertThreshold(Number(e.target.value))
                }
                aria-label="Alert threshold"
                style={{ width: "100%", accentColor: "var(--vyne-accent, #06B6D4)" }}
              />
            </div>

            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              Recent anomalies
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SEED_ANOMALIES.map((a) => {
                const sev =
                  a.severity === "high"
                    ? {
                        color: "var(--badge-danger-text)",
                        bg: "var(--badge-danger-bg)",
                      }
                    : a.severity === "medium"
                      ? {
                          color: "var(--badge-warning-text)",
                          bg: "var(--badge-warning-bg)",
                        }
                      : {
                          color: "var(--text-secondary)",
                          bg: "var(--content-secondary)",
                        };
                return (
                  <div
                    key={a.id}
                    style={{
                      padding: 10,
                      borderRadius: 9,
                      border: `1px solid ${sev.color}40`,
                      background: sev.bg,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          padding: "1px 8px",
                          borderRadius: 999,
                          background: sev.color,
                          color: "var(--content-bg)",
                          fontSize: 9,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {a.severity}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          flex: 1,
                        }}
                      >
                        {a.title}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: sev.color,
                          fontFamily:
                            "var(--font-geist-mono), ui-monospace, monospace",
                        }}
                      >
                        {a.delta}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        lineHeight: 1.5,
                      }}
                    >
                      {a.body}
                    </p>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text-tertiary)",
                        marginTop: 4,
                        fontFamily:
                          "var(--font-geist-mono), ui-monospace, monospace",
                      }}
                    >
                      {new Date(a.detectedAt).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </SectionCard>
    </>
  );
}

function RecogStat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 10,
        border: `1px solid ${accent ? "var(--badge-success-text)" : "var(--content-border)"}`,
        background: accent
          ? "var(--badge-success-bg)"
          : "var(--content-secondary)",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: accent ? "var(--badge-success-text)" : "var(--text-primary)",
          letterSpacing: "-0.02em",
          marginTop: 4,
          fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 10,
            color: "var(--text-tertiary)",
            marginTop: 2,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
