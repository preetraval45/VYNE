"use client";

import { CheckCircle2, AlertTriangle, Clock, MinusCircle } from "lucide-react";

interface Deploy {
  serviceName: string;
  environment: string;
  status: string;
  version: string | null;
  startedAt: string;
}

interface Props {
  deploys: Deploy[];
}

const ENVS: Array<{ id: string; label: string }> = [
  { id: "production", label: "Production" },
  { id: "preview", label: "Preview" },
  { id: "development", label: "Dev" },
];

/**
 * Services × Environments grid showing what version is currently
 * deployed where. Pulls the latest deploy per (service, env) tuple
 * from the deploy list. Click a cell to navigate to the deploy detail.
 *
 * Cell colour encodes the latest status: green = success, red =
 * failed, blue = in progress, dim = no deploy yet.
 */
export function EnvMatrix({ deploys }: Props) {
  const services = Array.from(new Set(deploys.map((d) => d.serviceName))).sort();
  if (services.length === 0) return null;

  const cellFor = (svc: string, env: string) => {
    const matches = deploys
      .filter((d) => d.serviceName === svc && d.environment === env)
      .sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      );
    return matches[0] ?? null;
  };

  return (
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
          padding: "12px 16px",
          borderBottom: "1px solid var(--content-border)",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
      >
        Environment matrix
      </div>
      <div
        role="table"
        aria-label="Service environment matrix"
        style={{
          display: "grid",
          gridTemplateColumns: `minmax(140px, 1.4fr) repeat(${ENVS.length}, 1fr)`,
        }}
      >
        <div style={cellHead}></div>
        {ENVS.map((e) => (
          <div key={e.id} style={cellHead}>
            {e.label}
          </div>
        ))}
        {services.map((svc) => (
          <div key={svc} style={{ display: "contents" }}>
            <div
              style={{
                ...cellRow,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              {svc}
            </div>
            {ENVS.map((env) => {
              const d = cellFor(svc, env.id);
              return (
                <div key={env.id} style={cellRow}>
                  <StatusCell deploy={d} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusCell({ deploy }: { deploy: Deploy | null }) {
  if (!deploy)
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          color: "var(--text-tertiary)",
          fontSize: 11,
        }}
      >
        <MinusCircle size={12} />
        none
      </span>
    );
  let Icon = CheckCircle2;
  let color = "var(--status-success, #16a34a)";
  if (deploy.status === "failed") {
    Icon = AlertTriangle;
    color = "var(--status-danger, #dc2626)";
  } else if (deploy.status === "in_progress" || deploy.status === "queued") {
    Icon = Clock;
    color = "var(--status-info, #2563eb)";
  }
  return (
    <span
      title={`${deploy.status} · ${deploy.version ?? "—"}`}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, color }}
    >
      <Icon size={13} />
      <span
        style={{
          fontFamily: "var(--font-geist-mono, ui-monospace, monospace)",
          fontSize: 11,
          color: "var(--text-primary)",
        }}
      >
        {deploy.version ?? "—"}
      </span>
    </span>
  );
}

const cellHead: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--text-tertiary)",
  background: "var(--content-secondary)",
  borderBottom: "1px solid var(--content-border)",
  fontWeight: 600,
};

const cellRow: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 12,
  color: "var(--text-secondary)",
  borderBottom: "1px solid var(--content-border)",
};
