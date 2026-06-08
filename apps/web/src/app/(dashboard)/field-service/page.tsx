"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Truck,
  Filter,
  Layers,
  GanttChart as GanttIcon,
  UserPlus,
  CalendarClock,
  Trash2,
  BarChart3,
} from "lucide-react";
import { FieldServiceDashboardView } from "@/components/fieldservice/FieldServiceDashboardView";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/shared/Kit";
import { AskAiButton } from "@/components/shared/AskAiButton";
import { ExportButton } from "@/components/shared/ExportButton";
import { BulkActionsBar } from "@/components/shared/BulkActionsBar";
import { useSavedViews } from "@/hooks/useSavedViews";
import { useAiSuggestedPrompts } from "@/hooks/useAiSuggestedPrompts";
import { useRegisterAiCommands } from "@/hooks/useRegisterAiCommands";
import { useRegisterCommands } from "@/hooks/useRegisterCommands";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { SavedViewsBar } from "@/components/shared/SavedViewsBar";
import {
  GanttBoard,
  type GanttRow,
  type GanttGroupBy,
  type GanttZoom,
} from "@/components/shared/gantt";
import { optimisticAction } from "@/lib/optimistic";
import {
  useFieldServiceStore,
  useFieldJobs,
  useTechnicians,
  type FieldJob,
  type FieldJobPriority,
  type FieldJobStatus,
  type FieldRegion,
  type FieldSkill,
} from "@/lib/stores/fieldService";

// ─── Filter shape ─────────────────────────────────────────────────

interface FsFilters extends Record<string, unknown> {
  technicianIds: string[];
  regions: FieldRegion[];
  skills: FieldSkill[];
  statuses: FieldJobStatus[];
  priorities: FieldJobPriority[];
  onlyUnassigned: boolean;
  onlyUrgent: boolean;
  groupBy: GanttGroupBy;
  zoom: GanttZoom;
  showWeekends: boolean;
  showCriticalPath: boolean;
  selectionMode: boolean;
}

const DEFAULT_FILTERS: FsFilters = {
  technicianIds: [],
  regions: [],
  skills: [],
  statuses: [],
  priorities: [],
  onlyUnassigned: false,
  onlyUrgent: false,
  groupBy: "custom",
  zoom: "day",
  showWeekends: true,
  showCriticalPath: false,
  selectionMode: false,
};

const REGION_OPTS: FieldRegion[] = [
  "north",
  "south",
  "east",
  "west",
  "central",
];
const SKILL_OPTS: FieldSkill[] = [
  "hvac",
  "electrical",
  "plumbing",
  "carpentry",
  "it",
  "appliance",
];
const STATUS_OPTS: FieldJobStatus[] = [
  "scheduled",
  "dispatched",
  "in_progress",
  "on_site",
  "completed",
  "cancelled",
];
const PRIORITY_OPTS: FieldJobPriority[] = ["urgent", "high", "medium", "low"];

const PRIORITY_COLOR: Record<FieldJobPriority, string> = {
  urgent: "#991B1B",
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#22C55E",
};

// ─── Page ─────────────────────────────────────────────────────────

export default function FieldServicePage() {
  return (
    <Suspense fallback={null}>
      <FieldServicePageInner />
    </Suspense>
  );
}

