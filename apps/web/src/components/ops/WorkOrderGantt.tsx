"use client";

import type { ERPWorkOrder } from "@/lib/api/client";

// Simple horizontal Gantt for work orders. Each row is one WO; bars
// span scheduledDate → dueDate against the global min/max window. Bar
// color encodes status. Renders nothing when there are no scheduled
// orders so the table tab still looks clean for empty floors.

interface Props {
  workOrders: ERPWorkOrder[];
}

const STATUS_COLOR: Record<string, string> = {
  planned: "var(--vyne-accent, #5B5BD6)",
  in_progress: "var(--status-warning, #d97706)",
  done: "var(--status-success, #16a34a)",
  cancelled: "var(--text-tertiary, #9ca3af)",
};

export function WorkOrderGantt({ workOrders }: Props) {
  const scheduled = workOrders
    .filter((w) => w.scheduledDate && w.dueDate)
    .map((w) => ({
      ...w,
      start: new Date(w.scheduledDate as string).getTime(),
      end: new Date(w.dueDate as string).getTime(),
    }))
    .filter((w) => w.end >= w.start)
    .sort((a, b) => a.start - b.start);

  if (scheduled.length === 0) return null;

  const min = scheduled[0].start;
  const max = Math.max(...scheduled.map((w) => w.end));
  const range = Math.max(86400000, max - min);
  const days = Math.max(1, Math.ceil(range / 86400000));

  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <section
      style={{
        marginTop: 16,
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
          Production timeline
        </h3>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
          {fmt(new Date(min))} → {fmt(new Date(max))} · {days} day{days === 1 ? "" : "s"}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {scheduled.map((w) => {
          const left = ((w.start - min) / range) * 100;
          const width = Math.max(2, ((w.end - w.start) / range) * 100);
          const color = STATUS_COLOR[w.status] ?? "var(--vyne-accent, #5B5BD6)";
          return (
            <div
              key={w.id}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr",
                alignItems: "center",
                gap: 12,
                fontSize: 12,
              }}
            >
              <div
                style={{
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {w.productName ?? "—"}{" "}
                <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>
                  · {w.qtyToProduce}
                </span>
              </div>
              <div
                style={{
                  position: "relative",
                  height: 12,
                  borderRadius: 6,
                  background: "var(--content-secondary)",
                }}
                title={`${fmt(new Date(w.start))} → ${fmt(new Date(w.end))} · ${w.status}`}
              >
                <div
                  style={{
                    position: "absolute",
                    left: `${left}%`,
                    width: `${width}%`,
                    top: 0,
                    bottom: 0,
                    background: color,
                    borderRadius: 6,
                    opacity: w.status === "cancelled" ? 0.4 : 1,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
