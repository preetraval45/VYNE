"use client";

import { useState } from "react";
import {
  Heart,
  TrendingDown,
  TrendingUp,
  Users,
  FlaskConical,
  Plus,
  Pause,
  Play,
  BarChart3,
} from "lucide-react";

interface FeatureUsage {
  name: string;
  dau: number;
  wau: number;
  adoption: number;
  delta: number;
}

const FEATURE_USAGE: FeatureUsage[] = [
  { name: "Projects / Kanban", dau: 812, wau: 1_940, adoption: 78, delta: 4 },
  { name: "Chat", dau: 1_104, wau: 2_210, adoption: 91, delta: 2 },
  { name: "Docs editor", dau: 488, wau: 1_310, adoption: 62, delta: 7 },
  { name: "AI assistant", dau: 392, wau: 1_180, adoption: 55, delta: 18 },
  { name: "Time tracking", dau: 206, wau: 740, adoption: 29, delta: 12 },
  { name: "Roadmap", dau: 138, wau: 520, adoption: 24, delta: -3 },
  { name: "Automations", dau: 74, wau: 310, adoption: 15, delta: 9 },
  { name: "HR / Payroll", dau: 42, wau: 180, adoption: 9, delta: 1 },
];

interface Props {
  readonly onToast: (message: string) => void;
}

interface CustomerHealth {
  id: string;
  name: string;
  arr: string;
  score: number; // 0..100
  trend: "up" | "down" | "flat";
  signals: string[];
  risk: "healthy" | "watch" | "at-risk";
}

const CUSTOMER_HEALTH: CustomerHealth[] = [
  {
    id: "c1",
    name: "Acme Manufacturing",
    arr: "$48k",
    score: 88,
    trend: "up",
    signals: ["Daily active users: 14/16", "Last NPS: 9", "8 features adopted"],
    risk: "healthy",
  },
  {
    id: "c2",
    name: "Northwind Logistics",
    arr: "$120k",
    score: 72,
    trend: "flat",
    signals: ["DAU: 22/40 (down 8%)", "Last NPS: 7", "API calls steady"],
    risk: "watch",
  },
  {
    id: "c3",
    name: "Bluefin Robotics",
    arr: "$24k",
    score: 41,
    trend: "down",
    signals: [
      "Login activity dropped 60% MoM",
      "Open support ticket > 5 days",
      "Renewal in 18 days",
    ],
    risk: "at-risk",
  },
  {
    id: "c4",
    name: "Helios Systems",
    arr: "$96k",
    score: 81,
    trend: "up",
    signals: ["Power user adoption +12%", "Last NPS: 8", "Expansion ARR signal"],
    risk: "healthy",
  },
];

interface CohortMonth {
  signupMonth: string;
  cohortSize: number;
  retention: number[];
}

const COHORT_DATA: CohortMonth[] = [
  { signupMonth: "Nov 2025", cohortSize: 84, retention: [100, 78, 64, 58, 52, 49] },
  { signupMonth: "Dec 2025", cohortSize: 102, retention: [100, 81, 70, 64, 60] },
  { signupMonth: "Jan 2026", cohortSize: 138, retention: [100, 85, 76, 70] },
  { signupMonth: "Feb 2026", cohortSize: 156, retention: [100, 87, 79] },
  { signupMonth: "Mar 2026", cohortSize: 182, retention: [100, 89] },
  { signupMonth: "Apr 2026", cohortSize: 214, retention: [100] },
];

interface AbExperiment {
  id: string;
  name: string;
  hypothesis: string;
  status: "running" | "paused" | "completed";
  variants: Array<{
    name: string;
    allocation: number;
    conversion: number;
    visitors: number;
  }>;
  startedAt: string;
  primaryMetric: string;
  winner?: string;
  lift?: string;
}

