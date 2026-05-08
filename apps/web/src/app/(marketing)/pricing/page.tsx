"use client";

// Public pricing page (UI_UPGRADE_PLAN.md 9.2).
//
// Renders four tiers (Free / Starter / Business / Enterprise) with
// feature parity matrix + monthly/annual toggle + checkout buttons.
// Each tier maps to a STRIPE_PRICE_ID_* env var; `/api/stripe/checkout`
// mints a Checkout session when keys are configured, or falls through
// to the waitlist when not.

import { useState } from "react";
import Link from "next/link";
import { Check, X, Sparkles, ArrowRight, Loader2 } from "lucide-react";

type Cadence = "monthly" | "annual";

interface Tier {
  id: "free" | "starter" | "business" | "enterprise";
  name: string;
  tagline: string;
  monthlyPrice: number; // USD per seat per month
  annualPrice: number; // USD per seat per month, billed annually
  cta: string;
  highlight?: boolean;
  features: { label: string; included: boolean | string }[];
}

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    tagline: "For solo builders + side projects",
    monthlyPrice: 0,
    annualPrice: 0,
    cta: "Start free",
    features: [
      { label: "1 user", included: true },
      { label: "1k records per module", included: true },
      { label: "AI: 50 messages/month, Haiku only", included: true },
      { label: "Bulk export", included: "1k rows max" },
      { label: "Real-time collaboration", included: false },
      { label: "RAG document Q&A", included: false },
      { label: "Audit log", included: false },
      { label: "Priority support", included: false },
    ],
  },
  {
    id: "starter",
    name: "Starter",
    tagline: "For small teams shipping product",
    monthlyPrice: 12,
    annualPrice: 10,
    cta: "Start 14-day trial",
    highlight: true,
    features: [
      { label: "Up to 10 users", included: true },
      { label: "25k records per module", included: true },
      { label: "AI: 1k messages/month, Sonnet", included: true },
      { label: "Bulk export", included: "25k rows" },
      { label: "Real-time collaboration", included: true },
      { label: "RAG document Q&A", included: "100 docs" },
      { label: "Audit log (90-day retention)", included: true },
      { label: "Priority support", included: false },
    ],
  },
  {
    id: "business",
    name: "Business",
    tagline: "For growing teams who need scale",
    monthlyPrice: 24,
    annualPrice: 20,
    cta: "Start 14-day trial",
    features: [
      { label: "Up to 50 users", included: true },
      { label: "250k records per module", included: true },
      { label: "AI: 10k messages/month, Opus", included: true },
      { label: "Bulk export", included: "250k rows" },
      { label: "Real-time + presence", included: true },
      { label: "RAG document Q&A", included: "Unlimited" },
      { label: "Audit log (3-year retention)", included: true },
      { label: "Priority support (24h SLA)", included: true },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For workspaces with compliance needs",
    monthlyPrice: 0,
    annualPrice: 0,
    cta: "Contact sales",
    features: [
      { label: "Unlimited users", included: true },
      { label: "Unlimited records", included: true },
      { label: "AI: BYO keys, no caps", included: true },
      { label: "SSO + SCIM provisioning", included: true },
      { label: "SOC 2 / HIPAA / GDPR", included: true },
      { label: "On-prem / VPC deploy", included: true },
      { label: "Custom integrations", included: true },
      { label: "Dedicated CSM + 1h SLA", included: true },
    ],
  },
];

