"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Link2, ThumbsUp } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import {
  MODULE_COLORS,
  PRIORITY_CONFIG,
  type RoadmapFeature,
} from "./roadmapData";
import { useRoadmapVotesStore } from "@/lib/stores/roadmapVotes";

interface FeatureCardProps {
  readonly feature: RoadmapFeature;
  readonly compact?: boolean;
}

export function FeatureCard({ feature, compact = false }: FeatureCardProps) {
  const [expanded, setExpanded] = useState(false);
  const moduleColor = MODULE_COLORS[feature.module];
  const priorityCfg = PRIORITY_CONFIG[feature.priority];

  return (
    <div
      style={{
        background: "var(--content-bg, #fff)",
        border: "1px solid var(--content-border, var(--content-border))",
        borderRadius: 10,
        padding: compact ? "10px 14px" : "14px 18px",
        cursor: "pointer",
        transition: "box-shadow 0.15s ease, border-color 0.15s ease",
      }}
      onClick={() => setExpanded(!expanded)}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.1)";
        e.currentTarget.style.borderColor = "#DDD6FE";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor =
          "var(--content-border, var(--content-border))";
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
          flexWrap: "wrap",
        }}
      >
        {/* Priority dot */}
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: priorityCfg.color,
            flexShrink: 0,
          }}
          title={`${priorityCfg.label} priority`}
        />
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary, var(--text-primary))",
            flex: 1,
            minWidth: 0,
          }}
        >
          {feature.title}
        </span>
        <StatusBadge status={feature.status} />
      </div>

      {/* Module + meta row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            padding: "1px 7px",
            borderRadius: 4,
            background: `${moduleColor}14`,
            color: moduleColor,
          }}
        >
          {feature.module}
        </span>
        {!compact && (
          <span
            style={{
              fontSize: 10,
              color: "var(--text-tertiary, var(--text-tertiary))",
            }}
          >
            {feature.quarter}
          </span>
        )}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <VoteButton featureId={feature.id} baseVotes={feature.votes} />
        </div>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: 12,
          color: "var(--text-secondary, var(--text-secondary))",
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        {feature.description}
      </p>

      {/* Expanded details */}
      {expanded && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: "1px solid var(--content-border, var(--content-border))",
          }}
        >
          <p
            style={{
              fontSize: 12,
              color: "var(--text-primary, var(--text-primary))",
              margin: "0 0 8px",
              lineHeight: 1.6,
            }}
          >
            {feature.fullDescription}
          </p>
          {feature.linkedIssues && feature.linkedIssues.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              <Link2
                size={12}
                color="var(--text-tertiary, var(--text-tertiary))"
              />
              {feature.linkedIssues.map((issue) => (
                <span
                  key={issue}
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: "rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.08)",
                    color: "var(--vyne-accent, #06B6D4)",
                  }}
                >
                  {issue}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Expand indicator */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
        {expanded ? (
          <ChevronUp
            size={14}
            color="var(--text-tertiary, var(--text-tertiary))"
          />
        ) : (
          <ChevronDown
            size={14}
            color="var(--text-tertiary, var(--text-tertiary))"
          />
        )}
      </div>
    </div>
  );
}

// ── VoteButton ─────────────────────────────────────────────────
// Click-to-toggle thumb. The voted state is local (Zustand persisted
// to localStorage) — no API write yet. Adds 1 to the displayed count
// when active, accent-tints the icon, swallows click events so the
// surrounding card's expand toggle doesn't also fire.

function VoteButton({ featureId, baseVotes }: { featureId: string; baseVotes: number }) {
  const voted = useRoadmapVotesStore((s) => Boolean(s.voted[featureId]));
  const toggle = useRoadmapVotesStore((s) => s.toggleVote);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggle(featureId);
      }}
      aria-pressed={voted}
      aria-label={voted ? "Remove vote" : "Vote for this feature"}
      title={voted ? "Remove vote" : "Vote for this feature"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 7px",
        borderRadius: 999,
        border: `1px solid ${voted ? "var(--vyne-accent-ring, var(--content-border))" : "transparent"}`,
        background: voted ? "var(--vyne-accent-soft, var(--content-secondary))" : "transparent",
        color: voted ? "var(--vyne-accent-deep, var(--text-primary))" : "var(--text-tertiary)",
        cursor: "pointer",
        fontSize: 10,
        fontWeight: voted ? 700 : 500,
      }}
    >
      <ThumbsUp size={11} />
      {baseVotes + (voted ? 1 : 0)}
    </button>
  );
}