const SEED_AB: AbExperiment[] = [
  {
    id: "ab1",
    name: "Onboarding wizard: 4 vs 2 steps",
    hypothesis:
      "Cutting the wizard from 4 steps to 2 will lift completion by 8%.",
    status: "running",
    primaryMetric: "Wizard completion",
    startedAt: "2026-04-08",
    variants: [
      { name: "Control (4 steps)", allocation: 50, conversion: 62, visitors: 412 },
      { name: "Variant (2 steps)", allocation: 50, conversion: 71, visitors: 408 },
    ],
  },
  {
    id: "ab2",
    name: "Pricing page: $24 vs $29 Business",
    hypothesis: "Raising Business tier to $29 won't reduce conversion by >5%.",
    status: "completed",
    primaryMetric: "Trial → paid conversion",
    startedAt: "2026-03-12",
    winner: "Variant ($29)",
    lift: "+11% revenue / signup at -2% conv",
    variants: [
      { name: "Control ($24)", allocation: 50, conversion: 9.4, visitors: 1840 },
      { name: "Variant ($29)", allocation: 50, conversion: 9.2, visitors: 1812 },
    ],
  },
  {
    id: "ab3",
    name: "AI suggestions auto-open vs on-click",
    hypothesis:
      "Auto-opening the AI panel on every issue will increase AI usage 30%.",
    status: "paused",
    primaryMetric: "AI suggestion accept rate",
    startedAt: "2026-04-01",
    variants: [
      { name: "Control (on-click)", allocation: 50, conversion: 18, visitors: 240 },
      { name: "Variant (auto)", allocation: 50, conversion: 22, visitors: 238 },
    ],
  },
];

