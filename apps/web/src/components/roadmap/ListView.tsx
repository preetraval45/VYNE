"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import {
  MODULE_COLORS,
  PRIORITY_CONFIG,
  type RoadmapFeature,
  type Priority,
  type Quarter,
} from "./roadmapData";

interface ListViewProps {
  readonly features: RoadmapFeature[];
}

type SortField =
  | "title"
  | "module"
  | "status"
  | "priority"
  | "quarter"
  | "votes";
type SortDir = "asc" | "desc";

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};
const QUARTER_ORDER: Record<Quarter, number> = {
  "Q1 2026": 0,
  "Q2 2026": 1,
  "Q3 2026": 2,
  "Q4 2026": 3,
};

function SortHeader({
  label,
  field,
  currentField,
  currentDir,
  onSort,
}: Readonly<{
  label: string;
  field: SortField;
  currentField: SortField;
  currentDir: SortDir;
  onSort: (field: SortField) => void;
}>) {
  const isActive = currentField === field;

  return (
    <button
      onClick={() => onSort(field)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: 11,
        fontWeight: 600,
        color: isActive
          ? "#06B6D4"
          : "var(--text-secondary, var(--text-secondary))",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        padding: 0,
      }}
    >
      {label}
      {isActive && currentDir === "asc" && <ArrowUp size={12} />}
      {isActive && currentDir === "desc" && <ArrowDown size={12} />}
      {!isActive && <ArrowUpDown size={12} style={{ opacity: 0.4 }} />}
    </button>
  );
}

export function ListView({ features }: ListViewProps) {
  const [sortField, setSortField] = useState<SortField>("quarter");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    const arr = [...features];
    const dir = sortDir === "asc" ? 1 : -1;

    arr.sort((a, b) => {
      switch (sortField) {
        case "title":
          return dir * a.title.localeCompare(b.title);
        case "module":
          return dir * a.module.localeCompare(b.module);
        case "status":
          return dir * a.status.localeCompare(b.status);
        case "priority":
          return (
            dir * (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
          );
        case "quarter":
          return dir * (QUARTER_ORDER[a.quarter] - QUARTER_ORDER[b.quarter]);
        case "votes":
          return dir * (a.votes - b.votes);
        default:
          return 0;
      }
    });

    return arr;
  }, [features, sortField, sortDir]);

  const headerStyle: React.CSSProperties = {
    padding: "10px 16px",
    textAlign: "left",
  };

  const cellStyle: React.CSSProperties = {
    padding: "12px 16px",
    fontSize: 13,
    color: "var(--text-primary, var(--text-primary))",
    borderTop: "1px solid var(--content-border, var(--content-border))",
  };

  return (
    <div style={{ padding: 16, height: "100%", overflowY: "auto" }}>
      <div
        style={{
          background: "var(--content-bg, #fff)",
          border: "1px solid var(--content-border, var(--content-border))",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                background:
                  "var(--content-secondary, var(--content-bg-secondary))",
              }}
            >
              <th style={{ ...headerStyle, width: "30%" }}>
                <SortHeader
                  label="Feature"
                  field="title"
                  currentField={sortField}
                  currentDir={sortDir}
                  onSort={handleSort}
                />
              </th>
              <th style={headerStyle}>
                <SortHeader
                  label="Module"
                  field="module"
                  currentField={sortField}
                  currentDir={sortDir}
                  onSort={handleSort}
                />
              </th>
              <th style={headerStyle}>
                <SortHeader
                  label="Status"
                  field="status"
                  currentField={sortField}
                  currentDir={sortDir}
                  onSort={handleSort}
                />
              </th>
              <th style={headerStyle}>
                <SortHeader
                  label="Priority"
                  field="priority"
                  currentField={sortField}
                  currentDir={sortDir}
                  onSort={handleSort}
                />
              </th>
              <th style={headerStyle}>
                <SortHeader
                  label="Target"
                  field="quarter"
                  currentField={sortField}
                  currentDir={sortDir}
                  onSort={handleSort}
                />
              </th>
              <th style={{ ...headerStyle, textAlign: "right" }}>
                <SortHeader
                  label="Votes"
                  field="votes"
                  currentField={sortField}
                  currentDir={sortDir}
                  onSort={handleSort}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    ...cellStyle,
                    textAlign: "center",
                    color: "var(--text-tertiary, var(--text-tertiary))",
                    padding: 40,
                  }}
                >
                  No features match your filters
                </td>
              </tr>
            )}
            {sorted.map((f) => {
              const moduleColor = MODULE_COLORS[f.module];
              const priorityCfg = PRIORITY_CONFIG[f.priority];

              return (
                <tr
                  key={f.id}
                  style={{ transition: "background 0.1s" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "var(--content-secondary, var(--content-bg-secondary))";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <td style={cellStyle}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: priorityCfg.color,
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          {f.title}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text-tertiary, var(--text-tertiary))",
                            marginTop: 2,
                          }}
                        >
                          {f.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={cellStyle}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: `${moduleColor}14`,
                        color: moduleColor,
                      }}
                    >
                      {f.module}
                    </span>
                  </td>
                  <td style={cellStyle}>
                    <StatusBadge status={f.status} />
                  </td>
                  <td style={cellStyle}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: priorityCfg.color,
                      }}
                    >
                      {priorityCfg.label}
                    </span>
                  </td>
                  <td
                    style={{
                      ...cellStyle,
                      fontSize: 12,
                      color: "var(--text-secondary, var(--text-secondary))",
                    }}
                  >
                    {f.quarter}
                  </td>
                  <td
                    style={{
                      ...cellStyle,
                      textAlign: "right",
                      fontWeight: 600,
                      fontSize: 13,
                      color: "#06B6D4",
                    }}
                  >
                    {f.votes}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
