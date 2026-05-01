"use client";

import Link from "next/link";
import { Sparkles, AlertOctagon, ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";
import type { AlertEntry } from "@/lib/fixtures/observe";
import { InlineEmptyState } from "@/components/shared/InlineEmptyState";

interface Props {
  alerts: readonly AlertEntry[];
  /** Number of services currently degraded — feeds the impact line. */
  degradedCount: number;
  /** Avg p95 across services so the AI can name a hot path. */
  avgP95Ms: number;
}

function severityRank(s: string): number {
  if (s === "critical") return 3;
  if (s === "warning") return 2;
  return 1;
}

function suggestedRunbookFor(alert: AlertEntry): string {
  const t = `${alert.condition} ${alert.service}`.toLowerCase();
  if (t.includes("db") || t.includes("database") || t.includes("postgres")) return "Primary database is down";
  if (t.includes("p95") || t.includes("latency") || t.includes("slow")) return "API latency spike";
  if (t.includes("error") || t.includes("5xx") || t.includes("500")) return "Error rate spike";
  if (t.includes("auth") || t.includes("login")) return "Auth provider degraded";
  return "General incident response";
}

export function IncidentCommanderCard({ alerts, degradedCount, avgP95Ms }: Props) {
  const active = [...alerts]
    .filter((a) => a.severity === "critical" || a.severity === "warning")
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .slice(0, 3);

  if (active.length === 0) {
    if (alerts.length === 0) return null;
    return (
      <section
        aria-label="AI incident commander"
        style={{
          margin: "0 0 14px",
          borderRadius: 12,
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
        }}
      >
        <InlineEmptyState
          icon={<CheckCircle2 size={14} style={{ color: "#0F9D58" }} />}
          title="No active incidents"
          body="All alerts are resolved. The incident commander will surface playbooks here the moment anything fires."
        />
      </section>
    );
  }

  const top = active[0];
  const runbookName = suggestedRunbookFor(top);
  const aiPrompt = `Act as incident commander. We have ${active.length} active alert(s); the most severe is "${top.service}: ${top.condition}" (${top.severity}). ${
    degradedCount > 0 ? `${degradedCount} service(s) degraded. ` : ""
  }Avg p95 latency is ${avgP95Ms}ms. Walk me through: 1) most likely root cause, 2) immediate mitigations, 3) who to page, 4) draft a status-page update.`;

  return (
    <section
      aria-label="AI incident commander"
      style={{
        margin: "0 0 14px",
        padding: 14,
        borderRadius: 12,
        background:
          "linear-gradient(135deg, rgba(220,38,38,0.10), rgba(108,71,255,0.08))",
        border: "1px solid rgba(220,38,38,0.18)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "rgba(220,38,38,0.15)",
              color: "#B91C1C",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertOctagon size={15} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
              AI incident commander
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "var(--vyne-accent, var(--vyne-purple))",
                }}
              >
                <Sparkles size={9} style={{ marginRight: 3, marginBottom: -1 }} />AI
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 2 }}>
              {active.length} active alert{active.length === 1 ? "" : "s"}
              {degradedCount > 0 ? ` · ${degradedCount} service${degradedCount === 1 ? "" : "s"} degraded` : ""}
              {avgP95Ms > 0 ? ` · p95 ${avgP95Ms}ms` : ""}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Link
            href="/runbooks"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "5px 10px",
              borderRadius: 6,
              fontSize: 11.5,
              fontWeight: 600,
              color: "var(--text-secondary)",
              background: "var(--content-bg)",
              border: "1px solid var(--content-border)",
              textDecoration: "none",
            }}
          >
            <BookOpen size={11} /> {runbookName}
          </Link>
          <Link
            href={`/ai?prompt=${encodeURIComponent(aiPrompt)}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "5px 10px",
              borderRadius: 6,
              fontSize: 11.5,
              fontWeight: 600,
              color: "#fff",
              background: "var(--vyne-accent, var(--vyne-purple))",
              textDecoration: "none",
            }}
          >
            Take command <ArrowRight size={11} />
          </Link>
        </div>
      </header>

      <ul style={{ display: "flex", flexDirection: "column", gap: 8, listStyle: "none", padding: 0, margin: 0 }}>
        {active.map((a) => (
          <li
            key={a.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              borderRadius: 9,
              background: "var(--content-bg)",
              border: "1px solid var(--content-border)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: a.severity === "critical" ? "#B91C1C" : "#C2410C",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 13, color: "var(--text-primary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {a.condition}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: a.severity === "critical" ? "#B91C1C" : "#C2410C",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {a.severity}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