export default function AnalyticsSettings({ onToast }: Props) {
  const [experiments, setExperiments] = useState<AbExperiment[]>(SEED_AB);

  function toggleStatus(id: string) {
    setExperiments((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, status: e.status === "running" ? "paused" : "running" }
          : e,
      ),
    );
  }

  // Cohort heat-map cell colour
  function cell(value: number) {
    const pct = value / 100;
    return `rgba(108,71,255,${0.1 + pct * 0.55})`;
  }

  // Aggregates for customer health
  const healthy = CUSTOMER_HEALTH.filter((c) => c.risk === "healthy").length;
  const watch = CUSTOMER_HEALTH.filter((c) => c.risk === "watch").length;
  const atRisk = CUSTOMER_HEALTH.filter((c) => c.risk === "at-risk").length;

  const maxDau = Math.max(...FEATURE_USAGE.map((f) => f.dau));

  return (
    <div>
      {/* ── Per-feature usage analytics ─────────────────────── */}
      <Card title="Feature usage (last 7 days)" icon={BarChart3}>
        <p
          style={{
            margin: "0 0 14px",
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Shipped to the product team every Monday. Use this to prioritize
          investment, kill unused features, and spot adoption curves.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FEATURE_USAGE.map((f) => {
            const pct = Math.round((f.dau / maxDau) * 100);
            const up = f.delta >= 0;
            return (
              <div
                key={f.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "160px 1fr 68px 68px 64px",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "var(--content-secondary)",
                  border: "1px solid var(--content-border)",
                }}
              >
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {f.name}
                </span>
                <div
                  style={{
                    height: 8,
                    borderRadius: 4,
                    background: "var(--content-bg)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background:
                        "linear-gradient(90deg, var(--vyne-purple), #8B6BFF)",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    fontFamily:
                      "var(--font-geist-mono), ui-monospace, monospace",
                    textAlign: "right",
                  }}
                >
                  {f.dau.toLocaleString()} DAU
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    fontFamily:
                      "var(--font-geist-mono), ui-monospace, monospace",
                    textAlign: "right",
                  }}
                >
                  {f.adoption}% org
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 3,
                    fontSize: 11,
                    fontWeight: 600,
                    color: up
                      ? "var(--badge-success-text)"
                      : "var(--badge-danger-text)",
                  }}
                >
                  {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {up ? "+" : ""}
                  {f.delta}%
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Customer health scoring ──────────────────────────── */}
      <Card title="Customer health scoring" icon={Heart}>
        <p
          style={{
            margin: "0 0 14px",
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Composite score (0–100) blends product engagement, NPS, support
          backlog, and renewal proximity. Below 60 triggers a CSM playbook.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <RiskTile
            color="var(--badge-success-text)"
            bg="var(--badge-success-bg)"
            count={healthy}
            label="Healthy"
            sub="Score ≥ 75"
          />
          <RiskTile
            color="var(--badge-warning-text)"
            bg="var(--badge-warning-bg)"
            count={watch}
            label="Watch"
            sub="Score 60–74"
          />
          <RiskTile
            color="var(--badge-danger-text)"
            bg="var(--badge-danger-bg)"
            count={atRisk}
            label="At risk"
            sub="Score < 60 — open playbook"
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {CUSTOMER_HEALTH.map((c) => {
            const TrendIcon =
              c.trend === "up"
                ? TrendingUp
                : c.trend === "down"
                  ? TrendingDown
                  : Users;
            const trendColor =
              c.trend === "up"
                ? "var(--badge-success-text)"
                : c.trend === "down"
                  ? "var(--badge-danger-text)"
                  : "var(--text-tertiary)";
            const scoreColor =
              c.risk === "healthy"
                ? "var(--badge-success-text)"
                : c.risk === "watch"
                  ? "var(--badge-warning-text)"
                  : "var(--badge-danger-text)";

            return (
              <div
                key={c.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 80px 80px 1fr",
                  alignItems: "center",
                  gap: 14,
                  padding: 12,
                  borderRadius: 9,
                  border: "1px solid var(--content-border)",
                  background: "var(--content-secondary)",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    {c.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      marginTop: 2,
                    }}
                  >
                    ARR {c.arr}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: trendColor,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  <TrendIcon size={13} />
                  {c.trend === "up"
                    ? "Trending up"
                    : c.trend === "down"
                      ? "Trending down"
                      : "Flat"}
                </div>

                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: scoreColor,
                    fontFamily:
                      "var(--font-geist-mono), ui-monospace, monospace",
                    textAlign: "center",
                  }}
                >
                  {c.score}
                </div>

                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                  }}
                >
                  {c.signals.map((s) => (
                    <li
                      key={s}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 5,
                      }}
                    >
                      <span style={{ color: scoreColor, marginTop: 2 }}>•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Cohort retention ───────────────────────────────── */}
      <Card title="Cohort analysis" icon={Users}>
        <p
          style={{
            margin: "0 0 14px",
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Monthly sign-up cohorts and their week-over-week retention. Darker
          cells = stickier users. Click a row to drill in.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 11,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    padding: "8px 12px",
                    textAlign: "left",
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--text-tertiary)",
                  }}
                >
                  Cohort
                </th>
                <th
                  style={{
                    padding: "8px 8px",
                    textAlign: "right",
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--text-tertiary)",
                  }}
                >
                  Size
                </th>
                {["M0", "M1", "M2", "M3", "M4", "M5"].map((m) => (
                  <th
                    key={m}
                    style={{
                      padding: "8px 6px",
                      textAlign: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      color: "var(--text-tertiary)",
                      minWidth: 60,
                    }}
                  >
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COHORT_DATA.map((row) => (
                <tr key={row.signupMonth}>
                  <td
                    style={{
                      padding: "6px 12px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.signupMonth}
                  </td>
                  <td
                    style={{
                      padding: "6px 8px",
                      textAlign: "right",
                      color: "var(--text-secondary)",
                      fontFamily:
                        "var(--font-geist-mono), ui-monospace, monospace",
                    }}
                  >
                    {row.cohortSize}
                  </td>
                  {Array.from({ length: 6 }).map((_, monthIdx) => {
                    const value = row.retention[monthIdx];
                    if (value === undefined) {
                      return (
                        <td
                          key={`empty-${monthIdx}`}
                          style={{
                            padding: "6px 6px",
                            textAlign: "center",
                            color: "var(--text-tertiary)",
                          }}
                        >
                          —
                        </td>
                      );
                    }
                    return (
                      <td
                        key={`v-${monthIdx}`}
                        style={{
                          padding: 4,
                        }}
                      >
                        <div
                          style={{
                            background: cell(value),
                            color: value > 60 ? "#fff" : "var(--text-primary)",
                            padding: "8px 4px",
                            borderRadius: 5,
                            textAlign: "center",
                            fontWeight: 600,
                            fontSize: 11,
                            fontFamily:
                              "var(--font-geist-mono), ui-monospace, monospace",
                          }}
                        >
                          {value}%
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 14,
            fontSize: 11,
            color: "var(--text-tertiary)",
          }}
        >
          <span>
            <strong style={{ color: "var(--text-primary)" }}>Best M3:</strong>{" "}
            Jan 2026 cohort at 76%
          </span>
          <span>
            <strong style={{ color: "var(--text-primary)" }}>
              Avg D30 retention:
            </strong>{" "}
            83%
          </span>
        </div>
      </Card>

      {/* ── A/B testing ──────────────────────────────────── */}
      <Card
        title="A/B testing framework"
        icon={FlaskConical}
        action={
          <button
            type="button"
            onClick={() => onToast("Use the Feature flags dashboard to set up traffic splits")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 12px",
              borderRadius: 7,
              border: "none",
              background: "var(--vyne-purple)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={11} /> New experiment
          </button>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {experiments.map((exp) => {
            const variants = exp.variants;
            const winning = variants.reduce((a, b) =>
              a.conversion > b.conversion ? a : b,
            );
            const lift =
              winning.conversion > 0
                ? ((winning.conversion - variants[0].conversion) /
                    variants[0].conversion) *
                  100
                : 0;
            const sigPct = Math.min(99, exp.variants[0].visitors / 10);

            return (
              <article
                key={exp.id}
                style={{
                  padding: 14,
                  borderRadius: 10,
                  border: "1px solid var(--content-border)",
                  background: "var(--content-secondary)",
                }}
              >
                <header
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      background:
                        exp.status === "running"
                          ? "var(--badge-success-bg)"
                          : exp.status === "paused"
                            ? "var(--badge-warning-bg)"
                            : "var(--content-bg)",
                      color:
                        exp.status === "running"
                          ? "var(--badge-success-text)"
                          : exp.status === "paused"
                            ? "var(--badge-warning-text)"
                            : "var(--text-secondary)",
                    }}
                  >
                    {exp.status}
                  </span>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      flex: 1,
                    }}
                  >
                    {exp.name}
                  </h3>
                  {exp.status !== "completed" && (
                    <button
                      type="button"
                      onClick={() => toggleStatus(exp.id)}
                      aria-label={
                        exp.status === "running" ? "Pause" : "Resume"
                      }
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: "1px solid var(--content-border)",
                        background: "var(--content-bg)",
                        color: "var(--text-secondary)",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {exp.status === "running" ? (
                        <>
                          <Pause size={11} /> Pause
                        </>
                      ) : (
                        <>
                          <Play size={11} /> Resume
                        </>
                      )}
                    </button>
                  )}
                </header>
                <p
                  style={{
                    margin: "0 0 10px",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    fontStyle: "italic",
                    lineHeight: 1.5,
                  }}
                >
                  {exp.hypothesis}
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  {variants.map((v) => {
                    const isWinner =
                      exp.status !== "running" &&
                      v.conversion === winning.conversion;
                    return (
                      <div
                        key={v.name}
                        style={{
                          padding: 10,
                          borderRadius: 8,
                          border: `1px solid ${isWinner ? "var(--badge-success-text)" : "var(--content-border)"}`,
                          background: isWinner
                            ? "var(--badge-success-bg)"
                            : "var(--content-bg)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: "var(--text-primary)",
                            }}
                          >
                            {v.name}
                          </span>
                          {isWinner && (
                            <span
                              style={{
                                padding: "1px 6px",
                                borderRadius: 4,
                                fontSize: 9,
                                fontWeight: 700,
                                background: "var(--badge-success-text)",
                                color: "var(--content-bg)",
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                              }}
                            >
                              Winner
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            fontFamily:
                              "var(--font-geist-mono), ui-monospace, monospace",
                            marginTop: 4,
                          }}
                        >
                          {v.conversion}%
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "var(--text-tertiary)",
                            marginTop: 2,
                          }}
                        >
                          {v.visitors.toLocaleString()} visitors · {v.allocation}% traffic
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    paddingTop: 8,
                    borderTop: "1px solid var(--content-border)",
                  }}
                >
                  <span>
                    Primary: <strong>{exp.primaryMetric}</strong>
                  </span>
                  {exp.status === "completed" ? (
                    <span style={{ color: "var(--badge-success-text)", fontWeight: 600 }}>
                      {exp.lift ?? `+${lift.toFixed(1)}% lift`}
                    </span>
                  ) : (
                    <span>Statistical sig: {sigPct.toFixed(0)}%</span>
                  )}
                  <span>Started {exp.startedAt}</span>
                </div>
              </article>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  action,
  children,
}: Readonly<{
  title: string;
  icon: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
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
          gap: 10,
        }}
      >
        <Icon size={14} style={{ color: "var(--vyne-purple)" }} />
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            flex: 1,
          }}
        >
          {title}
        </span>
        {action}
      </div>
      <div style={{ padding: "14px 18px" }}>{children}</div>
    </div>
  );
}

function RiskTile({
  color,
  bg,
  count,
  label,
  sub,
}: {
  color: string;
  bg: string;
  count: number;
  label: string;
  sub: string;
}) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 10,
        background: bg,
        border: `1px solid ${color}40`,
      }}
    >
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color,
          letterSpacing: "-0.02em",
        }}
      >
        {count}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color,
          marginTop: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "var(--text-tertiary)",
          marginTop: 4,
        }}
      >
        {sub}
      </div>
    </div>
  );
}
