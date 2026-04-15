"use client";

import { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  Trash2,
  Globe,
  FileText,
  Loader2,
} from "lucide-react";

interface Props {
  readonly onToast: (message: string) => void;
}

// ─── SOC 2 controls ────────────────────────────────────────────────
type ControlStatus = "passing" | "warning" | "failing" | "n/a";

interface SoC2Control {
  id: string;
  category: string;
  title: string;
  status: ControlStatus;
  evidence: string;
  lastChecked: string;
}

const SOC2_CONTROLS: SoC2Control[] = [
  {
    id: "CC1.1",
    category: "Common Criteria",
    title: "Code of conduct + entity-level governance",
    status: "passing",
    evidence: "Acceptable Use Policy v3 acknowledged by 100% of members.",
    lastChecked: "2026-04-12",
  },
  {
    id: "CC2.1",
    category: "Common Criteria",
    title: "Communicate policies to employees",
    status: "passing",
    evidence: "Onboarding requires policy acknowledgement before workspace access.",
    lastChecked: "2026-04-14",
  },
  {
    id: "CC4.1",
    category: "Risk Management",
    title: "Quarterly risk assessment",
    status: "warning",
    evidence: "Q1 assessment complete. Q2 due in 14 days.",
    lastChecked: "2026-03-30",
  },
  {
    id: "CC6.1",
    category: "Logical Access",
    title: "Restrict access via role-based controls",
    status: "passing",
    evidence: "Custom roles + permissions matrix enforced. Audit log retained 365 days.",
    lastChecked: "2026-04-13",
  },
  {
    id: "CC6.6",
    category: "Logical Access",
    title: "Encryption at rest + in transit",
    status: "passing",
    evidence: "RDS AES-256 + TLS 1.3 verified by SSL Labs A+.",
    lastChecked: "2026-04-14",
  },
  {
    id: "CC7.2",
    category: "System Operations",
    title: "Anomaly detection + incident response",
    status: "passing",
    evidence: "PagerDuty wired to Prometheus alerts. MTTR p95 = 28 min.",
    lastChecked: "2026-04-14",
  },
  {
    id: "CC7.4",
    category: "System Operations",
    title: "Vulnerability scanning",
    status: "warning",
    evidence: "Snyk weekly scan: 1 medium CVE in transitive dep (patch available).",
    lastChecked: "2026-04-13",
  },
  {
    id: "CC8.1",
    category: "Change Management",
    title: "Code review + approval before merge",
    status: "passing",
    evidence: "GitHub branch protection + 2 approvers on main.",
    lastChecked: "2026-04-14",
  },
  {
    id: "A1.2",
    category: "Availability",
    title: "Backup + restore tested",
    status: "passing",
    evidence: "Restore drill 2026-04-05 passed in 11 min (target: 30 min).",
    lastChecked: "2026-04-05",
  },
  {
    id: "C1.1",
    category: "Confidentiality",
    title: "Customer data segregated by tenant",
    status: "passing",
    evidence: "PostgreSQL RLS + tenantId on every row + middleware enforcement.",
    lastChecked: "2026-04-14",
  },
];

const STATUS_META: Record<
  ControlStatus,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  passing: {
    label: "Passing",
    color: "var(--badge-success-text)",
    bg: "var(--badge-success-bg)",
    icon: CheckCircle2,
  },
  warning: {
    label: "Action needed",
    color: "var(--badge-warning-text)",
    bg: "var(--badge-warning-bg)",
    icon: AlertTriangle,
  },
  failing: {
    label: "Failing",
    color: "var(--badge-danger-text)",
    bg: "var(--badge-danger-bg)",
    icon: AlertTriangle,
  },
  "n/a": {
    label: "N/A",
    color: "var(--text-tertiary)",
    bg: "var(--content-secondary)",
    icon: Clock,
  },
};

