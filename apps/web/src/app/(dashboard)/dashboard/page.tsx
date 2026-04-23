"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  RotateCcw,
  TrendingUp,
  Activity,
  AlertCircle,
  DollarSign,
  ShoppingCart,
  Users,
  Cpu,
  Layers,
} from "lucide-react";

type WidgetType =
  | "stat-revenue"
  | "stat-orders"
  | "stat-active-users"
  | "stat-system-health"
  | "chart-revenue"
  | "list-incidents"
  | "list-recent-issues"
  | "ai-summary"
  | "team-presence";

interface WidgetMeta {
  type: WidgetType;
  label: string;
  icon: React.ElementType;
  defaultSize: { w: 1 | 2 | 3 | 4; h: 1 | 2 };
  preview: string;
}

interface PlacedWidget {
  id: string;
  type: WidgetType;
  /** column index (0..3) and row index (0..n) */
  col: number;
  row: number;
  w: 1 | 2 | 3 | 4;
  h: 1 | 2;
}

interface SavedDashboard {
  widgets: PlacedWidget[];
  updatedAt: string;
}

const STORAGE_KEY = "vyne-custom-dashboard";
const COLS = 4;

const PALETTE: WidgetMeta[] = [
  {
    type: "stat-revenue",
    label: "MRR — total",
    icon: DollarSign,
    defaultSize: { w: 1, h: 1 },
    preview: "$48.2k +12% wow",
  },
  {
    type: "stat-orders",
    label: "Open orders",
    icon: ShoppingCart,
    defaultSize: { w: 1, h: 1 },
    preview: "156 · 4 urgent",
  },
  {
    type: "stat-active-users",
    label: "Active users (24h)",
    icon: Users,
    defaultSize: { w: 1, h: 1 },
    preview: "284 · +9%",
  },
  {
    type: "stat-system-health",
    label: "System health",
    icon: Cpu,
    defaultSize: { w: 1, h: 1 },
    preview: "4 / 5 services green",
  },
  {
    type: "chart-revenue",
    label: "Revenue · 6mo trend",
    icon: TrendingUp,
    defaultSize: { w: 2, h: 2 },
    preview: "Bar chart preview",
  },
  {
    type: "list-incidents",
    label: "Active incidents",
    icon: AlertCircle,
    defaultSize: { w: 2, h: 1 },
    preview: "1 critical · api-service v2.4.1",
  },
  {
    type: "list-recent-issues",
    label: "Recent issues",
    icon: Layers,
    defaultSize: { w: 2, h: 2 },
    preview: "ENG-43 · ENG-45 · ENG-47",
  },
  {
    type: "ai-summary",
    label: "Vyne AI summary",
    icon: Activity,
    defaultSize: { w: 2, h: 1 },
    preview: "47 orders stuck · $12.4k risk",
  },
  {
    type: "team-presence",
    label: "Team presence",
    icon: Users,
    defaultSize: { w: 1, h: 2 },
    preview: "5 online · 2 away",
  },
];

const PALETTE_BY_TYPE = new Map(PALETTE.map((p) => [p.type, p]));

const DEFAULT_WIDGETS: PlacedWidget[] = [
  { id: "w1", type: "stat-revenue", col: 0, row: 0, w: 1, h: 1 },
  { id: "w2", type: "stat-orders", col: 1, row: 0, w: 1, h: 1 },
  { id: "w3", type: "stat-active-users", col: 2, row: 0, w: 1, h: 1 },
  { id: "w4", type: "stat-system-health", col: 3, row: 0, w: 1, h: 1 },
  { id: "w5", type: "ai-summary", col: 0, row: 1, w: 4, h: 1 },
  { id: "w6", type: "chart-revenue", col: 0, row: 2, w: 2, h: 2 },
  { id: "w7", type: "list-recent-issues", col: 2, row: 2, w: 2, h: 2 },
];

function loadDashboard(): SavedDashboard {
  if (typeof window === "undefined") {
    return { widgets: DEFAULT_WIDGETS, updatedAt: new Date().toISOString() };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { widgets: DEFAULT_WIDGETS, updatedAt: new Date().toISOString() };
    }
    return JSON.parse(raw) as SavedDashboard;
  } catch {
    return { widgets: DEFAULT_WIDGETS, updatedAt: new Date().toISOString() };
  }
}

function saveDashboard(widgets: PlacedWidget[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ widgets, updatedAt: new Date().toISOString() }),
    );
  } catch {
    // ignore
  }
}

