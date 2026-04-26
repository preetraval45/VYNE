"use client";

/**
 * Skeleton loading components for VYNE.
 *
 * Every skeleton uses the same shimmer keyframe animation driven by CSS
 * variables so it works in both light and dark themes automatically.
 *
 * Usage:
 *   import { SkeletonCard, SkeletonTable } from '@/components/shared/Skeleton'
 *   <SkeletonCard />
 *   <SkeletonTable rows={5} columns={4} />
 */

import React from "react";

/* ────────────────────────────────────────────────────────────────────
 * Shared shimmer style tag — injected once via a top-level component.
 * The animation pulses from content-secondary to a slightly lighter
 * shade, which is derived per-theme.
 * ──────────────────────────────────────────────────────────────────── */

function ShimmerStyles() {
  return (
    <style
      data-vyne="skeleton-shimmer"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: `
@keyframes vyneShimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}

:root {
  --skeleton-base: var(--content-border);
  --skeleton-shine: #F4F4FA;
}

[data-theme="dark"] {
  --skeleton-base: #1E1E32;
  --skeleton-shine: #2A2A42;
}

.vyne-skeleton {
  background: linear-gradient(
    90deg,
    var(--skeleton-base) 0%,
    var(--skeleton-shine) 40%,
    var(--skeleton-base) 80%
  );
  background-size: 800px 100%;
  animation: vyneShimmer 1.6s ease-in-out infinite;
  border-radius: var(--radius, 8px);
}
`,
      }}
    />
  );
}

/** Ensure shimmer CSS is present in the tree. Call once at the top of any
 *  skeleton component — React deduplicates the <style> by id. */
function useShimmerStyles(): React.ReactElement {
  return <ShimmerStyles />;
}

/* ════════════════════════════════════════════════════════════════════
 * SkeletonLine
 * ════════════════════════════════════════════════════════════════════ */

type SkeletonLineProps = Readonly<{
  /** CSS width value. Default `'100%'` */
  width?: string;
  /** CSS height value. Default `'12px'` */
  height?: string;
  /** Border radius override. Default inherits from `.vyne-skeleton` */
  borderRadius?: string | number;
  /** Extra className */
  className?: string;
}>;

