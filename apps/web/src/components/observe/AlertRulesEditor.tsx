"use client";

import { useState } from "react";
import {
  useAlertRulesStore,
  type AlertMetric,
  type AlertOperator,
} from "@/lib/stores/alertRules";

const METRICS: readonly AlertMetric[] = [
  "error_rate",
  "p95_latency",
  "throughput",
  "cpu",
  "memory",
];

const OPERATORS: readonly AlertOperator[] = [">", ">=", "<", "<="];

const METRIC_UNITS: Record<AlertMetric, string> = {
  error_rate: "%",
  p95_latency: "ms",
  throughput: "req/s",
  cpu: "%",
  memory: "%",
};

const SERVICES: readonly string[] = [
  "api-service",
  "messaging-service",
  "erp-service",
  "projects-service",
  "ai-service",
  "auth-service",
  "database",
  "cache",
];

interface Props {
  defaultService?: string;
}

const fieldStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  fontSize: 12,
  border: "1px solid var(--content-border)",
  background: "var(--content-bg)",
  color: "var(--text-primary)",
  width: "100%",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: "var(--text-tertiary)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 4,
  display: "block",
};

export function AlertRulesEditor({ defaultService }: Readonly<Props>) {
  const rules = useAlertRulesStore((s) => s.rules);
  const addRule = useAlertRulesStore((s) => s.addRule);
  const deleteRule = useAlertRulesStore((s) => s.deleteRule);

  const [service, setService] = useState(defaultService ?? SERVICES[0] ?? "");
  const [metric, setMetric] = useState<AlertMetric>("p95_latency");
  const [operator, setOperator] = useState<AlertOperator>(">");
  const [threshold, setThreshold] = useState<number>(500);
  const [durationMin, setDurationMin] = useState<number>(5);
  const [channel, setChannel] = useState<string>("#alerts");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (service.trim().length === 0) {
      setError("Service is required");
      return;
    }
    if (Number.isNaN(threshold)) {
      setError("Threshold must be a number");
      return;
    }
    if (Number.isNaN(durationMin) || durationMin < 0) {
      setError("Duration must be a non-negative number");
      return;
    }
    if (channel.trim().length === 0) {
      setError("Channel is required");
      return;
    }
    addRule({
      service: service.trim(),
      metric,
      operator,
      threshold,
      durationMin,
      channel: channel.trim(),
    });
    setError(null);
  };

  return (
    <div
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 12,
        padding: "16px 18px",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: 4,
        }}
      >
        Alert Rules
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--text-secondary)",
          marginBottom: 14,
        }}
      >
        Notify a channel when a metric crosses a threshold for a sustained
        duration.
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1.3fr 0.6fr 0.9fr 0.9fr 1.2fr auto",
          gap: 10,
          alignItems: "end",
          marginBottom: 12,
        }}
      >
        <div>
          <label htmlFor="ar-service" style={labelStyle}>
            Service
          </label>
          <input
            id="ar-service"
            type="text"
            value={service}
            onChange={(e) => setService(e.target.value)}
            list="ar-service-list"
            placeholder="api-service"
            style={fieldStyle}
          />
          <datalist id="ar-service-list">
            {SERVICES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        <div>
          <label htmlFor="ar-metric" style={labelStyle}>
            Metric
          </label>
          <select
            id="ar-metric"
            aria-label="Metric"
            value={metric}
            onChange={(e) => setMetric(e.target.value as AlertMetric)}
            style={fieldStyle}
          >
            {METRICS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ar-operator" style={labelStyle}>
            Op
          </label>
          <select
            id="ar-operator"
            aria-label="Operator"
            value={operator}
            onChange={(e) => setOperator(e.target.value as AlertOperator)}
            style={fieldStyle}
          >
            {OPERATORS.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ar-threshold" style={labelStyle}>
            Threshold ({METRIC_UNITS[metric]})
          </label>
          <input
            id="ar-threshold"
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            style={fieldStyle}
          />
        </div>

        <div>
          <label htmlFor="ar-duration" style={labelStyle}>
            For (min)
          </label>
          <input
            id="ar-duration"
            type="number"
            min={0}
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
            style={fieldStyle}
          />
        </div>

        <div>
          <label htmlFor="ar-channel" style={labelStyle}>
            Channel
          </label>
          <input
            id="ar-channel"
            type="text"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder="#alerts"
            style={fieldStyle}
          />
        </div>

        <button
          type="submit"
          style={{
            background: "var(--vyne-accent, var(--vyne-purple))",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "7px 14px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            height: 32,
          }}
        >
          + Add rule
        </button>
      </form>

      {error !== null && (
        <div
          style={{
            fontSize: 11,
            color: "var(--status-danger)",
            marginBottom: 10,
          }}
        >
          {error}
        </div>
      )}

      {/* Rules list */}
      <div style={{ marginTop: 6 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-secondary)",
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>
            {rules.length === 0
              ? "No rules yet"
              : `${rules.length.toString()} rule${rules.length === 1 ? "" : "s"}`}
          </span>
        </div>

        {rules.length === 0 ? (
          <div
            style={{
              padding: "20px 0",
              textAlign: "center",
              fontSize: 12,
              color: "var(--text-tertiary)",
              border: "1px dashed var(--content-border)",
              borderRadius: 8,
            }}
          >
            Add a rule above to get notified when a metric crosses its
            threshold.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rules.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "var(--content-secondary)",
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    fontFamily: "monospace",
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  if{" "}
                  <span style={{ color: "var(--vyne-accent, var(--vyne-purple))" }}>
                    {r.service}
                  </span>{" "}
                  <span style={{ color: "var(--text-secondary)" }}>
                    {r.metric}
                  </span>{" "}
                  {r.operator} {r.threshold.toString()}
                  {METRIC_UNITS[r.metric]} for {r.durationMin.toString()}m,
                  notify{" "}
                  <span style={{ color: "var(--vyne-accent, #06B6D4)" }}>
                    {r.channel}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    deleteRule(r.id);
                  }}
                  aria-label={`Delete rule for ${r.service}`}
                  style={{
                    marginLeft: "auto",
                    background: "transparent",
                    border: "1px solid var(--content-border)",
                    borderRadius: 6,
                    padding: "3px 8px",
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
