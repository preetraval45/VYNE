"use client";

import { useMemo } from "react";

/**
 * GeoMap — minimal equirectangular world map with marker dots.
 *
 *   <GeoMap
 *     points={[
 *       { id: "1", lat: 37.7749, lng: -122.4194, label: "SF · 12 deals", value: 12 },
 *     ]}
 *   />
 *
 * No tile dependency, no API key. Renders a faded continent silhouette
 * via a single SVG `path` (rough hand-drawn polygons covering the
 * inhabited continents) so customer-density / site / deal-region
 * heatmaps look credible without leaflet / mapbox.
 *
 * Use case: regional pipeline / customers / inventory dashboards.
 * For pixel-perfect cartography, swap to maplibre + protomaps once a
 * real map service lands.
 */

export interface GeoPoint {
  id: string;
  /** Latitude in [-90, 90]. */
  lat: number;
  /** Longitude in [-180, 180]. */
  lng: number;
  /** Used for marker size; auto-scaled. */
  value?: number;
  /** Tooltip text. */
  label?: string;
  /** Override colour. */
  color?: string;
}

export interface GeoMapProps {
  points: GeoPoint[];
  width?: number;
  height?: number;
  accent?: string;
  onPointClick?: (p: GeoPoint) => void;
}

// Hand-drawn continent silhouettes (rough — pixels in a 1000×500 viewBox).
// Goal is "credible at-a-glance world map", not cartography.
const CONTINENTS_PATH =
  "M170 220q-20 -10 -30 5t-10 25l-15 30 5 25 25 10 35 -10 35 5 -10 30 25 25 5 35 -25 25 -25 -10 -25 -25 -25 30 -10 25 5 25 -25 -5 -25 -30 -25 -25z " +
  "M260 130q-25 -10 -45 5t-30 30 -25 25 -10 25 25 25 30 -5 35 5 25 -25 25 5 35 -25 30 -25 -25 -25 -50 -25 -25z " +
  "M460 100q-30 5 -50 25t-30 35 -10 35 5 30 30 10 35 5 50 -10 35 -25 25 -30 25 -35 -25 -30 -50 -10 -55 -25z " +
  "M530 220l25 -10 35 5 35 -10 30 5 25 35 -25 35 -35 25 -50 -10 -35 -25 -30 -10 -10 -25 35 -15z " +
  "M540 320q15 5 30 -5l25 -10 35 25 35 30 -25 35 -25 25 -30 -10 -35 -10 -35 -25 -25 -25 25 -30 25 0 25 -5z " +
  "M780 110q-25 0 -45 15t-25 30 0 30 25 25 35 5 30 -25 30 -10 35 -5 -10 -30 -25 -25 -50 -10z " +
  "M790 220l25 -10 35 5 35 -10 25 25 -25 25 -50 25 -50 0 -25 -25 30 -35z " +
  "M820 340q15 5 30 -5l25 -10 25 25 -25 35 -25 25 -25 -10 -25 -25 20 -35z";

function projectLat(lat: number): number {
  // Equirectangular: lat 90→0, lat -90→500
  return ((90 - lat) / 180) * 500;
}
function projectLng(lng: number): number {
  // lng -180→0, lng 180→1000
  return ((lng + 180) / 360) * 1000;
}

export function GeoMap({
  points,
  width = 720,
  height = 360,
  accent = "var(--vyne-accent, #06B6D4)",
  onPointClick,
}: GeoMapProps) {
  const { rendered, max } = useMemo(() => {
    let max = 0;
    for (const p of points) {
      const v = p.value ?? 1;
      if (v > max) max = v;
    }
    return {
      rendered: points.map((p) => ({
        ...p,
        x: projectLng(p.lng),
        y: projectLat(p.lat),
      })),
      max,
    };
  }, [points]);

  function radiusFor(v?: number): number {
    if (!v || max === 0) return 4;
    const ratio = Math.min(v / max, 1);
    return 4 + Math.round(ratio * 12);
  }

  return (
    <svg
      role="img"
      aria-label="Geographic distribution"
      width={width}
      height={height}
      viewBox="0 0 1000 500"
      preserveAspectRatio="xMidYMid meet"
      style={{
        display: "block",
        background: "var(--content-secondary)",
        borderRadius: 10,
      }}
    >
      <path
        d={CONTINENTS_PATH}
        fill="var(--content-bg)"
        stroke="var(--content-border)"
        strokeWidth={1}
      />
      {rendered.map((p) => (
        <g key={p.id}>
          <circle
            cx={p.x}
            cy={p.y}
            r={radiusFor(p.value)}
            fill={p.color ?? accent}
            opacity={0.45}
          />
          <circle
            cx={p.x}
            cy={p.y}
            r={Math.max(radiusFor(p.value) - 4, 2)}
            fill={p.color ?? accent}
            style={{ cursor: onPointClick ? "pointer" : "default" }}
            onClick={() => onPointClick?.(p)}
          >
            <title>{p.label ?? `${p.lat.toFixed(2)}, ${p.lng.toFixed(2)}`}</title>
          </circle>
        </g>
      ))}
    </svg>
  );
}
