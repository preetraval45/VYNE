"use client";

import { useState, useEffect } from "react";
import { codeApi } from "@/lib/api/client";
import type { Deployment, PullRequest, Repository } from "@/types";
import { MOCK_DEPLOYMENTS, MOCK_PRS, MOCK_REPOS } from "@/lib/fixtures/code";
import {
  InlineCodeReview,
  type DiffFile,
} from "@/components/code/InlineCodeReview";

// ── Helpers ───────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function shortSha(sha: string | null | undefined) {
  return sha ? sha.slice(0, 7) : "—";
}

function rateColor(rate: number): string {
  if (rate >= 80) return "var(--status-success)";
  if (rate >= 50) return "var(--status-warning)";
  return "var(--status-danger)";
}

function statusFilterLabel(s: string): string {
  if (s === "all") return "All";
  if (s === "in_progress") return "In Progress";
  if (s === "rolled_back") return "Rolled Back";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function prIconBg(state: PullRequest["state"]): string {
  if (state === "merged") return "#F3F0FF";
  if (state === "open") return "#F0FDF4";
  return "var(--content-secondary)";
}

function prIconSymbol(state: PullRequest["state"]): string {
  if (state === "merged") return "⇌";
  if (state === "open") return "↑";
  return "✕";
}

function prTimeLabel(pr: PullRequest): string {
  if (pr.state === "merged" && pr.mergedAt)
    return `Merged ${timeAgo(pr.mergedAt)}`;
  if (pr.openedAt) return `Opened ${timeAgo(pr.openedAt)}`;
  return "—";
}

function durationLabel(
  startedAt: string,
  completedAt: string | null | undefined,
): string {
  if (completedAt === null || completedAt === undefined) return "—";
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  return `${Math.round(ms / 1000)}s`;
}

// ── Status Badge ──────────────────────────────────────────────────
function DeployBadge({ status }: Readonly<{ status: Deployment["status"] }>) {
  const map: Record<
    string,
    { label: string; bg: string; color: string; dot: string }
  > = {
    success: {
      label: "Success",
      bg: "#F0FDF4",
      color: "var(--badge-success-text)",
      dot: "var(--status-success)",
    },
    failed: {
      label: "Failed",
      bg: "#FEF2F2",
      color: "var(--badge-danger-text)",
      dot: "var(--status-danger)",
    },
    in_progress: {
      label: "In Progress",
      bg: "#EFF6FF",
      color: "#1E40AF",
      dot: "var(--status-info)",
    },
    rolled_back: {
      label: "Rolled Back",
      bg: "#FFF7ED",
      color: "#9A3412",
      dot: "#F97316",
    },
  };
  const s = map[status] ?? map.failed;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 500,
        background: s.bg,
        color: s.color,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: s.dot,
          ...(status === "in_progress"
            ? { animation: "pulse 1.5s infinite" }
            : {}),
        }}
      />
      {s.label}
    </span>
  );
}

function PRBadge({ state }: Readonly<{ state: PullRequest["state"] }>) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    open: { label: "Open", bg: "#F0FDF4", color: "var(--badge-success-text)" },
    merged: { label: "Merged", bg: "#F3F0FF", color: "#5B21B6" },
    closed: { label: "Closed", bg: "#F8F8F8", color: "var(--text-secondary)" },
  };
  const s = map[state] ?? map.closed;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 500,
        background: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
}

function EnvBadge({ env }: Readonly<{ env: string }>) {
  const map: Record<string, { bg: string; color: string }> = {
    production: { bg: "rgba(239,68,68,0.1)", color: "#B91C1C" },
    staging: { bg: "rgba(245,158,11,0.1)", color: "var(--badge-warning-text)" },
    dev: { bg: "rgba(59,130,246,0.1)", color: "#1E40AF" },
  };
  const s = map[env] ?? map.dev;
  return (
    <span
      style={{
        padding: "1px 6px",
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        background: s.bg,
        color: s.color,
      }}
    >
      {env}
    </span>
  );
}

