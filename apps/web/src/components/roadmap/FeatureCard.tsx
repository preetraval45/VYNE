"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Link2, ThumbsUp } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import {
  MODULE_COLORS,
  PRIORITY_CONFIG,
  type RoadmapFeature,
} from "./roadmapData";

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
        border: "1px solid var(--content-border, #E8E8F0)",
        borderRadius: 10,
        padding: compact ? "10px 14px" : "14px 18px",
        cursor: "pointer",
        transition: "box-shadow 0.15s ease, border-color 0.15s ease",
      }}
      onClick={() => setExpanded(!expanded)}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(108,71,255,0.1)";
        e.currentTarget.style.borderColor = "#DDD6FE";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "var(--content-border, #E8E8F0)";
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
            color: "var(--text-primary, #1A1A2E)",
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
            style={{ fontSize: 10, color: "var(--text-tertiary, #A0A0B8)" }}
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
          <ThumbsUp size={11} color="var(--text-tertiary, #A0A0B8)" />
          <span
            style={{ fontSize: 10, color: "var(--text-tertiary, #A0A0B8)" }}
          >
            {feature.votes}
          </span>
        </div>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: 12,
          color: "var(--text-secondary, #6B6B8A)",
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
            borderTop: "1px solid var(--content-border, #E8E8F0)",
          }}
        >
          <p
            style={{
              fontSize: 12,
              color: "var(--text-primary, #1A1A2E)",
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
              <Link2 size={12} color="var(--text-tertiary, #A0A0B8)" />
              {feature.linkedIssues.map((issue) => (
                <span
                  key={issue}
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: "rgba(108,71,255,0.08)",
                    color: "#6C47FF",
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
          <ChevronUp size={14} color="var(--text-tertiary, #A0A0B8)" />
        ) : (
          <ChevronDown size={14} color="var(--text-tertiary, #A0A0B8)" />
        )}
      </div>
    </div>
  );
}
