import { Pause, Play } from "lucide-react";
import {
  type Automation,
  type AutomationStatus,
  getStatusColor,
  formatRelativeTime,
} from "./types";

// ─── Status Dot ───────────────────────────────────────────────────────────────

function StatusDot(props: Readonly<{ status: AutomationStatus }>) {
  return (
    <span
      style={{
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: getStatusColor(props.status),
        display: "inline-block",
        flexShrink: 0,
        boxShadow:
          props.status === "active"
            ? `0 0 0 2px ${getStatusColor("active")}33`
            : "none",
      }}
    />
  );
}

// ─── Automation Row ───────────────────────────────────────────────────────────

export default function AutomationRow(
  props: Readonly<{
    automation: Automation;
    isSelected: boolean;
    onSelect: () => void;
    onToggle: () => void;
  }>,
) {
  const { automation, isSelected, onSelect, onToggle } = props;
  return (
    <div style={{ position: "relative", marginBottom: 2 }}>
      {/* Main row -- native button covers the full row (padded right to leave room for toggle) */}
      <button
        onClick={onSelect}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "10px 40px 10px 14px",
          cursor: "pointer",
          borderRadius: 8,
          background: isSelected ? "rgba(6, 182, 212,0.08)" : "transparent",
          border: isSelected
            ? "1px solid rgba(6, 182, 212,0.2)"
            : "1px solid transparent",
          transition: "all 0.1s",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <StatusDot status={automation.status} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-primary)",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {automation.name}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            paddingLeft: 15,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: "var(--text-tertiary)",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {automation.triggerSummary}
          </span>
          <span
            style={{
              fontSize: 10,
              color: "var(--text-secondary)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {automation.runCount} runs
          </span>
          <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
            {formatRelativeTime(automation.lastRun)}
          </span>
        </div>
      </button>

      {/* Toggle button -- sibling, not nested, positioned over the top-right of the row */}
      <button
        onClick={onToggle}
        title={automation.status === "active" ? "Pause" : "Activate"}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 1,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 3,
          borderRadius: 4,
          color: automation.status === "active" ? "#F59E0B" : "#22C55E",
          display: "flex",
          alignItems: "center",
        }}
      >
        {automation.status === "active" ? (
          <Pause size={12} />
        ) : (
          <Play size={12} />
        )}
      </button>
    </div>
  );
}
