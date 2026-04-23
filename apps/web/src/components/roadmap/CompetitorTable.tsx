"use client";

import { Check, X as XIcon } from "lucide-react";
import { COMPETITOR_DATA } from "./roadmapData";

const COMPETITORS = [
  "vyne",
  "slack",
  "jira",
  "notion",
  "odoo",
  "datadog",
] as const;
const COMPETITOR_LABELS: Record<(typeof COMPETITORS)[number], string> = {
  vyne: "VYNE",
  slack: "Slack",
  jira: "Jira",
  notion: "Notion",
  odoo: "Odoo",
  datadog: "Datadog",
};

export function CompetitorTable() {
  const headerCellStyle: React.CSSProperties = {
    padding: "10px 14px",
    fontSize: 12,
    fontWeight: 600,
    textAlign: "center",
    color: "var(--text-secondary, #6B6B8A)",
    whiteSpace: "nowrap",
  };

  const cellStyle: React.CSSProperties = {
    padding: "10px 14px",
    fontSize: 12,
    textAlign: "center",
    borderTop: "1px solid var(--content-border, #E8E8F0)",
  };

  return (
    <div
      style={{
        margin: "0 16px 16px",
        background: "var(--content-bg, #fff)",
        border: "1px solid var(--content-border, #E8E8F0)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Section header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--content-border, #E8E8F0)",
          background:
            "linear-gradient(135deg, rgba(6, 182, 212,0.04) 0%, rgba(139,92,246,0.04) 100%)",
        }}
      >
        <h2
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "var(--text-primary, #1A1A2E)",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Competitor Gap Analysis
        </h2>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-secondary, #6B6B8A)",
            margin: "4px 0 0",
          }}
        >
          How VYNE compares to existing tools across all capabilities
        </p>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}
        >
          <thead>
            <tr style={{ background: "var(--content-secondary, #F8F8FC)" }}>
              <th
                style={{
                  ...headerCellStyle,
                  textAlign: "left",
                  width: "30%",
                }}
              >
                Feature
              </th>
              {COMPETITORS.map((c) => (
                <th
                  key={c}
                  style={{
                    ...headerCellStyle,
                    color: c === "vyne" ? "#06B6D4" : headerCellStyle.color,
                    fontWeight: c === "vyne" ? 700 : 600,
                  }}
                >
                  {COMPETITOR_LABELS[c]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPETITOR_DATA.map((row) => {
              const isUnique = row.vyneUnique;
              return (
                <tr
                  key={row.feature}
                  style={{
                    background: isUnique
                      ? "rgba(34,197,94,0.04)"
                      : "transparent",
                  }}
                >
                  <td
                    style={{
                      ...cellStyle,
                      textAlign: "left",
                      fontWeight: 500,
                      color: "var(--text-primary, #1A1A2E)",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      {row.feature}
                      {isUnique && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 600,
                            padding: "1px 6px",
                            borderRadius: 4,
                            background: "rgba(34,197,94,0.12)",
                            color: "var(--badge-success-text)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          VYNE Unique
                        </span>
                      )}
                    </div>
                  </td>
                  {COMPETITORS.map((c) => {
                    const hasFeature = row[c];
                    const isVyne = c === "vyne";

                    return (
                      <td key={c} style={cellStyle}>
                        {hasFeature ? (
                          <Check
                            size={16}
                            color={isVyne ? "#22C55E" : "#3B82F6"}
                            strokeWidth={2.5}
                          />
                        ) : (
                          <XIcon
                            size={14}
                            color="var(--text-tertiary, #D4D4D8)"
                            strokeWidth={2}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary bar */}
      <div
        style={{
          padding: "12px 20px",
          borderTop: "1px solid var(--content-border, #E8E8F0)",
          background: "var(--content-secondary, #F8F8FC)",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.3)",
            }}
          />
          <span
            style={{ fontSize: 11, color: "var(--text-secondary, #6B6B8A)" }}
          >
            Green rows = VYNE-unique capabilities
          </span>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary, #A0A0B8)" }}>
          VYNE covers{" "}
          <span style={{ fontWeight: 700, color: "#06B6D4" }}>
            {COMPETITOR_DATA.filter((r) => r.vyne).length}/
            {COMPETITOR_DATA.length}
          </span>{" "}
          features across all competitors
        </div>
      </div>
    </div>
  );
}
