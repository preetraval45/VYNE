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
            ? "#6C47FF"
            : "var(--content-border, #E8E8F0)",
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
              ? "#6C47FF"
              : "var(--text-primary, #1A1A2E)",
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
              background: "rgba(108,71,255,0.1)",
              color: "#6C47FF",
            }}
          >
            Current
          </span>
        )}
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: "var(--text-tertiary, #A0A0B8)",
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
              color: "var(--text-tertiary, #A0A0B8)",
              fontSize: 12,
              border: "1px dashed var(--content-border, #E8E8F0)",
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
          borderBottom: "1px solid var(--content-border, #E8E8F0)",
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
              style={{ fontSize: 11, color: "var(--text-secondary, #6B6B8A)" }}
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
              "linear-gradient(90deg, #6C47FF, #8B5CF6, #A0A0B8, #D4D4D8)",
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
                background: i === 0 ? "#6C47FF" : "#A0A0B8",
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
