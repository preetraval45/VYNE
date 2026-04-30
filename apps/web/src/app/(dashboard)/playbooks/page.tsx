"use client";

import { useState } from "react";
import {
  Zap,
  Users,
  TrendingDown,
  AlertTriangle,
  Star,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  ChevronRight,
} from "lucide-react";

interface PlaybookStep {
  id: string;
  label: string;
  channel: "email" | "in-app" | "slack" | "task" | "ai";
  delay: string;
}

interface Playbook {
  id: string;
  name: string;
  trigger: string;
  triggerIcon: React.ElementType;
  goal: string;
  steps: PlaybookStep[];
  status: "active" | "paused" | "draft";
  runsTotal: number;
  runsActive: number;
  conversionRate: number;
}

const CHANNEL_META: Record<PlaybookStep["channel"], { label: string; color: string }> = {
  email: { label: "Email", color: "#F59E0B" },
  "in-app": { label: "In-app", color: "var(--vyne-accent, #06B6D4)" },
  slack: { label: "Slack", color: "#E01E5A" },
  task: { label: "Task", color: "#22C55E" },
  ai: { label: "AI nudge", color: "#EC4899" },
};

const SEED_PLAYBOOKS: Playbook[] = [
  {
    id: "p1",
    name: "Low health score rescue",
    trigger: "Customer health drops below 60",
    triggerIcon: TrendingDown,
    goal: "Win back usage before renewal; prevent churn",
    status: "active",
    runsTotal: 42,
    runsActive: 4,
    conversionRate: 68,
    steps: [
      { id: "s1", label: "Notify CSM in #customer-success", channel: "slack", delay: "Immediately" },
      { id: "s2", label: "AI drafts a personalized check-in email", channel: "ai", delay: "+30 min" },
      { id: "s3", label: "CSM reviews + sends email", channel: "email", delay: "Same day" },
      { id: "s4", label: "Schedule 30-min call if no reply", channel: "task", delay: "+3 days" },
      { id: "s5", label: "Executive escalation if still silent", channel: "slack", delay: "+7 days" },
    ],
  },
  {
    id: "p2",
    name: "New-user onboarding",
    trigger: "Workspace created in the last 7 days",
    triggerIcon: Star,
    goal: "Reach activation milestone: 3 users + 10 issues created",
    status: "active",
    runsTotal: 214,
    runsActive: 38,
    conversionRate: 82,
    steps: [
      { id: "s1", label: "Welcome email from founder", channel: "email", delay: "Day 1" },
      { id: "s2", label: "Show first-run product tour", channel: "in-app", delay: "First login" },
      { id: "s3", label: "Invite-teammates nudge if <3 users", channel: "in-app", delay: "Day 2" },
      { id: "s4", label: "AI writes a setup suggestion", channel: "ai", delay: "Day 3" },
      { id: "s5", label: "Offer 30-min onboarding call", channel: "email", delay: "Day 7" },
    ],
  },
  {
    id: "p3",
    name: "At-risk renewal",
    trigger: "Renewal in ≤ 30 days + health score < 70",
    triggerIcon: AlertTriangle,
    goal: "Lock renewal and identify expansion opportunities",
    status: "active",
    runsTotal: 18,
    runsActive: 2,
    conversionRate: 74,
    steps: [
      { id: "s1", label: "Account review task to CSM lead", channel: "task", delay: "Immediately" },
      { id: "s2", label: "Generate renewal summary PDF", channel: "ai", delay: "+1 day" },
      { id: "s3", label: "Joint call with exec sponsor", channel: "email", delay: "Week 1" },
      { id: "s4", label: "Negotiate expansion / multi-year", channel: "task", delay: "Week 2" },
    ],
  },
  {
    id: "p4",
    name: "Power-user expansion",
    trigger: "Single user drives > 40% of workspace activity",
    triggerIcon: Zap,
    goal: "Identify expansion champion + upsell seats",
    status: "paused",
    runsTotal: 7,
    runsActive: 0,
    conversionRate: 43,
    steps: [
      { id: "s1", label: "Flag in sales CRM", channel: "task", delay: "Immediately" },
      { id: "s2", label: "Send champion-kit email", channel: "email", delay: "Day 1" },
      { id: "s3", label: "AE reaches out", channel: "email", delay: "Day 3" },
    ],
  },
];

