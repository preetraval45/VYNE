"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  TrendingUp,
  Megaphone,
  GitMerge,
  Download,
  Award,
  Users,
} from "lucide-react";

interface DealRow {
  id: string;
  customer: string;
  stage: "registered" | "qualified" | "won" | "lost";
  partner: string;
  arr: string;
  registered: string;
}

const TIERS = [
  {
    name: "Authorized",
    revenue: "$0 - $50k ARR",
    margin: "10%",
    benefits: ["Co-branded marketing kit", "Partner badge", "Quarterly business review"],
  },
  {
    name: "Silver",
    revenue: "$50k - $200k ARR",
    margin: "15%",
    benefits: [
      "Everything in Authorized",
      "MDF: $5k/quarter",
      "Lead routing from VYNE sales",
      "Monthly enablement office hours",
    ],
  },
  {
    name: "Gold",
    revenue: "$200k+ ARR",
    margin: "20%",
    benefits: [
      "Everything in Silver",
      "MDF: $25k/quarter",
      "Dedicated channel SE",
      "Roadmap input + early access",
      "Co-sell incentives",
    ],
  },
];

const ASSETS = [
  { name: "VYNE Pitch Deck (16 slides)", size: "2.4 MB", type: "PDF", category: "Sales" },
  { name: "ROI Calculator (XLS)", size: "180 KB", type: "Excel", category: "Sales" },
  { name: "Battle cards vs. Slack/Jira/Notion", size: "1.1 MB", type: "PDF", category: "Sales" },
  { name: "Brand kit (logos, colours)", size: "12 MB", type: "ZIP", category: "Marketing" },
  { name: "Co-branded one-pager template", size: "4.2 MB", type: "Figma", category: "Marketing" },
  { name: "Demo script + sandbox login", size: "84 KB", type: "PDF", category: "Enablement" },
  { name: "Implementation playbook", size: "2.0 MB", type: "PDF", category: "Enablement" },
];

const SAMPLE_DEALS: DealRow[] = [
  { id: "d1", customer: "Acme Manufacturing", stage: "won", partner: "You", arr: "$48k", registered: "2026-02-12" },
  { id: "d2", customer: "Northwind Logistics", stage: "qualified", partner: "You", arr: "$120k", registered: "2026-03-04" },
  { id: "d3", customer: "Bluefin Robotics", stage: "registered", partner: "You", arr: "$24k", registered: "2026-04-09" },
];

const STAGE_STYLE: Record<DealRow["stage"], { label: string; bg: string; color: string }> = {
  registered: { label: "Registered", bg: "rgba(59,130,246,0.15)", color: "#93C5FD" },
  qualified: { label: "Qualified", bg: "rgba(245,158,11,0.15)", color: "#FCD34D" },
  won: { label: "Won", bg: "rgba(34,197,94,0.15)", color: "#4ADE80" },
  lost: { label: "Lost", bg: "rgba(239,68,68,0.15)", color: "#F87171" },
};

