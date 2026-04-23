import { SkeletonCard } from "@/components/shared/Skeleton";

export default function DashboardLoading() {
  return (
    <div
      style={{
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Page title skeleton */}
      <div
        className="vyne-skeleton"
        style={{ width: 180, height: 22, borderRadius: 6 }}
        aria-hidden="true"
      />

      {/* Subtitle skeleton */}
      <div
        className="vyne-skeleton"
        style={{ width: 280, height: 12, borderRadius: 4, marginBottom: 12 }}
        aria-hidden="true"
      />

      {/* KPI row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
        aria-label="Loading overview"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="vyne-skeleton"
            style={{ height: 78, borderRadius: 10 }}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Content cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 14,
        }}
        aria-label="Loading content"
      >
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
        <SkeletonCard lines={4} />
      </div>
    </div>
  );
}