function FieldServicePageInner() {
  const [view, setView] = useState<"dashboard" | "schedule">("schedule");

  // Honour ?view=dashboard|schedule from sidebar.
  const searchParams = useSearchParams();
  const urlView = searchParams.get("view");
  useEffect(() => {
    if (urlView === "dashboard" || urlView === "schedule") setView(urlView);
  }, [urlView]);

  const jobs = useFieldJobs();
  const technicians = useTechnicians();
  const updateJob = useFieldServiceStore((s) => s.updateJob);
  const deleteJob = useFieldServiceStore((s) => s.deleteJob);
  const assignJob = useFieldServiceStore((s) => s.assignJob);

  const views = useSavedViews<FsFilters>({
    storageKey: "field-service",
    defaultFilters: DEFAULT_FILTERS,
    builtinViews: [
      {
        id: "fs-builtin-today",
        name: "Today",
        filters: { ...DEFAULT_FILTERS },
        pinned: true,
      },
      {
        id: "fs-builtin-urgent",
        name: "Urgent only",
        filters: { ...DEFAULT_FILTERS, onlyUrgent: true },
      },
      {
        id: "fs-builtin-unassigned",
        name: "Unassigned",
        filters: { ...DEFAULT_FILTERS, onlyUnassigned: true, groupBy: "none" },
      },
    ],
  });
  const { filters, setFilters } = views;
  const setFilter = useCallback(
    <K extends keyof FsFilters>(key: K, value: FsFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [setFilters],
  );

  // ─── Visible jobs ────────────────────────────────────────────
  const visibleJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (filters.onlyUnassigned && j.technicianId) return false;
      if (filters.onlyUrgent && j.priority !== "urgent") return false;
      if (filters.technicianIds.length > 0) {
        if (
          !j.technicianId ||
          !filters.technicianIds.includes(j.technicianId)
        ) {
          return false;
        }
      }
      if (filters.regions.length > 0 && !filters.regions.includes(j.region)) {
        return false;
      }
      if (filters.skills.length > 0 && !filters.skills.includes(j.skill)) {
        return false;
      }
      if (filters.statuses.length > 0 && !filters.statuses.includes(j.status)) {
        return false;
      }
      if (
        filters.priorities.length > 0 &&
        !filters.priorities.includes(j.priority)
      ) {
        return false;
      }
      return true;
    });
  }, [jobs, filters]);

  // ─── GanttRow mapping ────────────────────────────────────────
  const rows = useMemo<GanttRow[]>(() => {
    return visibleJobs.map((j) => {
      const tech = technicians.find((t) => t.id === j.technicianId);
      const baseColor = tech?.color ?? PRIORITY_COLOR[j.priority];
      return {
        id: j.id,
        label: `${j.jobNumber} · ${j.title}`,
        start: j.scheduledStart,
        end: j.scheduledEnd,
        groupId: j.technicianId ?? "unassigned",
        color: baseColor,
        status: j.status,
        priority: j.priority,
        progress:
          j.status === "completed"
            ? 1
            : j.status === "in_progress" || j.status === "on_site"
              ? 0.55
              : j.status === "dispatched"
                ? 0.25
                : 0.1,
        meta: `${j.customerName} · ${j.region} · ${j.skill} · ${j.priority}`,
      };
    });
  }, [visibleJobs, technicians]);

  // Per-tech back-to-back FS dependency edges so the critical-path
  // toggle has something meaningful to walk inside each swimlane.
  const dependencies = useMemo(() => {
    const byTech = new Map<string, GanttRow[]>();
    for (const r of rows) {
      const key = r.groupId ?? "unassigned";
      if (!byTech.has(key)) byTech.set(key, []);
      byTech.get(key)!.push(r);
    }
    const deps: { fromId: string; toId: string; type?: "FS" }[] = [];
    for (const [key, list] of byTech) {
      if (key === "unassigned") continue;
      const sorted = [...list].sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      );
      for (let i = 1; i < sorted.length; i++) {
        deps.push({ fromId: sorted[i - 1].id, toId: sorted[i].id, type: "FS" });
      }
    }
    return deps;
  }, [rows]);

  const groupLabel = useCallback(
    (groupId: string): string => {
      if (filters.groupBy !== "custom") return groupId;
      if (groupId === "unassigned") return "Unassigned";
      const tech = technicians.find((t) => t.id === groupId);
      if (!tech) return groupId;
      const skills = tech.skills.map((s) => s.toUpperCase()).join(" / ");
      return `${tech.name} · ${tech.region} · ${skills}`;
    },
    [filters.groupBy, technicians],
  );

  // ─── Bulk selection + actions ────────────────────────────────
  const selection = useBulkSelection();
  const selected = useMemo(
    () => jobs.filter((j) => selection.isSelected(j.id)),
    [jobs, selection],
  );

  const bulkActions = useMemo(
    () => [
      {
        id: "fs-bulk-assign",
        label: "Assign to…",
        icon: UserPlus,
        onClick: () => {
          const target = window.prompt(
            "Assign to (initials or name; empty to unassign):",
            "",
          );
          if (target === null) return;
          const tech = target
            ? technicians.find(
                (t) =>
                  t.initials.toLowerCase() === target.trim().toLowerCase() ||
                  t.name.toLowerCase().includes(target.trim().toLowerCase()),
              )
            : null;
          for (const j of selected) assignJob(j.id, tech?.id ?? null);
          toast.success(
            tech
              ? `Assigned ${selected.length} to ${tech.name}`
              : `Unassigned ${selected.length}`,
          );
          selection.clear();
        },
      },
      {
        id: "fs-bulk-push",
        label: "Push +1d",
        icon: CalendarClock,
        onClick: () => {
          for (const j of selected) {
            const ns = new Date(
              new Date(j.scheduledStart).getTime() + 86_400_000,
            ).toISOString();
            const ne = new Date(
              new Date(j.scheduledEnd).getTime() + 86_400_000,
            ).toISOString();
            updateJob(j.id, { scheduledStart: ns, scheduledEnd: ne });
          }
          toast.success(`Pushed ${selected.length} by 1 day`);
          selection.clear();
        },
      },
      {
        id: "fs-bulk-delete",
        label: "Delete",
        icon: Trash2,
        destructive: true,
        onClick: () => {
          if (
            !window.confirm(
              `Delete ${selected.length} job(s)? This cannot be undone.`,
            )
          ) {
            return;
          }
          for (const j of selected) deleteJob(j.id);
          toast.success(`Deleted ${selected.length} job(s)`);
          selection.clear();
        },
      },
    ],
    [selected, selection, technicians, assignJob, updateJob, deleteJob],
  );

  // ─── Drag callbacks ──────────────────────────────────────────
  const handleReschedule = useCallback(
    (id: string, start: string, end: string) => {
      const job = jobs.find((j) => j.id === id);
      if (!job) return;
      const prevStart = job.scheduledStart;
      const prevEnd = job.scheduledEnd;
      void optimisticAction({
        apply: () =>
          updateJob(id, { scheduledStart: start, scheduledEnd: end }),
        rollback: () =>
          updateJob(id, { scheduledStart: prevStart, scheduledEnd: prevEnd }),
        silent: true,
      });
    },
    [jobs, updateJob],
  );

  const handleRowClick = useCallback(
    (id: string) => {
      if (filters.selectionMode) {
        selection.toggle(id);
        return;
      }
      const j = jobs.find((x) => x.id === id);
      if (!j) return;
      toast(
        `${j.jobNumber} · ${j.customerName}\n${j.address}\n${j.skill} · ${j.priority}`,
        { duration: 4000 },
      );
    },
    [filters.selectionMode, selection, jobs],
  );

  // ─── Cmd+K + AI ──────────────────────────────────────────────
  const suggestions = useAiSuggestedPrompts();
  useRegisterAiCommands("field-service");
  useRegisterCommands("field-service", [
    {
      id: "fs-zoom-day",
      label: "Field Service: Zoom to Day",
      icon: <GanttIcon size={14} />,
      action: () => setFilter("zoom", "day"),
    },
    {
      id: "fs-zoom-week",
      label: "Field Service: Zoom to Week",
      icon: <GanttIcon size={14} />,
      action: () => setFilter("zoom", "week"),
    },
    {
      id: "fs-group-tech",
      label: "Field Service: Group by Technician",
      icon: <Layers size={14} />,
      action: () => setFilter("groupBy", "custom"),
    },
    {
      id: "fs-group-status",
      label: "Field Service: Group by Status",
      icon: <Layers size={14} />,
      action: () => setFilter("groupBy", "status"),
    },
    {
      id: "fs-only-urgent",
      label: "Field Service: Toggle urgent only",
      icon: <Filter size={14} />,
      action: () => setFilter("onlyUrgent", !filters.onlyUrgent),
    },
    {
      id: "fs-only-unassigned",
      label: "Field Service: Toggle unassigned only",
      icon: <Filter size={14} />,
      action: () => setFilter("onlyUnassigned", !filters.onlyUnassigned),
    },
  ]);

  // ─── Export rows ─────────────────────────────────────────────
  const exportRows = useMemo(
    () =>
      visibleJobs.map((j) => ({
        jobNumber: j.jobNumber,
        title: j.title,
        customer: j.customerName,
        region: j.region,
        skill: j.skill,
        priority: j.priority,
        status: j.status,
        technician:
          technicians.find((t) => t.id === j.technicianId)?.name ?? "—",
        start: j.scheduledStart,
        end: j.scheduledEnd,
        estimatedHours: j.estimatedHours,
      })),
    [visibleJobs, technicians],
  );

  // ─── Capacity warnings (over-allocated tech this week) ───────
  const capacityWarnings = useMemo(() => {
    const weekFrom = new Date();
    weekFrom.setUTCHours(0, 0, 0, 0);
    const weekTo = new Date(weekFrom);
    weekTo.setUTCDate(weekTo.getUTCDate() + 7);
    const hoursByTech = new Map<string, number>();
    for (const j of visibleJobs) {
      if (!j.technicianId) continue;
      const start = new Date(j.scheduledStart).getTime();
      if (start < weekFrom.getTime() || start >= weekTo.getTime()) continue;
      hoursByTech.set(
        j.technicianId,
        (hoursByTech.get(j.technicianId) ?? 0) + j.estimatedHours,
      );
    }
    const warnings: { name: string; booked: number; cap: number }[] = [];
    for (const t of technicians) {
      const booked = hoursByTech.get(t.id) ?? 0;
      if (booked > t.weeklyCapacityHours) {
        warnings.push({ name: t.name, booked, cap: t.weeklyCapacityHours });
      }
    }
    return warnings;
  }, [visibleJobs, technicians]);

  if (view === "dashboard") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Section heading — section navigation now lives in the left sidebar. */}
        <div
          style={{
            padding: "10px 20px",
            borderBottom: "1px solid var(--content-border)",
            background: "var(--content-bg)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          <BarChart3 size={14} /> Dashboard
        </div>
        <FieldServiceDashboardView />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Section heading — section navigation now lives in the left sidebar. */}
      <div
        style={{
          padding: "10px 20px",
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          fontWeight: 700,
          color: "var(--text-primary)",
        }}
      >
        <CalendarClock size={14} /> Schedule
      </div>
      <SavedViewsBar store={views} noun="field service" />
      <PageHeader
        icon={<Truck size={16} />}
        title="Field Service"
        subtitle={`${visibleJobs.length} job${visibleJobs.length === 1 ? "" : "s"} · ${
          new Set(visibleJobs.map((j) => j.technicianId ?? "unassigned")).size
        } tech${
          new Set(visibleJobs.map((j) => j.technicianId ?? "unassigned"))
            .size === 1
            ? ""
            : "s"
        }`}
        actions={
          <>
            <AskAiButton noun="field service" suggestions={suggestions} />
            <ExportButton
              data={exportRows}
              filename={`field-service-${views.activeView?.name ?? "all"}`}
              audit={{
                noun: "field jobs",
                viewName: views.activeView?.name ?? null,
                filters: {
                  technicianIds: filters.technicianIds.join(",") || "all",
                  regions: filters.regions.join(",") || "all",
                  skills: filters.skills.join(",") || "all",
                  statuses: filters.statuses.join(",") || "all",
                  priorities: filters.priorities.join(",") || "all",
                  onlyUnassigned: filters.onlyUnassigned ? "true" : "false",
                  onlyUrgent: filters.onlyUrgent ? "true" : "false",
                  groupBy: filters.groupBy,
                  zoom: filters.zoom,
                },
              }}
            />
          </>
        }
      />

      {capacityWarnings.length > 0 && (
        <div
          role="alert"
          style={{
            padding: "8px 14px",
            background: "var(--badge-warning-bg, #FFFBEB)",
            color: "var(--badge-warning-text)",
            fontSize: 12,
            borderBottom: "1px solid var(--content-border)",
          }}
        >
          {capacityWarnings
            .map((w) => `${w.name} booked ${w.booked}h vs ${w.cap}h capacity`)
            .join(" · ")}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          flex: 1,
          minHeight: 0,
        }}
      >
        <FieldServiceFilterRail
          filters={filters}
          setFilter={setFilter}
          technicians={technicians}
        />
        <div
          style={{
            padding: 16,
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <FieldServiceToolbar
            filters={filters}
            setFilter={setFilter}
            selectedCount={selection.selectedCount}
            onClearSelection={selection.clear}
            onSelectAll={() => selection.selectAll(rows.map((r) => r.id))}
          />
          {rows.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: "var(--text-tertiary)",
                fontSize: 13,
                border: "1px dashed var(--content-border)",
                borderRadius: 12,
              }}
            >
              No jobs match your filters yet.
            </div>
          ) : (
            <GanttBoard
              rows={rows}
              dependencies={dependencies}
              groupBy={filters.groupBy}
              groupLabel={groupLabel}
              zoom={filters.zoom}
              showWeekends={filters.showWeekends}
              showCriticalPath={filters.showCriticalPath}
              onRescheduleRow={handleReschedule}
              onResizeRow={handleReschedule}
              onRowClick={handleRowClick}
              title="Technician schedule"
            />
          )}
        </div>
      </div>

      <BulkActionsBar
        count={selection.selectedCount}
        onClear={selection.clear}
        actions={bulkActions}
      />
    </div>
  );
}

