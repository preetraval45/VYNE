"use client";

import { FeatureCard } from "./FeatureCard";
import {
  ALL_QUARTERS,
  STATUS_CONFIG,
  type RoadmapFeature,
  type Quarter,
} from "./roadmapData";

interface TimelineViewProps {
  readonly features: RoadmapFeature[];
}

function QuarterColumn({
  quarter,
  features,
}: Readonly<{ quarter: Quarter; features: RoadmapFeature[] }>) {
  const isCurrentQuarter = quarter === "Q1 2026";

  return (
    <div
      style={{
        minWidth: 300,
        flex: "1 0 300px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Quarter header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "2px solid",
          borderColor: isCurrentQuarter
            ? "var(--vyne-accent, #06B6D4)"
            : "var(--content-border, var(--content-border))",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: isCurrentQuarter
              ? "var(--vyne-accent, #06B6D4)"
              : "var(--text-primary, var(--text-primary))",
          }}
        >
          {quarter}
        </span>
        {isCurrentQuarter && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              padding: "2px 8px",
              borderRadius: 10,
              background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.1)",
              color: "var(--vyne-accent, #06B6D4)",
            }}
          >
            Current
          </span>
        )}
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: "var(--text-tertiary, var(--text-tertiary))",
            fontWeight: 500,
          }}
        >
          {features.length} feature{features.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Feature cards */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "0 4px",
        }}
      >
        {features.length === 0 && (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              color: "var(--text-tertiary, var(--text-tertiary))",
              fontSize: 12,
              border: "1px dashed var(--content-border, var(--content-border))",
              borderRadius: 8,
            }}
          >
            No features in this quarter
          </div>
        )}
        {features.map((f) => (
          <FeatureCard key={f.id} feature={f} />
        ))}
      </div>
    </div>
  );
}

export function TimelineView({ features }: TimelineViewProps) {
  const featuresByQuarter = ALL_QUARTERS.reduce<
    Record<Quarter, RoadmapFeature[]>
  >(
    (acc, q) => {
      acc[q] = features.filter((f) => f.quarter === q);
      return acc;
    },
    {} as Record<Quarter, RoadmapFeature[]>,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Status legend */}
      <div
        style={{
          display: "flex",
          gap: 16,
          padding: "10px 16px",
          borderBottom:
            "1px solid var(--content-border, var(--content-border))",
          flexShrink: 0,
        }}
      >
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div
            key={key}
            style={{ display: "flex", alignItems: "center", gap: 5 }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: cfg.dot,
              }}
            />
            <span
              style={{
                fontSize: 11,
                color: "var(--text-secondary, var(--text-secondary))",
              }}
            >
              {cfg.label}
            </span>
          </div>
        ))}
      </div>

      {/* Timeline connector */}
      <div style={{ position: "relative", padding: "0 16px", flexShrink: 0 }}>
        <div
          style={{
            height: 3,
            background:
              "linear-gradient(90deg, var(--vyne-accent, #06B6D4), #8B5CF6, var(--text-tertiary), #D4D4D8)",
            borderRadius: 2,
            margin: "16px 0 8px",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          {ALL_QUARTERS.map((q, i) => (
            <div
              key={q}
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: i === 0 ? "var(--vyne-accent, #06B6D4)" : "var(--text-tertiary)",
                border: "2px solid var(--content-bg, #fff)",
                position: "relative",
                top: -10,
              }}
            />
          ))}
        </div>
      </div>

      {/* Quarter columns */}
      <div
        style={{
          display: "flex",
          gap: 16,
          padding: "0 12px 16px",
          flex: 1,
          overflowX: "auto",
          overflowY: "auto",
        }}
      >
        {ALL_QUARTERS.map((q) => (
          <QuarterColumn key={q} quarter={q} features={featuresByQuarter[q]} />
        ))}
      </div>
    </div>
  );
}
