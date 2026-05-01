"use client";

import type { ReactNode } from "react";
import { Zap, Filter, ArrowDown, CheckCircle2 } from "lucide-react";
import type { Automation, Condition } from "./types";
import { getTriggerLabel } from "./types";

interface Props {
  automation: Automation;
}

function NodeShell({
  variant,
  icon,
  title,
  body,
  meta,
}: {
  variant: "trigger" | "condition" | "action" | "end";
  icon: ReactNode;
  title: string;
  body?: ReactNode;
  meta?: ReactNode;
}) {
  const palette = {
    trigger: { fg: "#1E40AF", bg: "rgba(37,99,235,0.10)", ring: "rgba(37,99,235,0.32)" },
    condition: { fg: "#C2410C", bg: "rgba(217,119,6,0.10)", ring: "rgba(217,119,6,0.32)" },
    action: { fg: "var(--vyne-accent, var(--vyne-purple))", bg: "rgba(108,71,255,0.10)", ring: "rgba(108,71,255,0.32)" },
    end: { fg: "#0F9D58", bg: "rgba(15,157,88,0.10)", ring: "rgba(15,157,88,0.32)" },
  }[variant];
  return (
    <div
      style={{
        width: 320,
        maxWidth: "100%",
        padding: "12px 14px",
        borderRadius: 12,
        background: "var(--content-bg)",
        border: `1px solid ${palette.ring}`,
        boxShadow: "0 1px 3px rgba(16,24,40,0.06)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: body ? 6 : 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              background: palette.bg,
              color: palette.fg,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.005em",
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>
        </div>
        {meta && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: palette.fg,
              padding: "2px 6px",
              borderRadius: 4,
              background: palette.bg,
              flexShrink: 0,
            }}
          >
            {meta}
          </span>
        )}
      </header>
      {body && (
        <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{body}</div>
      )}
    </div>
  );
}

function Connector() {
  return (
    <div
      aria-hidden="true"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        margin: "2px 0",
      }}
    >
      <div style={{ width: 1, height: 14, background: "var(--content-border)" }} />
      <ArrowDown size={12} style={{ color: "var(--text-tertiary)" }} />
      <div style={{ width: 1, height: 6, background: "var(--content-border)" }} />
    </div>
  );
}

function summarizeCondition(c: Condition): string {
  const op = c.operator ?? "is";
  const value = c.value ?? "";
  return `${c.field || "field"} ${op} ${value || "—"}`;
}

export function WorkflowGraph({ automation }: Props) {
  const triggerLabel = getTriggerLabel(automation.triggerType);
  const conditions = automation.conditions ?? [];
  const actions = automation.actions ?? [];

  return (
    <div
      style={{
        padding: "20px 16px 28px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
        flex: 1,
        overflowY: "auto",
        background:
          "radial-gradient(circle at 50% 0%, rgba(108,71,255,0.05), transparent 60%), var(--content-bg-secondary, transparent)",
      }}
      className="content-scroll"
    >
      <NodeShell
        variant="trigger"
        icon={<Zap size={13} />}
        title={triggerLabel}
        meta="Trigger"
        body={
          Object.keys(automation.triggerConfig ?? {}).length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 14 }}>
              {Object.entries(automation.triggerConfig).map(([k, v]) => (
                <li key={k} style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>
                  <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{k}:</span> {String(v)}
                </li>
              ))}
            </ul>
          ) : null
        }
      />

      {conditions.length > 0 && (
        <>
          <Connector />
          <NodeShell
            variant="condition"
            icon={<Filter size={13} />}
            title={`Conditions · ${automation.conditionLogic.toUpperCase()}`}
            meta={`${conditions.length}`}
            body={
              <ol style={{ margin: 0, paddingLeft: 16 }}>
                {conditions.map((c) => (
                  <li key={c.id} style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                    {summarizeCondition(c)}
                  </li>
                ))}
              </ol>
            }
          />
        </>
      )}

      {actions.map((a, idx) => (
        <div key={a.id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Connector />
          <NodeShell
            variant="action"
            icon={<span style={{ fontSize: 12, fontWeight: 700 }}>{idx + 1}</span>}
            title={a.type.replaceAll("_", " ")}
            meta="Action"
            body={
              a.config && Object.keys(a.config).length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 14 }}>
                  {Object.entries(a.config)
                    .filter(([, v]) => v !== "" && v != null)
                    .slice(0, 4)
                    .map(([k, v]) => (
                      <li key={k} style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>
                        <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{k}:</span> {String(v)}
                      </li>
                    ))}
                </ul>
              ) : null
            }
          />
        </div>
      ))}

      <Connector />
      <NodeShell
        variant="end"
        icon={<CheckCircle2 size={13} />}
        title={automation.status === "active" ? "End — automation active" : "End — paused"}
        meta="End"
      />
    </div>
  );
}
