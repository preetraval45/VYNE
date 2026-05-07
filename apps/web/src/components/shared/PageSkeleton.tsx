"use client";

/**
 * PageSkeleton — generic loading skeleton for module pages.
 *
 * Drops in as the `fallback` prop of a Suspense boundary or as the
 * gate render before async data resolves:
 *
 *   <Suspense fallback={<PageSkeleton />}>
 *     <CRMPageInner />
 *   </Suspense>
 *
 * Layout:
 *   - 4 KPI tile skeletons across the top (matches PageDashboard)
 *   - one wide chart placeholder
 *   - 6 list-row placeholders
 *
 * The shimmer animation is the same `vyne-shimmer` keyframe used by
 * `<PageDashboard loading />` so the visual continuity is maintained
 * once real data arrives. Honors prefers-reduced-motion via the same
 * keyframe rule.
 */
export interface PageSkeletonProps {
  /** Number of KPI tiles. Default 4. */
  kpiCount?: number;
  /** Number of list rows. Default 6. */
  rowCount?: number;
  /** Hide the chart slot when the page doesn't have one. Default false. */
  hideChart?: boolean;
  /** Suppress the screen-reader announcement (when nested inside another
   *  loading region). Default false. */
  silent?: boolean;
}

export function PageSkeleton({
  kpiCount = 4,
  rowCount = 6,
  hideChart = false,
  silent = false,
}: PageSkeletonProps) {
  return (
    <div
      role={silent ? undefined : "status"}
      aria-busy={silent ? undefined : "true"}
      aria-live={silent ? undefined : "polite"}
      aria-label={silent ? undefined : "Loading page"}
      style={{
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* KPI tile row — mirrors PageDashboard's grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${kpiCount}, minmax(0, 1fr))`,
          gap: 10,
        }}
      >
        {Array.from({ length: kpiCount }).map((_, i) => (
          <div
            key={`kpi-${i}`}
            className="vyne-skel"
            style={{
              ...skeletonBase,
              height: 78,
            }}
          />
        ))}
      </div>

      {/* Chart placeholder */}
      {!hideChart && (
        <div
          className="vyne-skel"
          style={{
            ...skeletonBase,
            height: 220,
          }}
        />
      )}

      {/* List rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Array.from({ length: rowCount }).map((_, i) => (
          <div
            key={`row-${i}`}
            className="vyne-skel"
            style={{
              ...skeletonBase,
              height: 48,
              // Stagger widths slightly so the skeleton doesn't look
              // mechanically uniform.
              width: `${100 - (i % 3) * 4}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

const skeletonBase: React.CSSProperties = {
  background: "var(--content-secondary)",
  border: "1px solid var(--content-border)",
  borderRadius: 10,
  position: "relative",
  overflow: "hidden",
};
