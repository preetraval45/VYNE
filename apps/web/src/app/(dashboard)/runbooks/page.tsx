"use client";

import { useMemo, useState } from "react";
import {
  ShieldAlert,
  Play,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Database,
  Server,
  Globe,
  Lock,
  RotateCcw,
  FileCheck,
  ChevronRight,
  Zap,
} from "lucide-react";

type StepStatus = "pending" | "running" | "ok" | "failed" | "skipped";

interface RunbookStep {
  id: string;
  title: string;
  detail: string;
  estSeconds: number;
  automated: boolean;
}

interface Runbook {
  id: string;
  title: string;
  scenario: string;
  severity: "critical" | "warning" | "info";
  icon: typeof ShieldAlert;
  rto: string;
  rpo: string;
  lastDrill: string;
  steps: RunbookStep[];
}

const RUNBOOKS: Runbook[] = [
  {
    id: "db-primary-down",
    title: "Primary database is down",
    scenario:
      "RDS primary instance unreachable for >2 min. Promote standby, repoint writers, notify status page.",
    severity: "critical",
    icon: Database,
    rto: "< 8 min",
    rpo: "< 30 s",
    lastDrill: "2026-03-28",
    steps: [
      {
        id: "confirm",
        title: "Confirm primary is truly unreachable",
        detail: "Run probe from 3 regions; check CloudWatch for instance health.",
        estSeconds: 40,
        automated: true,
      },
      {
        id: "freeze-writes",
        title: "Freeze background writers + queue workers",
        detail: "Set feature flag db.write_freeze=true; drain SQS consumers.",
        estSeconds: 30,
        automated: true,
      },
      {
        id: "promote",
        title: "Promote read replica to primary",
        detail: "aws rds promote-read-replica --db-instance-identifier prod-ro-1",
        estSeconds: 120,
        automated: true,
      },
      {
        id: "repoint",
        title: "Repoint writer DNS to new primary",
        detail: "Update Route53 weighted CNAME; TTL is 15s.",
        estSeconds: 30,
        automated: true,
      },
      {
        id: "thaw",
        title: "Thaw writes + resume workers",
        detail: "Flip db.write_freeze=false. Monitor error budget for 10 min.",
        estSeconds: 60,
        automated: true,
      },
      {
        id: "status",
        title: "Post status page update + notify on-call",
        detail: "statuspage.io incident `db-failover-*`; page the platform lead.",
        estSeconds: 60,
        automated: false,
      },
    ],
  },
  {
    id: "region-outage",
    title: "Full region outage (us-east-1)",
    scenario:
      "AWS us-east-1 degraded. Fail over to us-west-2 hot standby. Customer-visible, all traffic affected.",
    severity: "critical",
    icon: Globe,
    rto: "< 15 min",
    rpo: "< 2 min",
    lastDrill: "2026-02-14",
    steps: [
      {
        id: "health",
        title: "Verify standby region health",
        detail: "Smoke-test us-west-2 read/write path against canary account.",
        estSeconds: 120,
        automated: true,
      },
      {
        id: "dns",
        title: "Shift global DNS to us-west-2",
        detail: "Flip Route53 weighted policy 100 → us-west-2.",
        estSeconds: 40,
        automated: true,
      },
      {
        id: "cdn",
        title: "Purge CDN cache for region-stale assets",
        detail: "cloudflare purge --tag=region-us-east-1",
        estSeconds: 60,
        automated: true,
      },
      {
        id: "verify",
        title: "Run post-failover verification suite",
        detail: "Playwright smoke run across 12 key flows.",
        estSeconds: 240,
        automated: true,
      },
      {
        id: "comms",
        title: "Publish incident comms",
        detail: "Post on status page, email tier-1 customers, tweet @vynestatus.",
        estSeconds: 300,
        automated: false,
      },
    ],
  },
  {
    id: "ransomware",
    title: "Suspected ransomware / data encryption event",
    scenario:
      "SIEM alert indicates mass-encrypt behavior. Isolate affected compute, rotate secrets, restore from clean snapshot.",
    severity: "critical",
    icon: Lock,
    rto: "< 2 hr",
    rpo: "< 15 min",
    lastDrill: "2026-01-22",
    steps: [
      {
        id: "isolate",
        title: "Isolate affected workloads",
        detail: "Apply deny-all security group to suspicious ASGs.",
        estSeconds: 60,
        automated: true,
      },
      {
        id: "rotate",
        title: "Rotate all service + DB credentials",
        detail: "Trigger SecretsManager rotation for all prod secrets.",
        estSeconds: 300,
        automated: true,
      },
      {
        id: "snapshot",
        title: "Identify last clean snapshot",
        detail:
          "Cross-reference snapshot timestamps against first suspicious IAM action.",
        estSeconds: 600,
        automated: false,
      },
      {
        id: "restore",
        title: "Restore DB from clean snapshot to new VPC",
        detail:
          "Restore into an isolated VPC for forensic comparison before cutover.",
        estSeconds: 1800,
        automated: true,
      },
      {
        id: "notify",
        title: "Notify legal + GRC + affected customers",
        detail:
          "Legal owns 72-hr GDPR clock. GRC files SOC 2 incident. Customer notice per DPA.",
        estSeconds: 1800,
        automated: false,
      },
    ],
  },
  {
    id: "cert-expiry",
    title: "TLS cert expiring in <24 h",
    scenario:
      "Cert-manager failed renewal. Manually renew + deploy before expiry to avoid customer outage.",
    severity: "warning",
    icon: AlertTriangle,
    rto: "< 1 hr",
    rpo: "n/a",
    lastDrill: "2026-03-10",
    steps: [
      {
        id: "which",
        title: "Identify which cert(s) are expiring",
        detail: "Query Prometheus cert_manager_certificate_expiration_timestamp.",
        estSeconds: 30,
        automated: true,
      },
      {
        id: "renew",
        title: "Trigger manual renewal",
        detail: "kubectl cert-manager renew <cert> -n <namespace>",
        estSeconds: 120,
        automated: true,
      },
      {
        id: "verify",
        title: "Verify new cert is serving on edge",
        detail: "openssl s_client -connect api.vyne.dev:443 -servername api.vyne.dev",
        estSeconds: 30,
        automated: true,
      },
    ],
  },
];