// ─── Filter rail ──────────────────────────────────────────────────

function FieldServiceFilterRail({
  filters,
  setFilter,
  technicians,
}: {
  filters: FsFilters;
  setFilter: <K extends keyof FsFilters>(key: K, value: FsFilters[K]) => void;
  technicians: ReturnType<typeof useTechnicians>;
}) {
  return (
    <aside
      aria-label="Field service filters"
      style={{
        borderRight: "1px solid var(--content-border)",
        background: "var(--content-secondary)",
        overflow: "auto",
        padding: "16px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <FilterSection title="Quick filters" icon={<Filter size={12} />}>
        <ToggleRow
          label="Only urgent"
          checked={filters.onlyUrgent}
          onChange={(v) => setFilter("onlyUrgent", v)}
        />
        <ToggleRow
          label="Only unassigned"
          checked={filters.onlyUnassigned}
          onChange={(v) => setFilter("onlyUnassigned", v)}
        />
      </FilterSection>

      <FilterSection title="Technician">
        <MultiPick
          options={technicians.map((t) => ({
            id: t.id,
            label: t.name,
            color: t.color,
          }))}
          selected={filters.technicianIds}
          onChange={(ids) => setFilter("technicianIds", ids)}
          emptyLabel="Anyone"
        />
      </FilterSection>

      <FilterSection title="Region">
        <MultiPick
          options={REGION_OPTS.map((r) => ({ id: r, label: r }))}
          selected={filters.regions}
          onChange={(ids) => setFilter("regions", ids as FieldRegion[])}
          emptyLabel="All regions"
        />
      </FilterSection>

      <FilterSection title="Skill">
        <MultiPick
          options={SKILL_OPTS.map((s) => ({ id: s, label: s }))}
          selected={filters.skills}
          onChange={(ids) => setFilter("skills", ids as FieldSkill[])}
          emptyLabel="Any skill"
        />
      </FilterSection>

      <FilterSection title="Status">
        <MultiPick
          options={STATUS_OPTS.map((s) => ({
            id: s,
            label: s.replace("_", " "),
          }))}
          selected={filters.statuses}
          onChange={(ids) => setFilter("statuses", ids as FieldJobStatus[])}
          emptyLabel="Any status"
        />
      </FilterSection>

      <FilterSection title="Priority">
        <MultiPick
          options={PRIORITY_OPTS.map((p) => ({
            id: p,
            label: p,
            color: PRIORITY_COLOR[p],
          }))}
          selected={filters.priorities}
          onChange={(ids) => setFilter("priorities", ids as FieldJobPriority[])}
          emptyLabel="Any priority"
        />
      </FilterSection>
    </aside>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────

function FieldServiceToolbar({
  filters,
  setFilter,
  selectedCount,
  onSelectAll,
  onClearSelection,
}: {
  filters: FsFilters;
  setFilter: <K extends keyof FsFilters>(key: K, value: FsFilters[K]) => void;
  selectedCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
}) {
  const select: React.CSSProperties = {
    padding: "4px 8px",
    borderRadius: 6,
    border: "1px solid var(--content-border)",
    background: "var(--content-bg)",
    color: "var(--text-primary)",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    outline: "none",
  };
  return (
    <div
      data-vyne-gantt-toolbar
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 14,
        padding: "8px 12px",
        borderRadius: 8,
        border: "1px solid var(--content-border)",
        background: "var(--content-secondary)",
      }}
    >
      <ZoomSegmented
        value={filters.zoom}
        onChange={(z) => setFilter("zoom", z)}
      />

      <label style={labelStyle}>
        <Layers size={12} aria-hidden="true" />
        Group by
        <select
          aria-label="Group by"
          value={filters.groupBy}
          onChange={(e) => setFilter("groupBy", e.target.value as GanttGroupBy)}
          style={select}
        >
          <option value="custom">Technician</option>
          <option value="status">Status</option>
          <option value="priority">Priority</option>
          <option value="none">None</option>
        </select>
      </label>

      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={filters.showWeekends}
          onChange={(e) => setFilter("showWeekends", e.target.checked)}
        />
        Show weekends
      </label>
      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={filters.showCriticalPath}
          onChange={(e) => setFilter("showCriticalPath", e.target.checked)}
        />
        Critical path
      </label>
      <label style={labelStyle}>
        <input
          type="checkbox"
          checked={filters.selectionMode}
          onChange={(e) => setFilter("selectionMode", e.target.checked)}
        />
        Selection mode
      </label>

      {filters.selectionMode && (
        <div style={{ display: "inline-flex", gap: 6, marginLeft: "auto" }}>
          <button type="button" onClick={onSelectAll} style={chipBtnStyle}>
            Select all
          </button>
          <button
            type="button"
            onClick={onClearSelection}
            style={chipBtnStyle}
            disabled={selectedCount === 0}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

function ZoomSegmented({
  value,
  onChange,
}: {
  value: GanttZoom;
  onChange: (z: GanttZoom) => void;
}) {
  const options: { value: GanttZoom; label: string }[] = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "quarter", label: "Quarter" },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Zoom"
      style={{
        display: "inline-flex",
        padding: 2,
        borderRadius: 6,
        border: "1px solid var(--content-border)",
        background: "var(--content-bg)",
      }}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            type="button"
            key={o.value}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            style={{
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 4,
              border: "none",
              background: selected
                ? "var(--vyne-accent, var(--vyne-purple))"
                : "transparent",
              color: selected ? "#fff" : "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Local UI helpers ────────────────────────────────────────────

function FilterSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <h2
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          margin: 0,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{ ...labelStyle, justifyContent: "space-between", width: "100%" }}
    >
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function MultiPick({
  options,
  selected,
  onChange,
  emptyLabel,
}: {
  options: { id: string; label: string; color?: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  emptyLabel: string;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      <button
        type="button"
        onClick={() => onChange([])}
        aria-pressed={selected.length === 0}
        style={pillStyle(selected.length === 0)}
      >
        {emptyLabel}
      </button>
      {options.map((o) => {
        const on = selected.includes(o.id);
        return (
          <button
            type="button"
            key={o.id}
            onClick={() =>
              onChange(
                on ? selected.filter((x) => x !== o.id) : [...selected, o.id],
              )
            }
            aria-pressed={on}
            style={{
              ...pillStyle(on),
              borderColor: on && o.color ? o.color : pillStyle(on).borderColor,
            }}
          >
            {o.color && (
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  width: 7,
                  height: 7,
                  borderRadius: 2,
                  background: o.color,
                  marginRight: 5,
                }}
              />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Style constants ─────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  color: "var(--text-tertiary)",
};

function pillStyle(active: boolean): React.CSSProperties {
  return {
    padding: "4px 8px",
    borderRadius: 999,
    border: `1px solid ${active ? "var(--vyne-accent, var(--vyne-purple))" : "var(--content-border)"}`,
    background: active
      ? "var(--vyne-accent, var(--vyne-purple))"
      : "var(--content-bg)",
    color: active ? "#fff" : "var(--text-secondary)",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    textTransform: "capitalize",
    display: "inline-flex",
    alignItems: "center",
  };
}

const chipBtnStyle: React.CSSProperties = {
  padding: "4px 8px",
  borderRadius: 6,
  border: "1px solid var(--content-border)",
  background: "var(--content-bg)",
  color: "var(--text-secondary)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};