export default function PartnersPage() {
  const [tab, setTab] = useState<"overview" | "deals" | "assets">("overview");
  const [newDealCustomer, setNewDealCustomer] = useState("");
  const [newDealArr, setNewDealArr] = useState("");
  const [deals, setDeals] = useState<DealRow[]>(SAMPLE_DEALS);

  function registerDeal(e: React.FormEvent) {
    e.preventDefault();
    if (!newDealCustomer.trim()) return;
    setDeals((prev) => [
      {
        id: `d-${Date.now()}`,
        customer: newDealCustomer,
        arr: newDealArr || "$0",
        stage: "registered",
        partner: "You",
        registered: new Date().toISOString().slice(0, 10),
      },
      ...prev,
    ]);
    setNewDealCustomer("");
    setNewDealArr("");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0A0A1A 0%, #0F0F20 100%)",
        color: "#E8E8F0",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(10,10,26,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "14px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "rgba(255,255,255,0.7)",
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={16} /> Back to home
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "linear-gradient(135deg, #06B6D4, #22D3EE)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              V
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              VYNE Partners
            </span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{ padding: "60px 24px 30px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 12px",
              borderRadius: 999,
              background: "rgba(6, 182, 212,0.1)",
              border: "1px solid rgba(6, 182, 212,0.25)",
              color: "#67E8F9",
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            <Briefcase size={12} /> Partner Program · 2026
          </div>
          <h1
            style={{
              fontSize: "clamp(32px, 5vw, 52px)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "#fff",
              margin: "0 0 14px",
            }}
          >
            Build &amp; resell on top of VYNE
          </h1>
          <p
            style={{
              maxWidth: 720,
              fontSize: 16,
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1.6,
            }}
          >
            Co-sell with us, white-label VYNE for your customers, or build
            integrations that earn revenue share. Three tiers, real margins,
            real co-marketing dollars.
          </p>
        </div>
      </section>

      {/* Tabs */}
      <div
        style={{
          padding: "0 24px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            gap: 6,
          }}
        >
          {(
            [
              ["overview", "Overview"],
              ["deals", "Deal registration"],
              ["assets", "Marketing assets"],
            ] as const
          ).map(([id, label]) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                style={{
                  padding: "9px 14px",
                  borderRadius: "8px 8px 0 0",
                  border: "none",
                  background: active
                    ? "rgba(6, 182, 212,0.12)"
                    : "transparent",
                  color: active ? "#67E8F9" : "rgba(255,255,255,0.55)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  borderBottom: active
                    ? "2px solid #06B6D4"
                    : "2px solid transparent",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "overview" && (
        <section style={{ padding: "30px 24px 60px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#fff",
                margin: "0 0 16px",
                letterSpacing: "-0.01em",
              }}
            >
              Three tiers · margin grows with revenue
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 14,
              }}
            >
              {TIERS.map((t, i) => {
                const accent = ["#A0A0B8", "#67E8F9", "#FCD34D"][i] ?? "#fff";
                return (
                  <div
                    key={t.name}
                    style={{
                      padding: 22,
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.02)",
                      border: `1px solid ${accent}33`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <Award size={14} style={{ color: accent }} />
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                          color: accent,
                        }}
                      >
                        {t.name}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 800,
                        color: "#fff",
                        margin: "0 0 4px",
                      }}
                    >
                      {t.margin}
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: "rgba(255,255,255,0.5)",
                          marginLeft: 6,
                        }}
                      >
                        margin
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.6)",
                        marginBottom: 14,
                      }}
                    >
                      {t.revenue}
                    </div>
                    <ul
                      style={{
                        listStyle: "none",
                        margin: 0,
                        padding: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        fontSize: 13,
                        color: "rgba(255,255,255,0.85)",
                      }}
                    >
                      {t.benefits.map((b) => (
                        <li
                          key={b}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 6,
                          }}
                        >
                          <span style={{ color: accent }}>✓</span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 14,
                marginTop: 28,
              }}
            >
              {[
                {
                  icon: TrendingUp,
                  title: "Earn revenue share",
                  body: "10–20% margin on every deal you bring or service.",
                },
                {
                  icon: Megaphone,
                  title: "Co-marketing dollars",
                  body: "Quarterly MDF for events, ads, and campaigns.",
                },
                {
                  icon: GitMerge,
                  title: "Build integrations",
                  body: "Publish in our marketplace and earn 30% on installs.",
                },
                {
                  icon: Users,
                  title: "Lead routing",
                  body: "Get qualified leads from our SDR team for your region.",
                },
              ].map((p) => (
                <div
                  key={p.title}
                  style={{
                    padding: 18,
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <p.icon size={18} style={{ color: "#22D3EE", marginBottom: 8 }} />
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#fff",
                      marginBottom: 4,
                    }}
                  >
                    {p.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.6)",
                      lineHeight: 1.5,
                    }}
                  >
                    {p.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === "deals" && (
        <section style={{ padding: "30px 24px 60px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#fff",
                margin: "0 0 14px",
                letterSpacing: "-0.01em",
              }}
            >
              Register a deal
            </h2>

            <form
              onSubmit={registerDeal}
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 18,
                flexWrap: "wrap",
              }}
            >
              <input
                value={newDealCustomer}
                onChange={(e) => setNewDealCustomer(e.target.value)}
                placeholder="Customer name"
                aria-label="Customer name"
                style={{
                  flex: "1 1 240px",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#fff",
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <input
                value={newDealArr}
                onChange={(e) => setNewDealArr(e.target.value)}
                placeholder="Estimated ARR (e.g. $48k)"
                aria-label="Estimated ARR"
                style={{
                  flex: "0 1 180px",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#fff",
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <button
                type="submit"
                style={{
                  padding: "10px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: "linear-gradient(135deg, #06B6D4, #22D3EE)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Register
              </button>
            </form>

            <div
              style={{
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.06)",
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                    {["Customer", "ARR", "Stage", "Partner", "Registered"].map(
                      (h) => (
                        <th
                          key={h}
                          style={{
                            padding: "10px 14px",
                            textAlign: "left",
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            color: "rgba(255,255,255,0.5)",
                          }}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {deals.map((d) => {
                    const s = STAGE_STYLE[d.stage];
                    return (
                      <tr
                        key={d.id}
                        style={{
                          borderTop: "1px solid rgba(255,255,255,0.04)",
                        }}
                      >
                        <td
                          style={{
                            padding: "12px 14px",
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#fff",
                          }}
                        >
                          {d.customer}
                        </td>
                        <td
                          style={{
                            padding: "12px 14px",
                            fontSize: 13,
                            color: "rgba(255,255,255,0.85)",
                          }}
                        >
                          {d.arr}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span
                            style={{
                              padding: "2px 10px",
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 700,
                              background: s.bg,
                              color: s.color,
                            }}
                          >
                            {s.label}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "12px 14px",
                            fontSize: 12,
                            color: "rgba(255,255,255,0.6)",
                          }}
                        >
                          {d.partner}
                        </td>
                        <td
                          style={{
                            padding: "12px 14px",
                            fontSize: 11,
                            color: "rgba(255,255,255,0.5)",
                            fontFamily:
                              "var(--font-geist-mono), ui-monospace, monospace",
                          }}
                        >
                          {d.registered}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {tab === "assets" && (
        <section style={{ padding: "30px 24px 60px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#fff",
                margin: "0 0 14px",
                letterSpacing: "-0.01em",
              }}
            >
              Marketing &amp; enablement assets
            </h2>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {ASSETS.map((a) => (
                <div
                  key={a.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: 12,
                    borderRadius: 9,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      background: "rgba(6, 182, 212,0.15)",
                      color: "#67E8F9",
                      fontFamily:
                        "var(--font-geist-mono), ui-monospace, monospace",
                    }}
                  >
                    {a.type}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#fff",
                      }}
                    >
                      {a.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.5)",
                      }}
                    >
                      {a.category} · {a.size}
                    </div>
                  </div>
                  <button
                    type="button"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "1px solid rgba(6, 182, 212,0.4)",
                      background: "transparent",
                      color: "#67E8F9",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <Download size={12} /> Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