export function SkeletonLine({
  width = "100%",
  height = "12px",
  borderRadius,
  className = "",
}: SkeletonLineProps) {
  const styles = useShimmerStyles();
  return (
    <>
      {styles}
      <div
        className={`vyne-skeleton ${className}`}
        style={{
          width,
          height,
          ...(borderRadius !== undefined ? { borderRadius } : {}),
        }}
        aria-hidden="true"
      />
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════
 * SkeletonCard
 * ════════════════════════════════════════════════════════════════════ */

type SkeletonCardProps = Readonly<{
  /** Number of body text lines. Default `3` */
  lines?: number;
  /** Extra className */
  className?: string;
}>;

export function SkeletonCard({ lines = 3, className = "" }: SkeletonCardProps) {
  const styles = useShimmerStyles();
  return (
    <>
      {styles}
      <div
        className={className}
        style={{
          background: "var(--content-secondary)",
          border: "1px solid var(--content-border)",
          borderRadius: 12,
          padding: "18px 20px",
        }}
        aria-hidden="true"
      >
        {/* Title line */}
        <div
          className="vyne-skeleton"
          style={{
            width: "55%",
            height: 14,
            marginBottom: 16,
            borderRadius: 6,
          }}
        />

        {/* Body lines */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className="vyne-skeleton"
              style={{
                width: i === lines - 1 ? "40%" : `${85 - i * 10}%`,
                height: 10,
                borderRadius: 5,
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════
 * SkeletonTable
 * ════════════════════════════════════════════════════════════════════ */

type SkeletonTableProps = Readonly<{
  /** Number of rows. Default `5` */
  rows?: number;
  /** Number of columns. Default `4` */
  columns?: number;
  /** Extra className */
  className?: string;
}>;

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className = "",
}: SkeletonTableProps) {
  const styles = useShimmerStyles();

  const columnWidths = ["30%", "45%", "25%", "20%", "35%", "40%"];

  return (
    <>
      {styles}
      <div
        className={className}
        style={{
          background: "var(--content-secondary)",
          border: "1px solid var(--content-border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
        aria-hidden="true"
      >
        {/* Header row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: 12,
            padding: "14px 18px",
            borderBottom: "1px solid var(--content-border)",
          }}
        >
          {Array.from({ length: columns }).map((_, i) => (
            <div
              key={i}
              className="vyne-skeleton"
              style={{
                width: columnWidths[i % columnWidths.length],
                height: 10,
                borderRadius: 5,
              }}
            />
          ))}
        </div>

        {/* Data rows */}
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gap: 12,
              padding: "12px 18px",
              borderBottom:
                rowIdx < rows - 1 ? "1px solid var(--content-border)" : "none",
            }}
          >
            {Array.from({ length: columns }).map((_, colIdx) => (
              <div
                key={colIdx}
                className="vyne-skeleton"
                style={{
                  width: `${60 + ((rowIdx + colIdx) % 3) * 15}%`,
                  height: 10,
                  borderRadius: 5,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════
 * SkeletonKanban
 * ════════════════════════════════════════════════════════════════════ */

type SkeletonKanbanProps = Readonly<{
  /** Number of columns. Default `4` */
  columns?: number;
  /** Cards per column. Default `3` */
  cardsPerColumn?: number;
  /** Extra className */
  className?: string;
}>;

function KanbanCardSkeleton() {
  return (
    <div
      style={{
        background: "var(--content-bg, #FFFFFF)",
        border: "1px solid var(--content-border)",
        borderRadius: 10,
        padding: "14px 16px",
      }}
    >
      {/* Tag pill */}
      <div
        className="vyne-skeleton"
        style={{ width: 52, height: 8, borderRadius: 4, marginBottom: 12 }}
      />
      {/* Title */}
      <div
        className="vyne-skeleton"
        style={{ width: "80%", height: 11, borderRadius: 5, marginBottom: 8 }}
      />
      {/* Subtitle */}
      <div
        className="vyne-skeleton"
        style={{ width: "55%", height: 9, borderRadius: 5, marginBottom: 14 }}
      />
      {/* Footer: avatar + badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          className="vyne-skeleton"
          style={{ width: 22, height: 22, borderRadius: "50%" }}
        />
        <div
          className="vyne-skeleton"
          style={{ width: 36, height: 8, borderRadius: 4 }}
        />
      </div>
    </div>
  );
}

export function SkeletonKanban({
  columns = 4,
  cardsPerColumn = 3,
  className = "",
}: SkeletonKanbanProps) {
  const styles = useShimmerStyles();

  const columnCardCounts = Array.from({ length: columns }).map((_, i) =>
    Math.max(1, cardsPerColumn - (i % 2)),
  );

  return (
    <>
      {styles}
      <div
        className={className}
        style={{
          display: "flex",
          gap: 16,
          overflowX: "auto",
          padding: "4px 0",
        }}
        aria-hidden="true"
      >
        {Array.from({ length: columns }).map((_, colIdx) => (
          <div
            key={colIdx}
            style={{
              flex: "0 0 280px",
              minWidth: 280,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {/* Column header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
                padding: "0 2px",
              }}
            >
              <div
                className="vyne-skeleton"
                style={{ width: 10, height: 10, borderRadius: "50%" }}
              />
              <div
                className="vyne-skeleton"
                style={{ width: 72, height: 10, borderRadius: 5 }}
              />
              <div
                className="vyne-skeleton"
                style={{
                  width: 20,
                  height: 16,
                  borderRadius: 8,
                  marginLeft: "auto",
                }}
              />
            </div>

            {/* Cards */}
            {Array.from({ length: columnCardCounts[colIdx] }).map(
              (_, cardIdx) => (
                <KanbanCardSkeleton key={cardIdx} />
              ),
            )}
          </div>
        ))}
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════
 * SkeletonList
 * ════════════════════════════════════════════════════════════════════ */

type SkeletonListProps = Readonly<{
  /** Number of list items. Default `5` */
  items?: number;
  /** Avatar size in px. Default `32` */
  avatarSize?: number;
  /** Extra className */
  className?: string;
}>;

export function SkeletonList({
  items = 5,
  avatarSize = 32,
  className = "",
}: SkeletonListProps) {
  const styles = useShimmerStyles();
  return (
    <>
      {styles}
      <div
        className={className}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 0,
          background: "var(--content-secondary)",
          border: "1px solid var(--content-border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
        aria-hidden="true"
      >
        {Array.from({ length: items }).map((_, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 18px",
              borderBottom:
                i < items - 1 ? "1px solid var(--content-border)" : "none",
            }}
          >
            {/* Avatar circle */}
            <div
              className="vyne-skeleton"
              style={{
                width: avatarSize,
                height: avatarSize,
                borderRadius: "50%",
                flexShrink: 0,
              }}
            />
            {/* Text lines */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div
                className="vyne-skeleton"
                style={{
                  width: `${55 + (i % 3) * 12}%`,
                  height: 11,
                  borderRadius: 5,
                }}
              />
              <div
                className="vyne-skeleton"
                style={{
                  width: `${35 + (i % 2) * 10}%`,
                  height: 9,
                  borderRadius: 5,
                }}
              />
            </div>
            {/* Trailing badge / timestamp */}
            <div
              className="vyne-skeleton"
              style={{
                width: 48,
                height: 9,
                borderRadius: 4,
                flexShrink: 0,
              }}
            />
          </div>
        ))}
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════
 * SkeletonChart
 * ════════════════════════════════════════════════════════════════════ */

type SkeletonChartProps = Readonly<{
  /** Height of the chart area. Default `'200px'` */
  height?: string;
  /** Number of vertical bars to show. Default `7` */
  bars?: number;
  /** Extra className */
  className?: string;
}>;

export function SkeletonChart({
  height = "200px",
  bars = 7,
  className = "",
}: SkeletonChartProps) {
  const styles = useShimmerStyles();

  /* Pseudo-random bar heights that look organic */
  const barHeights = [65, 40, 80, 55, 90, 45, 70, 60, 85, 50];

  return (
    <>
      {styles}
      <div
        className={className}
        style={{
          background: "var(--content-secondary)",
          border: "1px solid var(--content-border)",
          borderRadius: 12,
          padding: "18px 20px",
        }}
        aria-hidden="true"
      >
        {/* Header: title + legend */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div
            className="vyne-skeleton"
            style={{ width: 120, height: 12, borderRadius: 6 }}
          />
          <div style={{ display: "flex", gap: 12 }}>
            <div
              className="vyne-skeleton"
              style={{ width: 50, height: 8, borderRadius: 4 }}
            />
            <div
              className="vyne-skeleton"
              style={{ width: 50, height: 8, borderRadius: 4 }}
            />
          </div>
        </div>

        {/* Chart area */}
        <div
          style={{
            height,
            display: "flex",
            alignItems: "flex-end",
            gap: 10,
            borderBottom: "1px solid var(--content-border)",
            paddingBottom: 12,
          }}
        >
          {Array.from({ length: bars }).map((_, i) => (
            <div
              key={i}
              className="vyne-skeleton"
              style={{
                flex: 1,
                height: `${barHeights[i % barHeights.length]}%`,
                borderRadius: "6px 6px 2px 2px",
              }}
            />
          ))}
        </div>

        {/* X-axis labels */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 10,
          }}
        >
          {Array.from({ length: bars }).map((_, i) => (
            <div
              key={i}
              className="vyne-skeleton"
              style={{
                flex: 1,
                height: 8,
                borderRadius: 4,
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════
 * SkeletonStat
 * ════════════════════════════════════════════════════════════════════ */

type SkeletonStatProps = Readonly<{
  /** Extra className */
  className?: string;
}>;

export function SkeletonStat({ className = "" }: SkeletonStatProps) {
  const styles = useShimmerStyles();
  return (
    <>
      {styles}
      <div
        className={className}
        style={{
          background: "var(--content-secondary)",
          border: "1px solid var(--content-border)",
          borderRadius: 10,
          padding: "14px 16px",
        }}
        aria-hidden="true"
      >
        {/* Label */}
        <div
          className="vyne-skeleton"
          style={{ width: "50%", height: 9, borderRadius: 5, marginBottom: 10 }}
        />
        {/* Big number */}
        <div
          className="vyne-skeleton"
          style={{ width: "35%", height: 22, borderRadius: 6, marginBottom: 8 }}
        />
        {/* Delta / trend */}
        <div
          className="vyne-skeleton"
          style={{ width: "60%", height: 8, borderRadius: 4 }}
        />
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════
 * SkeletonStatRow — convenience: renders a grid of SkeletonStat cards
 * ════════════════════════════════════════════════════════════════════ */

type SkeletonStatRowProps = Readonly<{
  /** Number of stat cards. Default `4` */
  count?: number;
  /** Extra className */
  className?: string;
}>;

export function SkeletonStatRow({
  count = 4,
  className = "",
}: SkeletonStatRowProps) {
  return (
    <div
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${count}, 1fr)`,
        gap: 12,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStat key={i} />
      ))}
    </div>
  );
}