export default function DashboardPage() {
  const [widgets, setWidgets] = useState<PlacedWidget[]>(DEFAULT_WIDGETS);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragNew, setDragNew] = useState<WidgetType | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setWidgets(loadDashboard().widgets);
  }, []);

  // Auto-arrange: sort widgets so they render in grid order
  const sorted = useMemo(() => {
    return [...widgets].sort((a, b) => a.row - b.row || a.col - b.col);
  }, [widgets]);

  const totalRows = useMemo(
    () => Math.max(4, ...widgets.map((w) => w.row + w.h)) + 1,
    [widgets],
  );

  const onSlotDrop = useCallback(
    (col: number, row: number) => {
      if (dragId) {
        setWidgets((prev) =>
          prev.map((w) => (w.id === dragId ? { ...w, col, row } : w)),
        );
        setDirty(true);
        setDragId(null);
        return;
      }
      if (dragNew) {
        const meta = PALETTE_BY_TYPE.get(dragNew);
        if (!meta) return;
        const newWidget: PlacedWidget = {
          id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: dragNew,
          col: Math.min(col, COLS - meta.defaultSize.w),
          row,
          w: meta.defaultSize.w,
          h: meta.defaultSize.h,
        };
        setWidgets((prev) => [...prev, newWidget]);
        setDirty(true);
        setDragNew(null);
      }
    },
    [dragId, dragNew],
  );

  function removeWidget(id: string) {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
    setDirty(true);
  }

  function resetDashboard() {
    setWidgets(DEFAULT_WIDGETS);
    setDirty(true);
  }

  function persist() {
    saveDashboard(widgets);
    setDirty(false);
  }

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "14px 24px",
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            My Dashboard
          </h1>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: 12,
              color: "var(--text-tertiary)",
            }}
          >
            Drag widgets from the palette → drop on the grid · resize from the
            top-right corner · saved per-user.
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={resetDashboard}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 14px",
            borderRadius: 8,
            border: "1px solid var(--content-border)",
            background: "var(--content-bg)",
            color: "var(--text-secondary)",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <RotateCcw size={12} /> Reset
        </button>
        <button
          type="button"
          onClick={persist}
          disabled={!dirty}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: dirty
              ? "var(--vyne-purple)"
              : "var(--content-border)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: dirty ? "pointer" : "default",
          }}
        >
          <Save size={12} /> {dirty ? "Save layout" : "Saved"}
        </button>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "240px 1fr",
          flex: 1,
          overflow: "hidden",
        }}
      >
        {/* Palette */}
        <aside
          style={{
            borderRight: "1px solid var(--content-border)",
            background: "var(--content-secondary)",
            overflowY: "auto",
            padding: 14,
          }}
          aria-label="Widget palette"
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "var(--text-tertiary)",
              marginBottom: 10,
            }}
          >
            Widgets
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PALETTE.map((w) => {
              const Icon = w.icon;
              return (
                <button
                  key={w.type}
                  type="button"
                  draggable
                  onDragStart={() => {
                    setDragNew(w.type);
                    setDragId(null);
                  }}
                  onDragEnd={() => setDragNew(null)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: 10,
                    borderRadius: 9,
                    border: "1px solid var(--content-border)",
                    background: "var(--content-bg)",
                    color: "var(--text-primary)",
                    fontSize: 12,
                    cursor: "grab",
                    textAlign: "left",
                  }}
                >
                  <Icon
                    size={14}
                    style={{
                      color: "var(--vyne-purple)",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{w.label}</div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text-tertiary)",
                        marginTop: 2,
                      }}
                    >
                      {w.preview}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <p
            style={{
              fontSize: 10,
              color: "var(--text-tertiary)",
              marginTop: 14,
              lineHeight: 1.5,
            }}
          >
            💡 Tip: drag a placed widget by its handle to reposition. Layouts
            are saved per user in your browser.
          </p>
        </aside>

        {/* Grid */}
        <div
          style={{
            overflow: "auto",
            padding: 18,
            background: "var(--content-bg)",
          }}
          className="content-scroll"
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${COLS}, 1fr)`,
              gridAutoRows: 130,
              gap: 14,
              minHeight: "100%",
              position: "relative",
            }}
          >
            {/* Drop slots — one per cell */}
            {Array.from({ length: totalRows }).map((_, row) =>
              Array.from({ length: COLS }).map((_, col) => (
                <DropSlot
                  key={`slot-${row}-${col}`}
                  col={col}
                  row={row}
                  onDrop={onSlotDrop}
                  dragging={dragId !== null || dragNew !== null}
                />
              )),
            )}

            {/* Placed widgets */}
            {sorted.map((w) => (
              <Tile
                key={w.id}
                widget={w}
                onDragStart={() => {
                  setDragId(w.id);
                  setDragNew(null);
                }}
                onDragEnd={() => setDragId(null)}
                onResize={(w2, h2) => {
                  setWidgets((prev) =>
                    prev.map((x) =>
                      x.id === w.id ? { ...x, w: w2, h: h2 } : x,
                    ),
                  );
                  setDirty(true);
                }}
                onRemove={() => removeWidget(w.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DropSlot({
  col,
  row,
  onDrop,
  dragging,
}: {
  col: number;
  row: number;
  onDrop: (col: number, row: number) => void;
  dragging: boolean;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={() => {
        setOver(false);
        onDrop(col, row);
      }}
      style={{
        gridColumn: col + 1,
        gridRow: row + 1,
        borderRadius: 10,
        border: dragging
          ? `2px dashed ${over ? "var(--vyne-purple)" : "var(--content-border)"}`
          : "2px dashed transparent",
        background: over ? "rgba(6, 182, 212,0.08)" : "transparent",
        transition: "background 0.1s, border-color 0.1s",
        pointerEvents: dragging ? "auto" : "none",
      }}
    />
  );
}

function Tile({
  widget,
  onDragStart,
  onDragEnd,
  onResize,
  onRemove,
}: {
  widget: PlacedWidget;
  onDragStart: () => void;
  onDragEnd: () => void;
  onResize: (w: 1 | 2 | 3 | 4, h: 1 | 2) => void;
  onRemove: () => void;
}) {
  const meta = PALETTE_BY_TYPE.get(widget.type);
  const Icon = meta?.icon ?? Activity;
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        gridColumn: `${widget.col + 1} / span ${widget.w}`,
        gridRow: `${widget.row + 1} / span ${widget.h}`,
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 12,
        padding: 14,
        position: "relative",
        boxShadow: "var(--shadow-sm)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        cursor: "grab",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <GripVertical
          size={13}
          style={{ color: "var(--text-tertiary)", cursor: "grab" }}
        />
        <Icon size={13} style={{ color: "var(--vyne-purple)" }} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--text-tertiary)",
            flex: 1,
          }}
        >
          {meta?.label ?? widget.type}
        </span>
        <select
          value={`${widget.w}x${widget.h}`}
          onChange={(e) => {
            const [w, h] = e.target.value.split("x").map((n) => Number(n));
            onResize(w as 1 | 2 | 3 | 4, h as 1 | 2);
          }}
          aria-label="Resize"
          style={{
            padding: "2px 6px",
            borderRadius: 5,
            border: "1px solid var(--content-border)",
            background: "var(--content-bg)",
            color: "var(--text-secondary)",
            fontSize: 10,
            fontWeight: 600,
            cursor: "pointer",
            outline: "none",
            fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
          }}
        >
          {(["1x1", "1x2", "2x1", "2x2", "3x1", "4x1"] as const).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label="Remove widget"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            border: "1px solid var(--content-border)",
            background: "var(--content-bg)",
            color: "var(--status-danger)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Trash2 size={11} />
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <WidgetBody type={widget.type} />
      </div>
    </div>
  );
}

function WidgetBody({ type }: { type: WidgetType }) {
  switch (type) {
    case "stat-revenue":
      return <Stat label="MRR" value="$48,200" delta="+12% WoW" up />;
    case "stat-orders":
      return <Stat label="Open orders" value="156" delta="4 urgent today" up={false} accent="warn" />;
    case "stat-active-users":
      return <Stat label="Active users (24h)" value="284" delta="+9%" up />;
    case "stat-system-health":
      return <Stat label="System health" value="4 / 5" delta="1 service degraded" up={false} accent="danger" />;
    case "chart-revenue":
      return <RevenueChart />;
    case "list-incidents":
      return <IncidentList />;
    case "list-recent-issues":
      return <IssueList />;
    case "ai-summary":
      return <AiSummary />;
    case "team-presence":
      return <TeamPresence />;
    default:
      return null;
  }
}

function Stat({
  label,
  value,
  delta,
  up,
  accent,
}: {
  label: string;
  value: string;
  delta: string;
  up: boolean;
  accent?: "warn" | "danger";
}) {
  const deltaColor =
    accent === "danger"
      ? "var(--status-danger)"
      : accent === "warn"
        ? "var(--status-warning)"
        : up
          ? "var(--badge-success-text)"
          : "var(--text-tertiary)";
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: "var(--text-tertiary)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: deltaColor, marginTop: 4 }}>
        {delta}
      </div>
    </div>
  );
}

function RevenueChart() {
  const months = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];
  const values = [32, 38, 41, 44, 46, 48];
  const max = Math.max(...values);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 6,
        height: "100%",
        paddingTop: 6,
      }}
    >
      {values.map((v, i) => (
        <div
          key={months[i]}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          <div
            style={{
              width: "100%",
              height: `${(v / max) * 100}%`,
              minHeight: 12,
              background:
                "linear-gradient(180deg, #06B6D4, rgba(6, 182, 212,0.4))",
              borderRadius: "4px 4px 0 0",
            }}
          />
          <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
            {months[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

function IncidentList() {
  const incidents = [
    { sev: "critical", title: "api-service v2.4.1 deploy failed", meta: "47 orders · $12.4k risk" },
    { sev: "minor", title: "AI latency p95 elevated", meta: "Resolved 30 min ago" },
  ];
  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {incidents.map((i) => (
        <li
          key={i.title}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: 8,
            borderRadius: 7,
            background:
              i.sev === "critical"
                ? "var(--badge-danger-bg)"
                : "var(--content-secondary)",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background:
                i.sev === "critical"
                  ? "var(--status-danger)"
                  : "var(--status-warning)",
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {i.title}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
              {i.meta}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function IssueList() {
  const issues = [
    { id: "ENG-43", title: "Fix Secrets Manager IAM permission", priority: "urgent" },
    { id: "ENG-45", title: "LangGraph agent orchestration review", priority: "high" },
    { id: "ENG-47", title: "Add Stripe usage metering", priority: "high" },
    { id: "ENG-41", title: "TimescaleDB metrics schema migration", priority: "medium" },
  ];
  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        overflow: "auto",
      }}
    >
      {issues.map((i) => (
        <li
          key={i.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 8px",
            borderRadius: 6,
            fontSize: 12,
            color: "var(--text-primary)",
          }}
        >
          <span
            style={{
              padding: "1px 6px",
              borderRadius: 4,
              background: "var(--content-secondary)",
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            {i.id}
          </span>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {i.title}
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color:
                i.priority === "urgent"
                  ? "var(--status-danger)"
                  : i.priority === "high"
                    ? "var(--status-warning)"
                    : "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {i.priority}
          </span>
        </li>
      ))}
    </ul>
  );
}

function AiSummary() {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 10,
        background: "var(--alert-purple-bg)",
        border: "1px solid var(--alert-purple-border)",
        height: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 6,
          color: "var(--vyne-purple)",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
        }}
      >
        ✨ Vyne AI · 7 min ago
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.55,
          color: "var(--text-primary)",
        }}
      >
        Deploy <strong>api-service v2.4.1</strong> failed → <strong>47 orders stuck</strong> in
        processing → <strong style={{ color: "var(--status-danger)" }}>$12,400</strong> at risk.
        Rollback queued — confirm in #alerts.
      </p>
    </div>
  );
}

function TeamPresence() {
  const team = [
    { name: "Preet", status: "online", color: "#06B6D4" },
    { name: "Sarah", status: "online", color: "#22C55E" },
    { name: "Tony", status: "away", color: "#F59E0B" },
    { name: "Maya", status: "online", color: "#EC4899" },
    { name: "Diego", status: "online", color: "#3B82F6" },
    { name: "Aki", status: "away", color: "#8B5CF6" },
  ];
  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {team.map((m) => (
        <li
          key={m.name}
          style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: m.color,
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {m.name[0]}
          </div>
          <span style={{ color: "var(--text-primary)", fontWeight: 500, flex: 1 }}>
            {m.name}
          </span>
          <span
            style={{
              fontSize: 10,
              color:
                m.status === "online"
                  ? "var(--badge-success-text)"
                  : "var(--text-tertiary)",
              textTransform: "capitalize",
            }}
          >
            ● {m.status}
          </span>
        </li>
      ))}
    </ul>
  );
}
