"use client";

interface Props {
  values: number[];
  width?: number;
  height?: number;
  ariaLabel?: string;
}

/**
 * Tiny inline SVG sparkline for the OverviewTab — no chart library
 * needed. Uses currentColor so it picks up the surrounding text color
 * (e.g. accent on a tinted card).
 */
export function Sparkline({ values, width = 96, height = 24, ariaLabel }: Props) {
  if (values.length === 0) return null;
  const max = Math.max(1, ...values);
  const stepX = width / Math.max(1, values.length - 1);
  const path = values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - (v / max) * (height - 2) - 1;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      role="img"
      aria-label={ariaLabel ?? "Trend"}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "inline-block", overflow: "visible" }}
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
    </svg>
  );
}