// ── Tab Button ────────────────────────────────────────────────────
function TabBtn({
  label,
  active,
  onClick,
  count,
}: Readonly<{
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}>) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        background: active ? "var(--vyne-purple)" : "transparent",
        color: active ? "#fff" : "var(--text-secondary)",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {label}
      {count !== undefined && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: "1px 5px",
            borderRadius: 10,
            background: active ? "rgba(255,255,255,0.25)" : "var(--content-secondary)",
            color: active ? "#fff" : "var(--text-secondary)",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ── Modal ─────────────────────────────────────────────────────────
function Modal({
  title,
  onClose,
  children,
}: Readonly<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}>) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "var(--content-bg)",
          borderRadius: 12,
          padding: 24,
          width: 480,
          maxWidth: "90vw",
          maxHeight: "85vh",
          overflowY: "auto",
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
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              color: "var(--text-secondary)",
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 500,
          color: "var(--text-secondary)",
          marginBottom: 5,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--content-border)",
  fontSize: 13,
  color: "var(--text-primary)",
  outline: "none",
  boxSizing: "border-box",
};

// ── Overview Tab ──────────────────────────────────────────────────
function OverviewTab({
  deployments,
  prs,
}: Readonly<{ deployments: Deployment[]; prs: PullRequest[] }>) {
  const successCount = deployments.filter((d) => d.status === "success").length;
  const successRate =
    deployments.length > 0
      ? Math.round((successCount / deployments.length) * 100)
      : 0;
  const openPRs = prs.filter((p) => p.state === "open").length;
  const mergedPRs = prs.filter((p) => p.state === "merged").length;

  const services = Array.from(new Set(deployments.map((d) => d.serviceName)));
  const serviceStats = services.map((svc) => {
    const svcDeploys = deployments.filter((d) => d.serviceName === svc);
    const latest = svcDeploys[0];
    const svcSuccess = svcDeploys.filter((d) => d.status === "success").length;
    const rate =
      svcDeploys.length > 0
        ? Math.round((svcSuccess / svcDeploys.length) * 100)
        : 0;
    return { svc, latest, count: svcDeploys.length, rate };
  });

  const successRateColor =
    successRate >= 80 ? "var(--status-success)" : "var(--status-danger)";

  return (
    <div>
      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          {
            label: "Deployments This Week",
            value: String(deployments.length),
            sub: `${successRate}% success rate`,
            subColor: successRateColor,
          },
          {
            label: "Open Pull Requests",
            value: String(openPRs),
            sub: `${mergedPRs} merged this week`,
            subColor: "var(--vyne-purple)",
          },
          {
            label: "Services",
            value: String(services.length),
            sub: "1 currently deploying",
            subColor: "var(--status-info)",
          },
          {
            label: "Incidents",
            value: "1",
            sub: "api-service · active",
            subColor: "var(--status-danger)",
          },
        ].map(({ label, value, sub, subColor }) => (
          <div
            key={label}
            style={{
              background: "var(--table-header-bg)",
              borderRadius: 10,
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                marginBottom: 6,
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
              }}
            >
              {value}
            </div>
            <div style={{ fontSize: 11, marginTop: 4, color: subColor }}>
              {sub}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}
      >
        {/* Recent deployments */}
        <div
          style={{
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid var(--content-border)",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Recent Deployments
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--content-secondary)" }}>
                {[
                  "Service",
                  "Env",
                  "Version",
                  "Status",
                  "Triggered by",
                  "When",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 16px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-tertiary)",
                      textAlign: "left",
                      borderBottom: "1px solid var(--content-border)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deployments.slice(0, 5).map((d) => (
                <tr key={d.id} style={{ borderBottom: "1px solid #F0F0F8" }}>
                  <td
                    style={{
                      padding: "10px 16px",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                    }}
                  >
                    {d.serviceName}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <EnvBadge env={d.environment} />
                  </td>
                  <td
                    style={{
                      padding: "10px 16px",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      fontFamily: "monospace",
                    }}
                  >
                    {d.version ?? "—"}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <DeployBadge status={d.status} />
                  </td>
                  <td
                    style={{
                      padding: "10px 16px",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {d.triggeredBy ?? "—"}
                  </td>
                  <td
                    style={{
                      padding: "10px 16px",
                      fontSize: 12,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {timeAgo(d.startedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Service health */}
        <div
          style={{
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid var(--content-border)",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Service Health
          </div>
          <div style={{ padding: "6px 0" }}>
            {serviceStats.map(({ svc, latest, count, rate }) => (
              <div
                key={svc}
                style={{
                  padding: "10px 18px",
                  borderBottom: "1px solid #F0F0F8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      marginBottom: 2,
                    }}
                  >
                    {svc}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                    {count} deploys · last{" "}
                    {latest ? timeAgo(latest.startedAt) : "—"}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 3,
                  }}
                >
                  {latest && <DeployBadge status={latest.status} />}
                  <div
                    style={{
                      height: 3,
                      width: 72,
                      background: "var(--content-secondary)",
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${rate}%`,
                        background: rateColor(rate),
                        borderRadius: 4,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Deployments Tab ───────────────────────────────────────────────
function DeploymentsTab({
  deployments,
  onDeploy,
}: Readonly<{
  deployments: Deployment[];
  onDeploy: (d: Partial<Deployment>) => void;
}>) {
  const [filter, setFilter] = useState<string>("all");
  const [envFilter, setEnvFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    serviceName: "",
    version: "",
    environment: "production",
    branch: "main",
    commitMessage: "",
  });

  const filtered = deployments.filter((d) => {
    const statusOk = filter === "all" || d.status === filter;
    const envOk = envFilter === "all" || d.environment === envFilter;
    return statusOk && envOk;
  });

  function handleDeploy() {
    if (!form.serviceName) return;
    onDeploy({
      ...form,
      status: "in_progress",
      triggeredBy: "Preet R.",
      startedAt: new Date().toISOString(),
    });
    setShowModal(false);
    setForm({
      serviceName: "",
      version: "",
      environment: "production",
      branch: "main",
      commitMessage: "",
    });
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {["all", "success", "in_progress", "failed", "rolled_back"].map(
            (s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: filter === s ? 600 : 400,
                  background: filter === s ? "var(--vyne-purple)" : "var(--content-secondary)",
                  color: filter === s ? "#fff" : "var(--text-secondary)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {statusFilterLabel(s)}
              </button>
            ),
          )}
          <select aria-label="Select option"
            value={envFilter}
            onChange={(e) => setEnvFilter(e.target.value)}
            style={{
              padding: "4px 10px",
              borderRadius: 20,
              fontSize: 12,
              background: "var(--content-secondary)",
              color: "var(--text-secondary)",
              border: "none",
              cursor: "pointer",
            }}
          >
            <option value="all">All Envs</option>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="dev">Dev</option>
          </select>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: "7px 14px",
            background: "var(--vyne-purple)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          + Deploy
        </button>
      </div>

      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--content-secondary)" }}>
              {[
                "Service",
                "Env",
                "Version",
                "Commit",
                "Status",
                "Triggered",
                "Duration",
                "When",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 16px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-tertiary)",
                    textAlign: "left",
                    borderBottom: "1px solid var(--content-border)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: 32,
                    textAlign: "center",
                    color: "var(--text-tertiary)",
                    fontSize: 13,
                  }}
                >
                  No deployments found
                </td>
              </tr>
            )}
            {filtered.map((d) => (
              <tr key={d.id} style={{ borderBottom: "1px solid #F0F0F8" }}>
                <td
                  style={{
                    padding: "11px 16px",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                  }}
                >
                  {d.serviceName}
                </td>
                <td style={{ padding: "11px 16px" }}>
                  <EnvBadge env={d.environment} />
                </td>
                <td
                  style={{
                    padding: "11px 16px",
                    fontSize: 12,
                    fontFamily: "monospace",
                    color: "var(--text-secondary)",
                  }}
                >
                  {d.version ?? "—"}
                </td>
                <td style={{ padding: "11px 16px" }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontFamily: "monospace",
                      color: "var(--vyne-purple)",
                    }}
                  >
                    {shortSha(d.commitSha)}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      maxWidth: 160,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {d.commitMessage ?? ""}
                  </div>
                </td>
                <td style={{ padding: "11px 16px" }}>
                  <DeployBadge status={d.status} />
                </td>
                <td
                  style={{
                    padding: "11px 16px",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  {d.triggeredBy ?? "—"}
                </td>
                <td
                  style={{
                    padding: "11px 16px",
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                  }}
                >
                  {durationLabel(d.startedAt, d.completedAt)}
                </td>
                <td
                  style={{
                    padding: "11px 16px",
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                  }}
                >
                  {timeAgo(d.startedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="New Deployment" onClose={() => setShowModal(false)}>
          <FormField label="Service Name">
            <input
              style={inputStyle}
              value={form.serviceName}
              onChange={(e) =>
                setForm((f) => ({ ...f, serviceName: e.target.value }))
              }
              placeholder="e.g. api-service"
            />
          </FormField>
          <FormField label="Version">
            <input
              style={inputStyle}
              value={form.version}
              onChange={(e) =>
                setForm((f) => ({ ...f, version: e.target.value }))
              }
              placeholder="e.g. v2.4.2"
            />
          </FormField>
          <FormField label="Environment">
            <select aria-label="Select option"
              style={inputStyle}
              value={form.environment}
              onChange={(e) =>
                setForm((f) => ({ ...f, environment: e.target.value }))
              }
            >
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="dev">Dev</option>
            </select>
          </FormField>
          <FormField label="Branch">
            <input
              style={inputStyle}
              value={form.branch}
              onChange={(e) =>
                setForm((f) => ({ ...f, branch: e.target.value }))
              }
              placeholder="main"
            />
          </FormField>
          <FormField label="Commit Message (optional)">
            <input
              style={inputStyle}
              value={form.commitMessage}
              onChange={(e) =>
                setForm((f) => ({ ...f, commitMessage: e.target.value }))
              }
              placeholder="What's in this deploy?"
            />
          </FormField>
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              marginTop: 8,
            }}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid var(--content-border)",
                background: "var(--content-bg)",
                fontSize: 13,
                cursor: "pointer",
                color: "var(--text-secondary)",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleDeploy}
              disabled={!form.serviceName}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                background: "var(--vyne-purple)",
                color: "#fff",
                border: "none",
                fontSize: 13,
                fontWeight: 500,
                cursor: form.serviceName ? "pointer" : "not-allowed",
                opacity: form.serviceName ? 1 : 0.6,
              }}
            >
              Deploy
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Pull Requests Tab ─────────────────────────────────────────────
function PullRequestsTab({ prs }: Readonly<{ prs: PullRequest[] }>) {
  const [filter, setFilter] = useState<string>("open");
  const [search, setSearch] = useState("");
  const [reviewPr, setReviewPr] = useState<PullRequest | null>(null);

  const filtered = prs.filter((p) => {
    const stateOk = filter === "all" || p.state === filter;
    const searchOk =
      search.length === 0 ||
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.repoName.toLowerCase().includes(search.toLowerCase());
    return stateOk && searchOk;
  });

  const openCount = prs.filter((p) => p.state === "open").length;
  const mergedCount = prs.filter((p) => p.state === "merged").length;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { v: "open", label: `Open (${openCount})` },
            { v: "merged", label: `Merged (${mergedCount})` },
            { v: "all", label: "All" },
          ].map(({ v, label }) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: filter === v ? 600 : 400,
                background: filter === v ? "var(--vyne-purple)" : "var(--content-secondary)",
                color: filter === v ? "#fff" : "var(--text-secondary)",
                border: "none",
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          placeholder="Search pull requests…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid var(--content-border)",
            fontSize: 13,
            color: "var(--text-primary)",
            outline: "none",
            width: 220,
          }}
        />
      </div>

      <div
        style={{
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {filtered.length === 0 && (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: 13,
            }}
          >
            No pull requests found
          </div>
        )}
        {filtered.map((pr, i) => (
          <div
            key={pr.id}
            role="button"
            tabIndex={0}
            onClick={() => setReviewPr(pr)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setReviewPr(pr);
              }
            }}
            style={{
              padding: "12px 18px",
              borderBottom:
                i < filtered.length - 1 ? "1px solid #F0F0F8" : "none",
              display: "flex",
              alignItems: "center",
              gap: 14,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: prIconBg(pr.state),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 12 }}>{prIconSymbol(pr.state)}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 3,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                  }}
                >
                  {pr.title ?? `PR #${pr.prNumber}`}
                </span>
                <PRBadge state={pr.state} />
              </div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                <span
                  style={{
                    color: "var(--vyne-purple)",
                    fontFamily: "monospace",
                  }}
                >
                  {pr.repoName}
                </span>
                {" · "}
                <span style={{ fontFamily: "monospace" }}>
                  {pr.headBranch ?? "—"}
                </span>
                {" → "}
                <span style={{ fontFamily: "monospace" }}>
                  {pr.baseBranch ?? "main"}
                </span>
                {" · "}
                {pr.author ?? "unknown"}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                }}
              >
                #{pr.prNumber}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  marginTop: 2,
                }}
              >
                {prTimeLabel(pr)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {reviewPr && (
        <PRReviewModal pr={reviewPr} onClose={() => setReviewPr(null)} />
      )}
    </div>
  );
}

// ── Repositories Tab ──────────────────────────────────────────────
function RepositoriesTab({ repos }: Readonly<{ repos: Repository[] }>) {
  const [showConnect, setShowConnect] = useState(false);
  const [form, setForm] = useState({
    repoName: "",
    githubUrl: "",
    defaultBranch: "main",
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 14,
        }}
      >
        <button
          onClick={() => setShowConnect(true)}
          style={{
            padding: "7px 14px",
            background: "var(--vyne-purple)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          + Connect Repository
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 12,
        }}
      >
        {repos.map((repo) => (
          <div
            key={repo.id}
            style={{
              background: "var(--content-bg)",
              border: "1px solid var(--content-border)",
              borderRadius: 12,
              padding: "16px 18px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    marginBottom: 2,
                  }}
                >
                  {repo.repoName}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: "monospace",
                    color: "var(--text-tertiary)",
                  }}
                >
                  Branch: {repo.defaultBranch}
                </div>
              </div>
              {repo.lastDeployStatus && (
                <DeployBadge status={repo.lastDeployStatus} />
              )}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 12,
                paddingTop: 10,
                borderTop: "1px solid #F0F0F8",
              }}
            >
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                {repo.lastDeployAt
                  ? `Last deploy ${timeAgo(repo.lastDeployAt)}`
                  : "Never deployed"}
              </div>
              {repo.githubUrl ? (
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--vyne-purple)",
                    fontWeight: 500,
                  }}
                >
                  GitHub ↗
                </span>
              ) : (
                <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  No GitHub URL
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {showConnect && (
        <Modal title="Connect Repository" onClose={() => setShowConnect(false)}>
          <FormField label="Repository Name">
            <input
              style={inputStyle}
              value={form.repoName}
              onChange={(e) =>
                setForm((f) => ({ ...f, repoName: e.target.value }))
              }
              placeholder="e.g. vyne/new-service"
            />
          </FormField>
          <FormField label="GitHub URL (optional)">
            <input
              style={inputStyle}
              value={form.githubUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, githubUrl: e.target.value }))
              }
              placeholder="https://github.com/..."
            />
          </FormField>
          <FormField label="Default Branch">
            <input
              style={inputStyle}
              value={form.defaultBranch}
              onChange={(e) =>
                setForm((f) => ({ ...f, defaultBranch: e.target.value }))
              }
              placeholder="main"
            />
          </FormField>
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              marginTop: 8,
            }}
          >
            <button
              onClick={() => setShowConnect(false)}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid var(--content-border)",
                background: "var(--content-bg)",
                fontSize: 13,
                cursor: "pointer",
                color: "var(--text-secondary)",
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (form.repoName) {
                  try {
                    codeApi.connectRepository({
                      repoName: form.repoName,
                      githubUrl: form.githubUrl || undefined,
                      defaultBranch: form.defaultBranch,
                    });
                  } catch {
                    /* demo mode */
                  }
                  setShowConnect(false);
                  setForm({
                    repoName: "",
                    githubUrl: "",
                    defaultBranch: "main",
                  });
                }
              }}
              disabled={!form.repoName}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                background: "var(--vyne-purple)",
                color: "#fff",
                border: "none",
                fontSize: 13,
                fontWeight: 500,
                cursor: form.repoName ? "pointer" : "not-allowed",
                opacity: form.repoName ? 1 : 0.6,
              }}
            >
              Connect
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Main Code Page ────────────────────────────────────────────────
export default function CodePage() {
  const [tab, setTab] = useState<"overview" | "deployments" | "prs" | "repos">(
    "overview",
  );
  const [deployments, setDeployments] =
    useState<Deployment[]>(MOCK_DEPLOYMENTS);
  const [prs] = useState<PullRequest[]>(MOCK_PRS);
  const [repos] = useState<Repository[]>(MOCK_REPOS);

  useEffect(() => {
    codeApi
      .listDeployments({ limit: 50 })
      .then((res) => {
        if (res.data?.length) setDeployments(res.data);
      })
      .catch(() => {
        /* use mock data */
      });
  }, []);

  function handleDeploy(data: Partial<Deployment>) {
    const newDeploy: Deployment = {
      id: `d-${Date.now()}`,
      orgId: "demo",
      serviceName: data.serviceName ?? "",
      version: data.version ?? null,
      environment: data.environment ?? "production",
      status: "in_progress",
      triggeredBy: data.triggeredBy ?? "Preet R.",
      commitSha: null,
      commitMessage: data.commitMessage ?? null,
      branch: data.branch ?? "main",
      startedAt: new Date().toISOString(),
      completedAt: null,
      metadata: {},
    };
    setDeployments((prev) => [newDeploy, ...prev]);
    try {
      codeApi.createDeployment({
        serviceName: newDeploy.serviceName,
        version: newDeploy.version ?? undefined,
        environment: newDeploy.environment,
        branch: newDeploy.branch ?? undefined,
        commitMessage: newDeploy.commitMessage ?? undefined,
        triggeredBy: newDeploy.triggeredBy ?? undefined,
      });
    } catch {
      /* demo mode */
    }
  }

  const openPRs = prs.filter((p) => p.state === "open").length;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--content-bg)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--content-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Code & DevOps
          </h1>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              margin: "2px 0 0",
            }}
          >
            Deployments, pull requests, and repository management
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 8px",
              borderRadius: 6,
              background: "rgba(239,68,68,0.1)",
              color: "#B91C1C",
            }}
          >
            1 incident active
          </span>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            {openPRs} open PRs ·{" "}
            {deployments.filter((d) => d.status === "in_progress").length}{" "}
            deploying
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          padding: "10px 24px",
          borderBottom: "1px solid var(--content-border)",
          display: "flex",
          gap: 4,
          flexShrink: 0,
        }}
      >
        <TabBtn
          label="Overview"
          active={tab === "overview"}
          onClick={() => setTab("overview")}
        />
        <TabBtn
          label="Deployments"
          active={tab === "deployments"}
          onClick={() => setTab("deployments")}
          count={deployments.length}
        />
        <TabBtn
          label="Pull Requests"
          active={tab === "prs"}
          onClick={() => setTab("prs")}
          count={openPRs}
        />
        <TabBtn
          label="Repositories"
          active={tab === "repos"}
          onClick={() => setTab("repos")}
          count={repos.length}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {tab === "overview" && (
          <OverviewTab deployments={deployments} prs={prs} />
        )}
        {tab === "deployments" && (
          <DeploymentsTab deployments={deployments} onDeploy={handleDeploy} />
        )}
        {tab === "prs" && <PullRequestsTab prs={prs} />}
        {tab === "repos" && <RepositoriesTab repos={repos} />}
      </div>
    </div>
  );
}

