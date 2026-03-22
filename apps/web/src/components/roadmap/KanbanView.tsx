"use client";

import { FeatureCard } from "./FeatureCard";
import {
  ALL_STATUSES,
  STATUS_CONFIG,
  type RoadmapFeature,
  type RoadmapStatus,
} from "./roadmapData";

interface KanbanViewProps {
  readonly features: RoadmapFeature[];
}

function KanbanColumn({
  status,
  features,
}: Readonly<{ status: RoadmapStatus; features: RoadmapFeature[] }>) {
  const cfg = STATUS_CONFIG[status];

  return (
    <div
      style={{
        minWidth: 280,
        flex: "1 0 280px",
        display: "flex",
        flexDirection: "column",
        background: "var(--content-secondary, #F8F8FC)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {/* Column header */}
      <div
        style={{
          padding: "12px 14px",
          borderBottom: `2px solid ${cfg.dot}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: cfg.bg,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: cfg.dot,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 600, color: cfg.color }}>
          {cfg.label}
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 10,
            background: `${cfg.dot}20`,
            color: cfg.color,
          }}
        >
          {features.length}
        </span>
      </div>

      {/* Cards */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 8,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {features.length === 0 && (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              color: "var(--text-tertiary, #A0A0B8)",
              fontSize: 12,
            }}
          >
            No features
          </div>
        )}
        {features.map((f) => (
          <FeatureCard key={f.id} feature={f} compact />
        ))}
      </div>
    </div>
  );
}

export function KanbanView({ features }: KanbanViewProps) {
  const featuresByStatus = ALL_STATUSES.reduce<
    Record<RoadmapStatus, RoadmapFeature[]>
  >(
    (acc, s) => {
      acc[s] = features.filter((f) => f.status === s);
      return acc;
    },
    {} as Record<RoadmapStatus, RoadmapFeature[]>,
  );

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: 16,
        height: "100%",
        overflowX: "auto",
        overflowY: "hidden",
      }}
    >
      {ALL_STATUSES.map((s) => (
        <KanbanColumn key={s} status={s} features={featuresByStatus[s]} />
      ))}
    </div>
  );
}
