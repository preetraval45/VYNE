"use client";

import { ShieldCheck } from "lucide-react";
import {
  useSecurityPolicy,
  type ComplianceBadge,
} from "@/lib/stores/securityPolicy";

/**
 * ComplianceBadges (23.11) — small badge row for the footer / login
 * page / settings banner. Reads from `useSecurityPolicy.compliance`
 * so admins flip badges on as the workspace earns the certification.
 *
 *   <ComplianceBadges />
 *   <ComplianceBadges variant="inline" max={3} />
 *
 * Each badge is purely visual — the truth-of-record is whatever
 * audit report the customer can produce on demand. The store +
 * footer pattern just makes the trust signal visible everywhere.
 */

const META: Record<
  ComplianceBadge,
  { label: string; tone: string; subtitle?: string }
> = {
  "soc2-type1": {
    label: "SOC 2 Type I",
    tone: "#06B6D4",
    subtitle: "Controls designed",
  },
  "soc2-type2": {
    label: "SOC 2 Type II",
    tone: "#0EA5E9",
    subtitle: "Controls audited",
  },
  "iso-27001": {
    label: "ISO 27001",
    tone: "#22C55E",
    subtitle: "Information security",
  },
  gdpr: {
    label: "GDPR",
    tone: "#3B82F6",
    subtitle: "EU data protection",
  },
  hipaa: {
    label: "HIPAA",
    tone: "#8B5CF6",
    subtitle: "US healthcare",
  },
  "pci-dss": {
    label: "PCI DSS",
    tone: "#F59E0B",
    subtitle: "Payment data",
  },
  ccpa: {
    label: "CCPA",
    tone: "#EC4899",
    subtitle: "California consumer",
  },
  "fedramp-moderate": {
    label: "FedRAMP Mod.",
    tone: "#14B8A6",
    subtitle: "US government",
  },
};

export interface ComplianceBadgesProps {
  /** "stack" = column with subtitles (footer); "inline" = pill row (header). */
  variant?: "stack" | "inline";
  /** Cap displayed count. Default unlimited. */
  max?: number;
}

export function ComplianceBadges({
  variant = "inline",
  max,
}: ComplianceBadgesProps) {
  const earned = useSecurityPolicy((s) => s.compliance);
  const list = max ? earned.slice(0, max) : earned;
  if (list.length === 0) return null;

  if (variant === "stack") {
    return (
      <ul
        aria-label="Earned compliance badges"
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 8,
        }}
      >
        {list.map((id) => {
          const meta = META[id];
          if (!meta) return null;
          return (
            <li
              key={id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                background: `${meta.tone}10`,
                border: `1px solid ${meta.tone}40`,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: `${meta.tone}1A`,
                  color: meta.tone,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShieldCheck size={14} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: meta.tone,
                  }}
                >
                  {meta.label}
                </div>
                {meta.subtitle && (
                  <div
                    style={{
                      fontSize: 10.5,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {meta.subtitle}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <span
      aria-label="Earned compliance badges"
      style={{
        display: "inline-flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 6,
      }}
    >
      {list.map((id) => {
        const meta = META[id];
        if (!meta) return null;
        return (
          <span
            key={id}
            title={meta.subtitle ?? meta.label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: 999,
              background: `${meta.tone}1A`,
              color: meta.tone,
              border: `1px solid ${meta.tone}40`,
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            <ShieldCheck size={10} />
            {meta.label}
          </span>
        );
      })}
    </span>
  );
}