export default function PricingPage() {
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [busyTier, setBusyTier] = useState<string | null>(null);

  async function startCheckout(tier: Tier) {
    if (tier.id === "enterprise") {
      window.location.href =
        "mailto:sales@vyne.dev?subject=Enterprise%20plan%20inquiry";
      return;
    }
    if (tier.id === "free") {
      window.location.href = "/signup";
      return;
    }
    setBusyTier(tier.id);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: tier.id,
          successUrl: `${window.location.origin}/home?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/pricing?checkout=cancel`,
        }),
      });
      if (!res.ok) {
        // Stripe not configured → fall back to signup with the plan
        // pre-selected so the trial flow still works.
        window.location.href = `/signup?plan=${tier.id}`;
        return;
      }
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        window.location.href = `/signup?plan=${tier.id}`;
      }
    } catch {
      window.location.href = `/signup?plan=${tier.id}`;
    } finally {
      setBusyTier(null);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg, #0A1820)",
        color: "var(--text-primary, #F0F4F8)",
        fontFamily: "var(--font-app, 'Geist', system-ui)",
      }}
    >
      {/* Top nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "16px 24px",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <Link
          href="/"
          style={{
            fontWeight: 700,
            fontSize: 16,
            color: "inherit",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Sparkles size={16} />
          VYNE
        </Link>
        <Link
          href="/changelog"
          style={{
            marginLeft: "auto",
            fontSize: 13,
            color: "var(--text-secondary, #94a3b8)",
            textDecoration: "none",
          }}
        >
          Changelog
        </Link>
        <Link
          href="/learn"
          style={{
            fontSize: 13,
            color: "var(--text-secondary, #94a3b8)",
            textDecoration: "none",
          }}
        >
          Docs
        </Link>
        <Link
          href="/login"
          style={{
            padding: "6px 14px",
            fontSize: 13,
            fontWeight: 500,
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 8,
            color: "inherit",
            textDecoration: "none",
          }}
        >
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <header
        style={{
          textAlign: "center",
          maxWidth: 760,
          margin: "40px auto 32px",
          padding: "0 24px",
        }}
      >
        <h1 style={{ fontSize: 44, margin: "0 0 12px", lineHeight: 1.1 }}>
          One AI-native workspace.
          <br />
          Replaces 8 tools.
        </h1>
        <p
          style={{
            fontSize: 17,
            color: "var(--text-secondary, #94a3b8)",
            margin: "0 0 24px",
            lineHeight: 1.5,
          }}
        >
          Start free. Upgrade when your team grows. No credit card to try.
        </p>

        {/* Cadence toggle */}
        <div
          role="tablist"
          aria-label="Billing cadence"
          style={{
            display: "inline-flex",
            padding: 4,
            background: "rgba(255,255,255,0.08)",
            borderRadius: 99,
          }}
        >
          {(["monthly", "annual"] as const).map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={cadence === c}
              onClick={() => setCadence(c)}
              style={{
                padding: "6px 18px",
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                borderRadius: 99,
                background:
                  cadence === c ? "rgba(108, 71, 255, 0.95)" : "transparent",
                color: "inherit",
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {c}
              {c === "annual" && (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 11,
                    color: "rgb(34, 197, 94)",
                    fontWeight: 600,
                  }}
                >
                  -17%
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Tier cards */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px 60px",
        }}
      >
        {TIERS.map((tier) => {
          const price =
            cadence === "annual" ? tier.annualPrice : tier.monthlyPrice;
          const priceLabel =
            tier.id === "enterprise"
              ? "Custom"
              : price === 0
                ? "$0"
                : `$${price}`;
          return (
            <article
              key={tier.id}
              style={{
                padding: 24,
                background: tier.highlight
                  ? "linear-gradient(180deg, rgba(108,71,255,0.18) 0%, rgba(255,255,255,0.04) 100%)"
                  : "rgba(255,255,255,0.04)",
                border: tier.highlight
                  ? "1px solid rgba(108,71,255,0.5)"
                  : "1px solid rgba(255,255,255,0.10)",
                borderRadius: 14,
                position: "relative",
              }}
            >
              {tier.highlight && (
                <span
                  style={{
                    position: "absolute",
                    top: -12,
                    left: 24,
                    padding: "3px 10px",
                    fontSize: 11,
                    fontWeight: 600,
                    background: "rgb(108, 71, 255)",
                    color: "#fff",
                    borderRadius: 99,
                    letterSpacing: 0.4,
                  }}
                >
                  MOST POPULAR
                </span>
              )}
              <h2 style={{ margin: 0, fontSize: 20 }}>{tier.name}</h2>
              <p
                style={{
                  margin: "4px 0 16px",
                  fontSize: 13,
                  color: "var(--text-secondary, #94a3b8)",
                  minHeight: 38,
                }}
              >
                {tier.tagline}
              </p>
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 36, fontWeight: 700 }}>
                  {priceLabel}
                </span>
                {tier.id !== "enterprise" && tier.id !== "free" && (
                  <span
                    style={{
                      marginLeft: 4,
                      fontSize: 13,
                      color: "var(--text-secondary, #94a3b8)",
                    }}
                  >
                    /seat/mo
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => startCheckout(tier)}
                disabled={busyTier === tier.id}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  fontSize: 14,
                  fontWeight: 600,
                  border: tier.highlight
                    ? "1px solid rgba(108,71,255,0.95)"
                    : "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 8,
                  background: tier.highlight
                    ? "rgb(108, 71, 255)"
                    : "transparent",
                  color: "#fff",
                  cursor: busyTier === tier.id ? "wait" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  marginBottom: 20,
                  opacity: busyTier === tier.id ? 0.7 : 1,
                }}
              >
                {busyTier === tier.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ArrowRight size={14} />
                )}
                {tier.cta}
              </button>
              <ul
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {tier.features.map((f) => (
                  <li
                    key={f.label}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      fontSize: 13,
                      color: f.included
                        ? "inherit"
                        : "var(--text-tertiary, #64748b)",
                    }}
                  >
                    {f.included ? (
                      <Check
                        size={14}
                        color="rgb(34, 197, 94)"
                        style={{ marginTop: 2, flexShrink: 0 }}
                        aria-hidden="true"
                      />
                    ) : (
                      <X
                        size={14}
                        color="rgba(255,255,255,0.25)"
                        style={{ marginTop: 2, flexShrink: 0 }}
                        aria-hidden="true"
                      />
                    )}
                    <span>
                      {f.label}
                      {typeof f.included === "string" && (
                        <span
                          style={{
                            marginLeft: 4,
                            fontSize: 11,
                            color: "var(--text-tertiary, #64748b)",
                          }}
                        >
                          · {f.included}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>

      {/* FAQ */}
      <section
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "20px 24px 80px",
        }}
      >
        <h2 style={{ fontSize: 26, margin: "0 0 24px" }}>
          Frequently asked questions
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            {
              q: "Do I need a credit card to try VYNE?",
              a: "No. The Free tier is unlimited time. Starter/Business include a 14-day trial without card capture; you only pay if you stay past day 14.",
            },
            {
              q: "How does AI cost work?",
              a: "Each tier ships a monthly AI message budget. Stay under it and you pay nothing extra. Go over and we soft-warn at 80% + hard-stop at 100% to prevent surprise bills. BYO API keys to remove caps.",
            },
            {
              q: "Can I switch tiers mid-cycle?",
              a: "Yes. Upgrades take effect immediately and prorate the remaining cycle. Downgrades take effect at the next renewal so you don't lose paid-up time.",
            },
            {
              q: "What happens to my data if I cancel?",
              a: "You keep read access for 30 days. Export every record (CSV + JSON) from Settings → Data & backups, and we permanently delete your workspace 30 days after cancellation per GDPR.",
            },
            {
              q: "Do you offer student / non-profit discounts?",
              a: "Yes — 50% off Starter and Business for verified students + registered non-profits. Email sales@vyne.dev with your .edu address or 501(c)(3) determination letter.",
            },
          ].map((item) => (
            <details
              key={item.q}
              style={{
                padding: "12px 16px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  fontSize: 15,
                  fontWeight: 500,
                  listStyle: "none",
                }}
              >
                {item.q}
              </summary>
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: 14,
                  color: "var(--text-secondary, #94a3b8)",
                  lineHeight: 1.6,
                }}
              >
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          padding: "24px",
          textAlign: "center",
          fontSize: 12,
          color: "var(--text-tertiary, #64748b)",
        }}
      >
        © {new Date().getFullYear()} VYNE. ·{" "}
        <Link
          href="/privacy"
          style={{ color: "inherit", textDecoration: "none" }}
        >
          Privacy
        </Link>{" "}
        ·{" "}
        <Link
          href="/terms"
          style={{ color: "inherit", textDecoration: "none" }}
        >
          Terms
        </Link>{" "}
        ·{" "}
        <Link
          href="/status"
          style={{ color: "inherit", textDecoration: "none" }}
        >
          Status
        </Link>
      </footer>
    </div>
  );
}
