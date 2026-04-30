"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, MessageSquare, Briefcase, Calendar, User, Users as UsersIcon, Sparkles } from "lucide-react";
import { EMPLOYEES } from "@/lib/fixtures/hr";
import { computeAccrual } from "@/lib/hrAccrual";
import toast from "react-hot-toast";

export default function EmployeeDetailPage() {
  const params = useParams<{ employeeId: string }>();
  const employeeId = params?.employeeId as string;

  const emp = EMPLOYEES.find((e) => e.id === employeeId);

  if (!emp) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 16 }}>
          Employee not found.
        </p>
        <Link
          href="/hr"
          style={{
            display: "inline-block",
            padding: "8px 14px",
            borderRadius: 8,
            background: "var(--vyne-accent, var(--vyne-purple))",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Back to HR
        </Link>
      </div>
    );
  }

  const statusColor: Record<string, { bg: string; color: string }> = {
    Active: { bg: "rgba(34,197,94,0.12)", color: "var(--status-success)" },
    Remote: { bg: "rgba(59,130,246,0.12)", color: "var(--status-info)" },
    "On Leave": { bg: "rgba(245,158,11,0.12)", color: "var(--status-warning)" },
  };
  const sc = statusColor[emp.status] ?? statusColor.Active;

  const reports = EMPLOYEES.filter((e) => e.reportsTo === emp.name);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--content-bg-secondary)" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "var(--content-bg)",
          borderBottom: "1px solid var(--content-border)",
          padding: "16px 28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10 }}>
          <Link href="/hr" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--text-secondary)" }}>
            <ArrowLeft size={13} /> Back
          </Link>
          <span style={{ width: 1, height: 12, background: "var(--content-border)", margin: "0 6px" }} />
          <Link href="/hr" style={{ color: "var(--text-secondary)" }}>HR</Link>
          <span style={{ margin: "0 4px" }}>›</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{emp.name}</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div
            aria-hidden="true"
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: emp.avatarGradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              flexShrink: 0,
            }}
          >
            {emp.initials}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)", lineHeight: 1.2, marginBottom: 4 }}>
              {emp.name}
            </h1>
            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 8 }}>
              {emp.title} · {emp.department}
            </p>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "3px 10px",
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: 600,
                background: sc.bg,
                color: sc.color,
              }}
            >
              {emp.status}
              {emp.leaveNote && (
                <span style={{ marginLeft: 6, color: "var(--text-tertiary)", fontWeight: 400 }}>· {emp.leaveNote}</span>
              )}
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto content-scroll" style={{ padding: 28 }}>
        <div className="two-pane-layout" style={{ maxWidth: 960, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>
          <div>
            <Section title="Contact">
              <InfoRow icon={<Mail size={14} />} label="Email" value={emp.email} />
              <InfoRow icon={<Phone size={14} />} label="Phone" value={emp.phone} />
              <InfoRow icon={<MessageSquare size={14} />} label="Slack" value={emp.slack} />
            </Section>

            <Section title="Role">
              <InfoRow icon={<Briefcase size={14} />} label="Title" value={emp.title} />
              <InfoRow icon={<UsersIcon size={14} />} label="Department" value={emp.department} />
              <InfoRow icon={<User size={14} />} label="Reports to" value={emp.reportsTo} />
              <InfoRow icon={<Calendar size={14} />} label="Joined" value={emp.joined} />
            </Section>

            <Section title="Compensation">
              <InfoRow label="Base salary" value={`$${emp.baseSalary.toLocaleString()}`} />
              <InfoRow label="Hours this month" value={`${emp.hoursThisMonth} h`} />
              <InfoRow label="Bonus" value={`$${emp.bonus.toLocaleString()}`} />
              <InfoRow label="Deductions" value={`$${emp.deductions.toLocaleString()}`} />
            </Section>

            <Section title="Leave balance">
              <InfoRow label="Vacation" value={`${emp.vacationBalance} days`} />
              <InfoRow label="Sick" value={`${emp.sickBalance} days`} />
              <InfoRow label="Personal" value={`${emp.personalBalance} days`} />
              <InfoRow label="Used this year" value={`${emp.usedLeaveThisYear} days`} />
            </Section>

            {(() => {
              const acc = computeAccrual(emp.joined);
              const ytdPct = Math.round(acc.ytdFraction * 100);
              return (
                <Section title={`Accrual · ${acc.tenureYears}y tenure`}>
                  <InfoRow
                    label={`Vacation (${acc.vacationAnnual}/yr)`}
                    value={`${acc.vacationAccruedYTD} accrued · ${Math.max(0, acc.vacationAccruedYTD - emp.usedLeaveThisYear).toFixed(1)} available`}
                  />
                  <InfoRow label="Sick (5/yr)" value={`${acc.sickAccruedYTD} accrued`} />
                  <InfoRow label="Personal (3/yr)" value={`${acc.personalAccruedYTD} accrued`} />
                  <InfoRow label="Year progress" value={`${ytdPct}%`} />
                </Section>
              );
            })()}

            <OneOnOnePrepCard employee={emp} />
          </div>

          <aside style={{ position: "sticky", top: 24 }}>
            {reports.length > 0 ? (
              <div
                style={{
                  background: "var(--content-bg)",
                  border: "1px solid var(--content-border)",
                  borderRadius: 14,
                  padding: 20,
                }}
              >
                <h3
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 12,
                  }}
                >
                  Direct reports ({reports.length})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {reports.map((r) => (
                    <Link
                      key={r.id}
                      href={`/hr/employees/${r.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "7px 10px",
                        borderRadius: 8,
                        background: "var(--content-secondary)",
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: r.avatarGradient,
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {r.initials}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "var(--text-primary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.name}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                          {r.title}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: "var(--content-bg)",
                  border: "1px solid var(--content-border)",
                  borderRadius: 14,
                  padding: 20,
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  No direct reports
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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
      <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16, letterSpacing: "-0.01em" }}>
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
    </section>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div
        style={{
          width: 110,
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          fontWeight: 500,
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          flexShrink: 0,
        }}
      >
        {icon}
        {label}
      </div>
      <div style={{ fontSize: 13.5, color: "var(--text-primary)", letterSpacing: "-0.005em" }}>
        {value}
      </div>
    </div>
  );
}

// ── AI 1:1 prep ─────────────────────────────────────────────────
// Generates 5 talking points for a manager check-in. Cached per
// (employee, day) in localStorage so it doesn't re-call AI on every
// visit during the same day.

interface OneOnOneEmp {
  id: string;
  name: string;
  title: string;
  department: string;
  joined: string;
  status: string;
}

function OneOnOnePrepCard({ employee }: { employee: OneOnOneEmp }) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    const cacheKey = `vyne-1on1-${employee.id}-${new Date().toISOString().slice(0, 10)}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setText(cached);
        return;
      }
    } catch {
      /* ignore */
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question:
            "Generate 5 concrete talking points for a 1:1 manager check-in. Mix recent wins, blockers, growth questions. Return as a markdown numbered list. Tight, specific to the employee, no fluff.",
          context: { employee },
        }),
      });
      const body = (await res.json()) as { answer?: string };
      const ans = (body.answer ?? "").trim();
      if (!ans) {
        toast.error("AI returned empty.");
        return;
      }
      setText(ans);
      try {
        localStorage.setItem(cacheKey, ans);
      } catch {
        /* ignore */
      }
    } catch (err) {
      toast.error("Couldn't reach AI: " + (err instanceof Error ? err.message : "unknown"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      style={{
        background: "var(--vyne-accent-soft, var(--content-secondary))",
        border: "1px solid var(--vyne-accent-ring, var(--content-border))",
        borderRadius: 14,
        padding: 18,
        marginTop: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            background: "var(--vyne-accent, #5B5BD6)",
            color: "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Sparkles size={13} />
        </span>
        <h2
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          AI 1:1 prep
        </h2>
      </div>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-secondary)" }}>
        Talking points tailored to {employee.name.split(" ")[0]} for your next check-in.
      </p>
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        aria-busy={loading}
        style={{
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 8,
          border: "1px solid var(--vyne-accent-ring, var(--content-border))",
          background: "var(--content-bg)",
          color: "var(--vyne-accent-deep, var(--text-primary))",
          cursor: loading ? "wait" : "pointer",
        }}
      >
        {loading ? "Generating…" : text ? "Regenerate" : "Generate talking points"}
      </button>
      {text && (
        <div
          style={{
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 10,
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            fontSize: 13,
            lineHeight: 1.6,
            color: "var(--text-secondary)",
            whiteSpace: "pre-wrap",
          }}
        >
          {text}
        </div>
      )}
    </section>
  );
}