const SEVERITY_META: Record<
  Runbook["severity"],
  { label: string; fg: string; bg: string }
> = {
  critical: {
    label: "Critical",
    fg: "var(--badge-danger-text)",
    bg: "var(--badge-danger-bg)",
  },
  warning: {
    label: "Warning",
    fg: "var(--badge-warning-text)",
    bg: "var(--badge-warning-bg)",
  },
  info: {
    label: "Info",
    fg: "var(--badge-info-text)",
    bg: "var(--badge-info-bg)",
  },
};

export default function RunbooksPage() {
  const [activeId, setActiveId] = useState(RUNBOOKS[0].id);
  const [runs, setRuns] = useState<
    Record<string, Record<string, StepStatus>>
  >({});
  const [running, setRunning] = useState(false);

  const active = RUNBOOKS.find((r) => r.id === activeId)!;
  const runState = runs[activeId] ?? {};

  const totalSec = useMemo(
    () => active.steps.reduce((s, x) => s + x.estSeconds, 0),
    [active],
  );

  function setStep(stepId: string, status: StepStatus) {
    setRuns((prev) => ({
      ...prev,
      [activeId]: { ...(prev[activeId] ?? {}), [stepId]: status },
    }));
  }

  async function simulateRun() {
    setRunning(true);
    for (const s of active.steps) {
      if (!s.automated) {
        setStep(s.id, "skipped");
        continue;
      }
      setStep(s.id, "running");
      await new Promise((r) => setTimeout(r, 600));
      setStep(s.id, "ok");
    }
    setRunning(false);
  }

  function resetRun() {
    setRuns((prev) => ({ ...prev, [activeId]: {} }));
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <aside
        style={{
          width: 320,
          flexShrink: 0,
          borderRight: "1px solid var(--content-border)",
          display: "flex",
          flexDirection: "column",
          background: "var(--content-bg)",
        }}
      >
        <header
          style={{
            padding: "18px 18px 14px",
            borderBottom: "1px solid var(--content-border)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 3,
            }}
          >
            <ShieldAlert size={17} style={{ color: "var(--vyne-purple)" }} />
            <h1
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              DR runbooks
            </h1>
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--text-tertiary)",
              lineHeight: 1.5,
            }}
          >
            Automated recovery playbooks. Every step is owned, timed, and
            regularly drilled.
          </div>
        </header>
        <ul
          style={{
            listStyle: "none",
            padding: 8,
            margin: 0,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {RUNBOOKS.map((r) => {
            const Icon = r.icon;
            const isActive = r.id === activeId;
            const meta = SEVERITY_META[r.severity];
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(r.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid transparent",
                    background: isActive
                      ? "var(--content-secondary)"
                      : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      display: "grid",
                      placeItems: "center",
                      background: meta.bg,
                      color: meta.fg,
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {r.title}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                        marginTop: 2,
                      }}
                    >
                      RTO {r.rto} · RPO {r.rpo}
                    </div>
                  </div>
                  {isActive && (
                    <ChevronRight
                      size={14}
                      style={{ color: "var(--text-tertiary)", marginTop: 6 }}
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 32px 48px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 260 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontSize: 10.5,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: SEVERITY_META[active.severity].bg,
                  color: SEVERITY_META[active.severity].fg,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}
              >
                {SEVERITY_META[active.severity].label}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <FileCheck size={12} /> Last drill {active.lastDrill}
              </span>
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {active.title}
            </h2>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 13,
                color: "var(--text-tertiary)",
                lineHeight: 1.55,
              }}
            >
              {active.scenario}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={resetRun}
              disabled={running}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid var(--content-border)",
                background: "var(--content-bg)",
                color: "var(--text-secondary)",
                fontSize: 12,
                fontWeight: 600,
                cursor: running ? "not-allowed" : "pointer",
                opacity: running ? 0.6 : 1,
              }}
            >
              <RotateCcw size={13} /> Reset
            </button>
            <button
              type="button"
              onClick={simulateRun}
              disabled={running}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: "var(--vyne-purple)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor: running ? "not-allowed" : "pointer",
                opacity: running ? 0.7 : 1,
              }}
            >
              <Play size={12} fill="currentColor" />
              {running ? "Running…" : "Run drill"}
            </button>
          </div>
        </header>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Fact icon={<Clock size={13} />} label="RTO" value={active.rto} />
          <Fact
            icon={<Database size={13} />}
            label="RPO"
            value={active.rpo}
          />
          <Fact
            icon={<Zap size={13} />}
            label="Auto steps"
            value={`${active.steps.filter((s) => s.automated).length} / ${active.steps.length}`}
          />
          <Fact
            icon={<Server size={13} />}
            label="Est. runtime"
            value={`~${Math.round(totalSec / 60)}m`}
          />
        </div>

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
          {active.steps.map((s, i) => {
            const status = runState[s.id] ?? "pending";
            return (
              <li
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: 14,
                  borderRadius: 10,
                  border: "1px solid var(--content-border)",
                  background:
                    status === "running"
                      ? "var(--content-secondary)"
                      : "var(--content-bg)",
                }}
              >
                <StatusDot status={status} index={i + 1} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {s.title}
                    </span>
                    <span
                      style={{
                        fontSize: 10.5,
                        padding: "1px 7px",
                        borderRadius: 999,
                        background: s.automated
                          ? "var(--badge-success-bg)"
                          : "var(--badge-warning-bg)",
                        color: s.automated
                          ? "var(--badge-success-text)"
                          : "var(--badge-warning-text)",
                        fontWeight: 600,
                      }}
                    >
                      {s.automated ? "Automated" : "Manual"}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                      }}
                    >
                      ~{Math.round(s.estSeconds / 60) || 1}m
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-tertiary)",
                      marginTop: 4,
                      lineHeight: 1.5,
                      fontFamily: s.detail.includes(" ")
                        ? "inherit"
                        : "var(--font-geist-mono), ui-monospace, monospace",
                    }}
                  >
                    {s.detail}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: "8px 14px",
        borderRadius: 10,
        border: "1px solid var(--content-border)",
        background: "var(--content-bg)",
        display: "inline-flex",
        flexDirection: "column",
        gap: 2,
        minWidth: 100,
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          color: "var(--text-tertiary)",
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <span style={{ color: "var(--vyne-purple)" }}>{icon}</span>
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "var(--text-primary)",
          fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StatusDot({ status, index }: { status: StepStatus; index: number }) {
  if (status === "ok")
    return (
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          display: "grid",
          placeItems: "center",
          background: "var(--badge-success-bg)",
          color: "var(--badge-success-text)",
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        <CheckCircle2 size={15} />
      </div>
    );
  if (status === "running")
    return (
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          display: "grid",
          placeItems: "center",
          background: "var(--badge-info-bg)",
          color: "var(--badge-info-text)",
          flexShrink: 0,
          marginTop: 2,
          animation: "pulse 1.4s ease-in-out infinite",
        }}
      >
        <Zap size={15} />
      </div>
    );
  if (status === "skipped")
    return (
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          display: "grid",
          placeItems: "center",
          background: "var(--badge-warning-bg)",
          color: "var(--badge-warning-text)",
          flexShrink: 0,
          marginTop: 2,
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        M
      </div>
    );
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        background: "var(--content-secondary)",
        color: "var(--text-tertiary)",
        flexShrink: 0,
        marginTop: 2,
        fontSize: 12,
        fontWeight: 700,
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
      }}
    >
      {index}
    </div>
  );
}
