"use client";

interface Stage {
  id: string;
  label: string;
  count: number;
  /** Override base color */
  color?: string;
}

interface Props {
  stages: Stage[];
  /** Goal label, e.g. "MQL → SQL → Won" */
  subtitle?: string;
}

const DEFAULT_COLORS = ["#1E40AF", "#7C3AED", "#C2410C", "#0F9D58", "#06B6D4"];

export function FunnelCard({ stages, subtitle }: Props) {
  if (stages.length === 0) return null;

  const top = stages[0]?.count ?? 0;
  if (top === 0) return null;

  // Stage width is proportional to count / top so the funnel narrows as conversion drops.
  // Always show at least 8% width so labels stay readable on dead-end stages.

  return (
    <section
      aria-label="Conversion funnel"
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <header style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
          Conversion funnel
        </div>
        {subtitle && (
          <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 2 }}>
            {subtitle}
          </div>
        )}
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {stages.map((s, i) => {
          const width = top > 0 ? Math.max(8, (s.count / top) * 100) : 0;
          const dropPct =
            i > 0 && stages[i - 1].count > 0
              ? Math.round(((stages[i - 1].count - s.count) / stages[i - 1].count) * 100)
              : 0;
          const conv =
            i > 0 && stages[i - 1].count > 0
              ? Math.round((s.count / stages[i - 1].count) * 100)
              : 100;
          const color = s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
          return (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Stage label + count, fixed width so bars line up. */}
              <div
                style={{
                  width: 168,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                  {s.label}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {i > 0 ? `${conv}%` : "100%"}
                </span>
              </div>
              {/* Bar */}
              <div
                style={{
                  flex: 1,
                  height: 28,
                  position: "relative",
                  background: "var(--content-secondary)",
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                <div
                  role="presentation"
                  style={{
                    width: `${width}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, ${color} 0%, ${color}cc 100%)`,
                    transition: "width 0.4s ease-out",
                    display: "flex",
                    alignItems: "center",
                    paddingLeft: 10,
                    color: "#fff",
                    fontSize: 11.5,
                    fontWeight: 600,
                    letterSpacing: "-0.005em",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {s.count.toLocaleString()}
                </div>
                {i > 0 && dropPct > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 11,
                      fontWeight: 600,
                      color: dropPct > 50 ? "#B91C1C" : "var(--text-tertiary)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    -{dropPct}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