export default function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>(SEED_PLAYBOOKS);
  const [selected, setSelected] = useState<Playbook>(SEED_PLAYBOOKS[0]);

  function toggleStatus(id: string) {
    setPlaybooks((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: p.status === "active" ? "paused" : "active",
            }
          : p,
      ),
    );
    if (selected.id === id) {
      setSelected({
        ...selected,
        status: selected.status === "active" ? "paused" : "active",
      });
    }
  }

  const totalActive = playbooks.filter((p) => p.status === "active").length;
  const totalRuns = playbooks.reduce((s, p) => s + p.runsActive, 0);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          padding: "14px 24px",
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Users size={17} style={{ color: "var(--vyne-accent, var(--vyne-purple))" }} />
          Customer success playbooks
        </h1>
        <p
          style={{
            margin: "2px 0 0",
            fontSize: 12,
            color: "var(--text-tertiary)",
          }}
        >
          Auto-triggered workflows that guide CSMs through rescue, expansion, and
          onboarding journeys. {totalActive} active · {totalRuns} in flight.
        </p>
      </header>

      <div
        className="two-pane-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          flex: 1,
          overflow: "hidden",
        }}
      >
        <aside
          style={{
            borderRight: "1px solid var(--content-border)",
            background: "var(--content-secondary)",
            overflowY: "auto",
            padding: 10,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {playbooks.map((p) => {
              const Icon = p.triggerIcon;
              const active = selected.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p)}
                  style={{
                    textAlign: "left",
                    padding: 12,
                    borderRadius: 10,
                    border: `1px solid ${active ? "var(--vyne-accent, var(--vyne-purple))" : "var(--content-border)"}`,
                    background: active
                      ? "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.08)"
                      : "var(--content-bg)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon
                      size={13}
                      style={{
                        color:
                          p.status === "active"
                            ? "var(--vyne-accent, var(--vyne-purple))"
                            : "var(--text-tertiary)",
                      }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>
                      {p.name}
                    </span>
                    <span
                      style={{
                        padding: "1px 6px",
                        borderRadius: 4,
                        fontSize: 9,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        background:
                          p.status === "active"
                            ? "var(--badge-success-bg)"
                            : p.status === "paused"
                              ? "var(--badge-warning-bg)"
                              : "var(--content-secondary)",
                        color:
                          p.status === "active"
                            ? "var(--badge-success-text)"
                            : p.status === "paused"
                              ? "var(--badge-warning-text)"
                              : "var(--text-tertiary)",
                      }}
                    >
                      {p.status}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      lineHeight: 1.5,
                    }}
                  >
                    {p.trigger}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 10,
                      color: "var(--text-tertiary)",
                      fontFamily:
                        "var(--font-geist-mono), ui-monospace, monospace",
                    }}
                  >
                    <span>{p.runsTotal} runs</span>
                    <span
                      style={{
                        color:
                          p.conversionRate > 70
                            ? "var(--badge-success-text)"
                            : "var(--text-tertiary)",
                        fontWeight: 700,
                      }}
                    >
                      {p.conversionRate}% conv.
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <div
          className="content-scroll"
          style={{ overflowY: "auto", padding: "20px 24px" }}
        >
          <header
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
              marginBottom: 18,
            }}
          >
            <div style={{ flex: 1 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--vyne-accent, var(--vyne-purple))",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}
              >
                Trigger
              </span>
              <h2
                style={{
                  margin: "4px 0 10px",
                  fontSize: 22,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                }}
              >
                {selected.name}
              </h2>
              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: 14,
                  color: "var(--text-secondary)",
                }}
              >
                <strong>When:</strong> {selected.trigger}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "var(--text-secondary)",
                }}
              >
                <strong>Goal:</strong> {selected.goal}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleStatus(selected.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "9px 16px",
                borderRadius: 9,
                border: "none",
                background:
                  selected.status === "active"
                    ? "var(--status-warning)"
                    : "var(--vyne-accent, var(--vyne-purple))",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {selected.status === "active" ? (
                <>
                  <Pause size={12} fill="currentColor" /> Pause playbook
                </>
              ) : (
                <>
                  <Play size={12} fill="currentColor" /> Activate playbook
                </>
              )}
            </button>
          </header>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
              marginBottom: 18,
            }}
          >
            <StatTile label="Total runs" value={selected.runsTotal.toString()} />
            <StatTile label="Currently in flight" value={selected.runsActive.toString()} />
            <StatTile
              label="Conversion rate"
              value={`${selected.conversionRate}%`}
              accent={selected.conversionRate > 70 ? "success" : undefined}
            />
          </div>

          <h3
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "var(--text-tertiary)",
              margin: "0 0 12px",
            }}
          >
            Steps
          </h3>
          <ol
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {selected.steps.map((step, idx) => {
              const meta = CHANNEL_META[step.channel];
              return (
                <li
                  key={step.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "28px 1fr 120px 100px",
                    gap: 12,
                    alignItems: "center",
                    padding: 12,
                    borderRadius: 10,
                    border: "1px solid var(--content-border)",
                    background: "var(--content-bg)",
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "var(--content-secondary)",
                      color: "var(--text-secondary)",
                      fontSize: 11,
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {idx + 1}
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {step.label}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 9px",
                      borderRadius: 999,
                      background: `${meta.color}18`,
                      color: meta.color,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      textAlign: "center",
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
                      justifyContent: "flex-end",
                    }}
                  >
                    <Clock size={10} /> {step.delay}
                  </span>
                </li>
              );
            })}
          </ol>

          <footer
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 10,
              background: "var(--alert-purple-bg)",
              border: "1px solid var(--alert-purple-border)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <CheckCircle2 size={16} style={{ color: "var(--vyne-accent, var(--vyne-purple))" }} />
            <span style={{ fontSize: 12, color: "var(--text-primary)" }}>
              Playbooks fire via the Automations engine · see{" "}
              <a
                href="/automations"
                style={{
                  color: "var(--vyne-accent, var(--vyne-purple))",
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                Automations <ChevronRight size={12} />
              </a>
            </span>
          </footer>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "success";
}) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 10,
        border: `1px solid ${accent ? "var(--badge-success-text)" : "var(--content-border)"}`,
        background: accent ? "var(--badge-success-bg)" : "var(--content-bg)",
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
          marginTop: 2,
          letterSpacing: "-0.02em",
          fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
        }}
      >
        {value}
      </div>
    </div>
  );
}
