"use client";

import { useMemo, useState } from "react";
import type { TimelineEvent, TimelineSource } from "@/lib/stores/timeline";

interface Props {
  events: readonly TimelineEvent[];
}

const SOURCE_ORDER: TimelineSource[] = [
  "github",
  "vyne",
  "stripe",
  "hubspot",
  "linear",
  "sentry",
  "datadog",
  "pagerduty",
  "slack",
];

const SOURCE_META: Record<
  TimelineSource,
  { label: string; color: string }
> = {
  github: { label: "GitHub", color: "#24292e" },
  sentry: { label: "Sentry", color: "#362d59" },
  datadog: { label: "Datadog", color: "#632ca6" },
  stripe: { label: "Stripe", color: "#635bff" },
  hubspot: { label: "HubSpot", color: "#ff7a59" },
  linear: { label: "Linear", color: "#5e6ad2" },
  pagerduty: { label: "PagerDuty", color: "#06ac38" },
  slack: { label: "Slack", color: "#4a154b" },
  vyne: { label: "VYNE AI", color: "#6C47FF" },
};

type Range = "24h" | "7d" | "30d";
const RANGE_HOURS: Record<Range, number> = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30 };

const ROW_HEIGHT = 36;
const LANE_PADDING = 4;
const LABEL_WIDTH = 110;

export function GanttSwimlanes({ events }: Props) {
  const [range, setRange] = useState<Range>("7d");

  const { lanes, ticks, startMs, endMs } = useMemo(() => {
    const hours = RANGE_HOURS[range];
    const end = Date.now();
    const start = end - hours * 3600_000;

    const inRange = events.filter((e) => {
      const t = new Date(e.timestamp).getTime();
      return !Number.isNaN(t) && t >= start && t <= end;
    });

    const bySource = new Map<TimelineSource, TimelineEvent[]>();
    for (const e of inRange) {
      const list = bySource.get(e.source) ?? [];
      list.push(e);
      bySource.set(e.source, list);
    }

    const lanes = SOURCE_ORDER.filter((s) => (bySource.get(s)?.length ?? 0) > 0).map((s) => ({
      source: s,
      events: (bySource.get(s) ?? []).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      ),
    }));

    // Generate 6 evenly-spaced ticks for the axis
    const ticks = Array.from({ length: 6 }).map((_, i) => {
      const t = start + ((end - start) * i) / 5;
      return { x: i / 5, label: formatTick(t, hours) };
    });

    return { lanes, ticks, startMs: start, endMs: end };
  }, [events, range]);

  if (lanes.length === 0) return null;

  return (
    <section
      aria-label="Timeline gantt"
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: "1px solid var(--content-border)",
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
            Multi-resource gantt
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>
            {lanes.length} source{lanes.length === 1 ? "" : "s"} ·{" "}
            {lanes.reduce((s, l) => s + l.events.length, 0)} events
          </div>
        </div>
        <div style={{ display: "inline-flex", gap: 2, padding: 2, borderRadius: 7, background: "var(--content-secondary)", border: "1px solid var(--content-border)" }}>
          {(["24h", "7d", "30d"] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              style={{
                padding: "4px 10px",
                borderRadius: 5,
                border: "none",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                background: range === r ? "var(--content-bg)" : "transparent",
                color: range === r ? "var(--text-primary)" : "var(--text-tertiary)",
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </header>

      {/* Axis */}
      <div
        style={{
          position: "relative",
          height: 22,
          marginLeft: LABEL_WIDTH,
          borderBottom: "1px solid var(--content-border)",
        }}
      >
        {ticks.map((t, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `calc(${t.x * 100}% - 24px)`,
              top: 4,
              fontSize: 10,
              fontVariantNumeric: "tabular-nums",
              color: "var(--text-tertiary)",
              width: 48,
              textAlign: "center",
            }}
          >
            {t.label}
          </span>
        ))}
      </div>

      {/* Swimlanes */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {lanes.map((lane, laneIdx) => {
          const meta = SOURCE_META[lane.source];
          return (
            <div
              key={lane.source}
              style={{
                display: "flex",
                alignItems: "center",
                height: ROW_HEIGHT,
                background: laneIdx % 2 === 0 ? "var(--content-bg)" : "var(--content-secondary)",
                borderBottom: "1px solid var(--content-border)",
              }}
            >
              <div
                style={{
                  width: LABEL_WIDTH,
                  flexShrink: 0,
                  padding: "0 12px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  borderRight: "1px solid var(--content-border)",
                  height: "100%",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 2,
                    background: meta.color,
                    flexShrink: 0,
                  }}
                />
                {meta.label}
              </div>
              <div
                style={{
                  position: "relative",
                  flex: 1,
                  height: ROW_HEIGHT - LANE_PADDING * 2,
                  margin: `${LANE_PADDING}px 0`,
                }}
              >
                {lane.events.map((e) => {
                  const t = new Date(e.timestamp).getTime();
                  const pct = ((t - startMs) / (endMs - startMs)) * 100;
                  const sev = e.severity ?? 0;
                  return (
                    <span
                      key={e.id}
                      title={`${e.title}${e.detail ? "\n" + e.detail : ""}`}
                      style={{
                        position: "absolute",
                        left: `calc(${pct}% - 5px)`,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 10,
                        height: 10,
                        borderRadius: sev >= 3 ? 3 : 999,
                        background: sev >= 3 ? "#B91C1C" : sev >= 2 ? "#C2410C" : meta.color,
                        boxShadow: sev >= 3 ? "0 0 0 3px rgba(220,38,38,0.18)" : undefined,
                        cursor: "default",
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function formatTick(ms: number, totalHours: number): string {
  const d = new Date(ms);
  if (totalHours <= 24) {
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