// ── PR review modal (inline code review with @mentions) ───────────
function demoDiffFor(pr: PullRequest): DiffFile[] {
  return [
    {
      path: `${pr.repoName.split("/").pop() ?? "src"}/lib/auth.ts`,
      lines: [
        { kind: "hunk", content: `@@ -42,7 +42,9 @@ export async function signIn(...)` },
        { kind: "ctx", old: 42, new: 42, content: "  const user = await db.user.findUnique({ where: { email } });" },
        { kind: "ctx", old: 43, new: 43, content: "  if (!user) throw new AuthError('no-such-user');" },
        { kind: "del", old: 44, content: "  const ok = await bcrypt.compare(pw, user.hash);" },
        { kind: "add", new: 44, content: "  const ok = await argon2.verify(user.hash, pw);" },
        { kind: "add", new: 45, content: "  await auditLog.record({ kind: 'signin', userId: user.id });" },
        { kind: "ctx", old: 45, new: 46, content: "  if (!ok) throw new AuthError('bad-credentials');" },
        { kind: "ctx", old: 46, new: 47, content: "  return issueSession(user);" },
        { kind: "ctx", old: 47, new: 48, content: "}" },
      ],
    },
    {
      path: `${pr.repoName.split("/").pop() ?? "src"}/lib/audit.ts`,
      lines: [
        { kind: "hunk", content: `@@ -0,0 +1,12 @@ new file` },
        { kind: "add", new: 1, content: "import { db } from './db';" },
        { kind: "add", new: 2, content: "" },
        { kind: "add", new: 3, content: "export const auditLog = {" },
        { kind: "add", new: 4, content: "  async record(event: { kind: string; userId: string }) {" },
        { kind: "add", new: 5, content: "    await db.auditLog.create({ data: { ...event, at: new Date() } });" },
        { kind: "add", new: 6, content: "  }," },
        { kind: "add", new: 7, content: "};" },
      ],
    },
  ];
}

function PRReviewModal({
  pr,
  onClose,
}: Readonly<{ pr: PullRequest; onClose: () => void }>) {
  const files = demoDiffFor(pr);
  return (
    <div
      role="dialog"
      aria-label={`Review ${pr.title ?? `PR #${pr.prNumber}`}`}
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 960,
          maxHeight: "90vh",
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 14,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <header
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--content-border)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              padding: "2px 10px",
              borderRadius: 999,
              background: "var(--badge-success-bg)",
              color: "var(--badge-success-text)",
              fontSize: 10.5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}
          >
            {pr.state}
          </span>
          <h2
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 700,
              color: "var(--text-primary)",
              flex: 1,
              minWidth: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {pr.title ?? `PR #${pr.prNumber}`}
          </h2>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
            }}
          >
            {pr.repoName} · #{pr.prNumber}
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              border: "1px solid var(--content-border)",
              borderRadius: 6,
              background: "var(--content-bg)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </header>
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 18,
            background: "var(--content-secondary)",
          }}
        >
          <InlineCodeReview subjectId={`pr:${pr.id}`} files={files} />
        </div>
      </div>
    </div>
  );
}