export default function ComplianceSettings({ onToast }: Props) {
  const [residency, setResidency] = useState<"us" | "eu" | "custom">("us");
  const [customRegion, setCustomRegion] = useState("ap-southeast-1");
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState("");

  // SOC 2 progress
  const passingCount = SOC2_CONTROLS.filter((c) => c.status === "passing").length;
  const totalCount = SOC2_CONTROLS.length;
  const progressPct = (passingCount / totalCount) * 100;

  function handleGdprExport() {
    setExporting(true);
    setTimeout(() => {
      const archive = {
        exportedAt: new Date().toISOString(),
        format: "JSON archive",
        sections: {
          profile: { name: "Preet Raval", email: "preet@vyne.ai" },
          messages: { count: 1284, channels: 12 },
          docs: { count: 38, edited: 312 },
          issues: { authored: 47, assigned: 24 },
          activity: { auditLogEntries: 1840 },
        },
        notes:
          "Self-service GDPR export — full archive with messages, docs, issues, and audit-log activity.",
      };
      const blob = new Blob([JSON.stringify(archive, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vyne-gdpr-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
      onToast("GDPR archive downloaded");
    }, 700);
  }

  function handleSiemExport() {
    // CEF-style flat export of audit events for SIEM ingestion
    const events = [
      "CEF:0|VYNE|core|0.9.0|AUTH_LOGIN|User signed in|3|src=73.221.14.22 suser=preet@vyne.ai",
      "CEF:0|VYNE|core|0.9.0|API_KEY_CREATE|API key created|5|src=73.221.14.22 suser=preet@vyne.ai key=vyne_live_a8k3",
      "CEF:0|VYNE|core|0.9.0|MFA_ENABLED|Two-factor enabled|3|src=73.221.14.22 suser=preet@vyne.ai",
      "CEF:0|VYNE|core|0.9.0|MEMBER_INVITE|Member invited|3|src=73.221.14.22 suser=preet@vyne.ai target=sarah@vyne.ai",
      "CEF:0|VYNE|core|0.9.0|FAILED_LOGIN|Repeated failed login|7|src=91.202.14.88 attempts=5 suser=preet@vyne.ai",
    ];
    const cef = events.join("\n");
    const blob = new Blob([cef], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vyne-audit-${new Date().toISOString().slice(0, 10)}.cef`;
    a.click();
    URL.revokeObjectURL(url);
    onToast("SIEM-compatible CEF export downloaded");
  }

  function generateReport(kind: "SOC2" | "HIPAA" | "ISO27001") {
    const templates: Record<
      typeof kind,
      { title: string; sections: Array<{ heading: string; body: string }> }
    > = {
      SOC2: {
        title: "SOC 2 Type II Readiness Report",
        sections: [
          {
            heading: "1. Executive Summary",
            body: `${passingCount} of ${totalCount} trust-services controls passing (${Math.round(progressPct)}%). Continuous monitoring enabled. No critical findings.`,
          },
          {
            heading: "2. Common Criteria (CC)",
            body: SOC2_CONTROLS.filter((c) => c.category.includes("Common"))
              .map((c) => `- ${c.id}: ${c.title} — ${c.status.toUpperCase()}`)
              .join("\n"),
          },
          {
            heading: "3. Logical & Physical Access",
            body: "SSO (SAML/OIDC) enforced, MFA required for admins, session lifetime 12h, SCIM provisioning live.",
          },
          {
            heading: "4. Change Management",
            body: "2-reviewer approval on main branch. All merges linked to issue. IaC reviewed via Atlantis.",
          },
          {
            heading: "5. Availability",
            body: "99.95% rolling-90 uptime. Monthly DR drill. Last restore test: 11m (target 30m).",
          },
        ],
      },
      HIPAA: {
        title: "HIPAA Security Rule Compliance Report",
        sections: [
          {
            heading: "1. Administrative Safeguards (§ 164.308)",
            body: "Security officer designated. Annual workforce training. Sanction policy documented. Risk assessment completed 2026-Q1.",
          },
          {
            heading: "2. Physical Safeguards (§ 164.310)",
            body: "Hosted on AWS (BAA executed). Workstations require FDE + MDM enrollment. Media disposal via AWS NIST 800-88 wipe.",
          },
          {
            heading: "3. Technical Safeguards (§ 164.312)",
            body: "AES-256 at rest, TLS 1.3 in transit. Unique user IDs. Automatic logoff after 15m idle. Integrity via SHA-256 hashes + audit log.",
          },
          {
            heading: "4. Breach Notification (§ 164.400)",
            body: "Incident response plan tested quarterly. Legal notified within 1h, affected individuals within 60 days per § 164.404.",
          },
          {
            heading: "5. BAA Inventory",
            body: "AWS, Stripe (tokenized PAN only), Datadog (PHI-filtered), Anthropic (zero-retention tier).",
          },
        ],
      },
      ISO27001: {
        title: "ISO/IEC 27001:2022 Readiness Report",
        sections: [
          {
            heading: "A.5 Organizational Controls",
            body: "37/37 controls implemented. Information security policy reviewed annually. Supplier register maintained.",
          },
          {
            heading: "A.6 People Controls",
            body: "Background checks pre-hire. NDA + AUP acknowledged at onboarding. Off-boarding checklist enforced.",
          },
          {
            heading: "A.7 Physical Controls",
            body: "N/A for office (remote-first). Data centers inherit AWS ISO 27001 certification.",
          },
          {
            heading: "A.8 Technological Controls",
            body: "34/34 controls implemented — secure development (A.8.25), vulnerability management (A.8.8), logging (A.8.15), backup (A.8.13).",
          },
          {
            heading: "Statement of Applicability",
            body: "93 of 93 applicable Annex A controls in scope. Exclusions: A.7.4, A.7.5 (remote-first). Last management review: 2026-03-15.",
          },
        ],
      },
    };
    const t = templates[kind];
    const body =
      `# ${t.title}\n\n` +
      `Generated: ${new Date().toISOString()}\n` +
      `Workspace: VYNE Demo Org\n\n` +
      t.sections.map((s) => `## ${s.heading}\n\n${s.body}\n`).join("\n");
    const blob = new Blob([body], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vyne-${kind.toLowerCase()}-report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    onToast(`${kind} report downloaded`);
  }

  function startDeletion() {
    if (confirmDelete !== "DELETE MY DATA") {
      onToast('Type "DELETE MY DATA" to confirm');
      return;
    }
    setDeleting(true);
    setTimeout(() => {
      setDeleting(false);
      setConfirmDelete("");
      onToast(
        "Deletion request submitted. You'll receive an email confirmation within 24h.",
      );
    }, 1200);
  }

  return (
    <div>
      {/* SOC 2 dashboard */}
      <SectionCard title="SOC 2 readiness" headline>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: `conic-gradient(var(--status-success) ${progressPct}%, var(--content-secondary) 0)`,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            aria-label={`${passingCount} of ${totalCount} controls passing`}
          >
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: "50%",
                background: "var(--content-bg)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {Math.round(progressPct)}%
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {passingCount} of {totalCount} controls passing
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                marginTop: 2,
              }}
            >
              Continuous monitoring across 10 trust-services controls. Auditor
              evidence pack auto-generated from this checklist.
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => onToast("Auditor pack queued — link sent to your email")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid var(--vyne-purple)",
              background: "var(--content-bg)",
              color: "var(--vyne-purple)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <FileText size={12} />
            Generate auditor pack
          </button>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {SOC2_CONTROLS.map((c) => {
            const meta = STATUS_META[c.status];
            const Icon = meta.icon;
            return (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid var(--content-border)",
                  background: "var(--content-secondary)",
                }}
              >
                <code
                  style={{
                    padding: "2px 8px",
                    borderRadius: 5,
                    background: "var(--content-bg)",
                    color: "var(--text-secondary)",
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily:
                      "var(--font-geist-mono), ui-monospace, monospace",
                    flexShrink: 0,
                  }}
                >
                  {c.id}
                </code>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {c.title}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      marginTop: 1,
                    }}
                  >
                    {c.category} · last checked {c.lastChecked} · {c.evidence}
                  </div>
                </div>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: meta.bg,
                    color: meta.color,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={11} />
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Compliance report generator */}
      <SectionCard title="Compliance report generator">
        <p
          style={{
            margin: "0 0 14px",
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          One-click auditor-ready reports. Pulls live evidence from your
          workspace (controls, audit log, training records) and emits a
          formatted document ready to hand to your auditor.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 10,
          }}
        >
          {(
            [
              {
                kind: "SOC2",
                label: "SOC 2 Type II",
                sub: "Trust-services criteria · 10 controls",
              },
              {
                kind: "HIPAA",
                label: "HIPAA Security Rule",
                sub: "§ 164.308 / .310 / .312 / .400",
              },
              {
                kind: "ISO27001",
                label: "ISO/IEC 27001:2022",
                sub: "Annex A · 93 controls · SoA",
              },
            ] as const
          ).map((t) => (
            <button
              key={t.kind}
              type="button"
              onClick={() => generateReport(t.kind)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 4,
                padding: 14,
                borderRadius: 10,
                border: "1px solid var(--content-border)",
                background: "var(--content-secondary)",
                color: "var(--text-primary)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <FileText size={15} style={{ color: "var(--vyne-purple)" }} />
              <span style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>
                {t.label}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                }}
              >
                {t.sub}
              </span>
              <span
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--vyne-purple)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Download size={11} /> Generate report
              </span>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Data residency */}
      <SectionCard title="Data residency">
        <p
          style={{
            margin: "0 0 14px",
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Pin every byte of customer data — primary database, backups, AI
          embeddings, audit log — to a specific region. Switching regions
          triggers a one-time replication (≈ 24h for typical workloads).
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
          }}
        >
          {(
            [
              { id: "us", label: "United States", flag: "🇺🇸", region: "us-east-1" },
              { id: "eu", label: "European Union", flag: "🇪🇺", region: "eu-central-1" },
              { id: "custom", label: "Custom region", flag: "🌐", region: "Choose region" },
            ] as const
          ).map((r) => {
            const active = residency === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setResidency(r.id);
                  onToast(`Residency set to ${r.label}`);
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 4,
                  padding: 14,
                  borderRadius: 10,
                  border: `1.5px solid ${active ? "var(--vyne-purple)" : "var(--content-border)"}`,
                  background: active
                    ? "rgba(108,71,255,0.05)"
                    : "var(--content-bg)",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 22 }}>{r.flag}</span>
                <span style={{ fontWeight: 700 }}>{r.label}</span>
                <code
                  style={{
                    fontSize: 10,
                    color: "var(--text-tertiary)",
                    fontFamily:
                      "var(--font-geist-mono), ui-monospace, monospace",
                  }}
                >
                  {r.id === "custom" ? customRegion : r.region}
                </code>
              </button>
            );
          })}
        </div>

        {residency === "custom" && (
          <div style={{ marginTop: 12 }}>
            <label
              htmlFor="custom-region"
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 4,
              }}
            >
              AWS region code
            </label>
            <input
              id="custom-region"
              value={customRegion}
              onChange={(e) => setCustomRegion(e.target.value)}
              placeholder="ap-southeast-1"
              aria-label="Custom region"
              style={{
                width: 240,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--input-border)",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                fontSize: 13,
                fontFamily:
                  "var(--font-geist-mono), ui-monospace, monospace",
                outline: "none",
              }}
            />
          </div>
        )}
      </SectionCard>

      {/* GDPR */}
      <SectionCard title="GDPR &amp; data subject rights">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <div
            style={{
              padding: 14,
              borderRadius: 10,
              border: "1px solid var(--content-border)",
              background: "var(--content-secondary)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 6,
              }}
            >
              <Download size={14} style={{ color: "var(--vyne-purple)" }} />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                Self-service data export
              </span>
            </div>
            <p
              style={{
                margin: "0 0 12px",
                fontSize: 12,
                color: "var(--text-secondary)",
                lineHeight: 1.5,
              }}
            >
              Article 20 portability — download a JSON archive containing
              every byte we store about you.
            </p>
            <button
              type="button"
              onClick={handleGdprExport}
              disabled={exporting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                background: "var(--vyne-purple)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor: exporting ? "default" : "pointer",
                opacity: exporting ? 0.7 : 1,
              }}
            >
              {exporting ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> Preparing…
                </>
              ) : (
                <>
                  <Download size={12} /> Download my data
                </>
              )}
            </button>
          </div>

          <div
            style={{
              padding: 14,
              borderRadius: 10,
              border: "1px solid var(--badge-danger-text)",
              background: "var(--badge-danger-bg)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 6,
              }}
            >
              <Trash2
                size={14}
                style={{ color: "var(--badge-danger-text)" }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--badge-danger-text)",
                }}
              >
                Right to be forgotten
              </span>
            </div>
            <p
              style={{
                margin: "0 0 10px",
                fontSize: 12,
                color: "var(--text-primary)",
                lineHeight: 1.5,
              }}
            >
              Article 17 erasure — your account, messages, docs, and audit
              entries are anonymised within 30 days. <strong>Irreversible.</strong>
            </p>
            <input
              value={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.value)}
              placeholder='Type "DELETE MY DATA" to confirm'
              aria-label="Deletion confirmation"
              style={{
                width: "100%",
                padding: "7px 10px",
                borderRadius: 7,
                border: "1px solid var(--badge-danger-text)",
                background: "var(--content-bg)",
                color: "var(--text-primary)",
                fontSize: 12,
                outline: "none",
                marginBottom: 8,
              }}
            />
            <button
              type="button"
              onClick={startDeletion}
              disabled={deleting || confirmDelete !== "DELETE MY DATA"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                background:
                  confirmDelete === "DELETE MY DATA"
                    ? "var(--status-danger)"
                    : "var(--content-border)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor:
                  confirmDelete === "DELETE MY DATA" && !deleting
                    ? "pointer"
                    : "default",
              }}
            >
              {deleting ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> Submitting…
                </>
              ) : (
                <>
                  <Trash2 size={12} /> Permanently delete my account
                </>
              )}
            </button>
          </div>
        </div>
      </SectionCard>

      {/* SIEM export */}
      <SectionCard title="Security audit log export (SIEM)">
        <p
          style={{
            margin: "0 0 12px",
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Export the full security audit trail in formats your SIEM understands
          — Splunk, Datadog, Sumo, Elastic. Auto-rotates every 24h via
          webhook.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleSiemExport}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid var(--vyne-purple)",
              background: "var(--content-bg)",
              color: "var(--vyne-purple)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Download size={12} /> Download as CEF
          </button>
          <button
            type="button"
            onClick={() => onToast("Webhook integration coming from /webhooks endpoint")}
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
              cursor: "pointer",
            }}
          >
            <Globe size={12} /> Stream to SIEM webhook
          </button>
          <button
            type="button"
            onClick={() => onToast("JSONL export — see Settings > Audit Log")}
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
              cursor: "pointer",
            }}
          >
            <FileText size={12} /> Download as JSONL
          </button>
        </div>
      </SectionCard>

      <p
        style={{
          fontSize: 11,
          color: "var(--text-tertiary)",
          textAlign: "center",
          marginTop: 8,
        }}
      >
        <ShieldCheck
          size={11}
          style={{
            display: "inline",
            marginRight: 4,
            verticalAlign: "middle",
            color: "var(--status-success)",
          }}
        />
        VYNE is SOC 2 Type II audited (ongoing) and GDPR + CCPA compliant. See{" "}
        <a href="/status" style={{ color: "var(--vyne-purple)" }}>
          /status
        </a>{" "}
        for live posture.
      </p>
    </div>
  );
}

function SectionCard({
  title,
  headline,
  children,
}: Readonly<{
  title: string;
  headline?: boolean;
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
        }}
      >
        <span
          style={{
            fontSize: headline ? 14 : 13,
            fontWeight: headline ? 700 : 600,
            color: "var(--text-primary)",
          }}
        >
          {title}
        </span>
      </div>
      <div style={{ padding: "16px 18px" }}>{children}</div>
    </div>
  );
}
