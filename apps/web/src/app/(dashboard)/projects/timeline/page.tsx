"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GanttChart as GanttIcon,
  Layers,
  Filter,
  CalendarRange,
  CheckSquare,
  UserPlus,
  CalendarClock,
  Trash2,
  Diamond,
} from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/shared/Kit";
import { ProjectsSubNav } from "@/components/projects/ProjectsSubNav";
import { SavedViewsBar } from "@/components/shared/SavedViewsBar";
import { AskAiButton } from "@/components/shared/AskAiButton";
import { ExportButton } from "@/components/shared/ExportButton";
import { BulkActionsBar } from "@/components/shared/BulkActionsBar";
import { useSavedViews } from "@/hooks/useSavedViews";
import { useAiSuggestedPrompts } from "@/hooks/useAiSuggestedPrompts";
import { useRegisterAiCommands } from "@/hooks/useRegisterAiCommands";
import { useRegisterCommands } from "@/hooks/useRegisterCommands";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import {
  useProjects,
  useProjectsStore,
  useTeamMembers,
  type Task,
  type TaskStatus,
  type TaskPriority,
} from "@/lib/stores/projects";
import {
  GanttBoard,
  type GanttRow,
  type GanttGroupBy,
  type GanttZoom,
} from "@/components/shared/gantt";
import { optimisticAction } from "@/lib/optimistic";

// ─── Filter state ─────────────────────────────────────────────────

type DateWindowPreset = "all" | "7d" | "30d" | "90d" | "custom";

interface TimelineFilters extends Record<string, unknown> {
  projectIds: string[];
  assigneeIds: string[];
  statuses: TaskStatus[];
  priorities: TaskPriority[];
  tag: string;
  window: DateWindowPreset;
  windowStart: string | null;
  windowEnd: string | null;
  onlyMine: boolean;
  onlyOverdue: boolean;
  onlyMilestones: boolean;
  groupBy: GanttGroupBy;
  zoom: GanttZoom;
  showWeekends: boolean;
  showCriticalPath: boolean;
  selectionMode: boolean;
}

const DEFAULT_FILTERS: TimelineFilters = {
  projectIds: [],
  assigneeIds: [],
  statuses: [],
  priorities: [],
  tag: "",
  window: "30d",
  windowStart: null,
  windowEnd: null,
  onlyMine: false,
  onlyOverdue: false,
  onlyMilestones: false,
  groupBy: "project",
  zoom: "week",
  showWeekends: true,
  showCriticalPath: false,
  selectionMode: false,
};

// ─── Page ────────────────────────────────────────────────────────

export default function ProjectsTimelinePage() {
  const router = useRouter();
  const projects = useProjects();
  const allTasks = useProjectsStore((s) => s.tasks);
  const allDependencies = useProjectsStore((s) => s.taskDependencies);
  const updateTask = useProjectsStore((s) => s.updateTask);
  const deleteTask = useProjectsStore((s) => s.deleteTask);
  const addDependency = useProjectsStore((s) => s.addDependency);
  const hydrateTasks = useProjectsStore((s) => s.hydrateTasksFromServer);
  const hydrateDeps = useProjectsStore((s) => s.hydrateDependenciesFromServer);
  const teamMembers = useTeamMembers();

  usePullToRefresh(async () => {
    await Promise.all([hydrateTasks(), hydrateDeps()]);
  });

  const views = useSavedViews<TimelineFilters>({
    storageKey: "projects-timeline",
    defaultFilters: DEFAULT_FILTERS,
    builtinViews: [
      {
        id: "builtin-all",
        name: "All upcoming",
        filters: { ...DEFAULT_FILTERS },
        pinned: true,
      },
      {
        id: "builtin-overdue",
        name: "Overdue",
        filters: { ...DEFAULT_FILTERS, window: "all", onlyOverdue: true },
      },
      {
        id: "builtin-milestones",
        name: "Milestones",
        filters: { ...DEFAULT_FILTERS, onlyMilestones: true, window: "90d" },
      },
    ],
  });
  const { filters, setFilters } = views;

  const setFilter = useCallback(
    <K extends keyof TimelineFilters>(key: K, value: TimelineFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [setFilters],
  );

  // ─── Derived: visible tasks ──────────────────────────────────
  const visibleTasks = useMemo(() => {
    const now = Date.now();
    const { windowStart, windowEnd } = resolveWindow(filters);
    const tagQuery = filters.tag.trim().toLowerCase();
    return allTasks.filter((t) => {
      if (filters.projectIds.length > 0 && !filters.projectIds.includes(t.projectId)) {
        return false;
      }
      if (
        filters.assigneeIds.length > 0 &&
        (!t.assigneeId || !filters.assigneeIds.includes(t.assigneeId))
      ) {
        return false;
      }
      if (filters.statuses.length > 0 && !filters.statuses.includes(t.status)) return false;
      if (filters.priorities.length > 0 && !filters.priorities.includes(t.priority)) return false;
      if (tagQuery && !t.tags.some((tag) => tag.toLowerCase().includes(tagQuery))) {
        return false;
      }
      if (filters.onlyOverdue) {
        if (!t.dueDate) return false;
        if (t.status === "done") return false;
        if (new Date(t.dueDate).getTime() >= now) return false;
      }
      if (filters.onlyMilestones && !taskIsMilestone(t)) return false;

      // Date window — keep tasks whose span overlaps the window.
      const tStart = t.startDate ?? t.createdAt;
      const tEnd = t.dueDate ?? tStart;
      if (windowStart && tEnd && new Date(tEnd).getTime() < windowStart) return false;
      if (windowEnd && tStart && new Date(tStart).getTime() > windowEnd) return false;
      return true;
    });
  }, [allTasks, filters]);

  // ─── Derived: gantt rows ──────────────────────────────────────
  const rows = useMemo<GanttRow[]>(() => {
    const projectColor = new Map(projects.map((p) => [p.id, p.color]));
    return visibleTasks.map((t) => {
      const start = t.startDate ?? t.createdAt;
      const end =
        t.dueDate ??
        (start
          ? new Date(new Date(start).getTime() + 7 * 86_400_000).toISOString()
          : new Date().toISOString());
      return {
        id: t.id,
        label: t.title,
        start,
        end,
        groupId: t.projectId,
        status: t.status,
        priority: t.priority,
        assigneeIds: t.assigneeId ? [t.assigneeId] : [],
        color: projectColor.get(t.projectId),
        milestone: taskIsMilestone(t),
        progress:
          t.status === "done"
            ? 1
            : t.status === "in_progress" || t.status === "in_review"
              ? 0.55
              : 0.1,
        meta: `${t.status}${t.priority ? ` · ${t.priority}` : ""}`,
      };
    });
  }, [visibleTasks, projects]);

  const dependencies = useMemo(() => {
    const visible = new Set(rows.map((r) => r.id));
    return allDependencies
      .filter((d) => visible.has(d.fromTaskId) && visible.has(d.toTaskId))
      .map((d) => ({ fromId: d.fromTaskId, toId: d.toTaskId, type: d.type }));
  }, [allDependencies, rows]);

  const groupLabel = useCallback(
    (groupId: string): string => {
      if (filters.groupBy !== "project") return groupId;
      return projects.find((p) => p.id === groupId)?.name ?? groupId;
    },
    [filters.groupBy, projects],
  );

  // ─── Bulk selection ───────────────────────────────────────────
  const selection = useBulkSelection();
  const visibleIds = useMemo(() => rows.map((r) => r.id), [rows]);

  const handleRowClick = useCallback(
    (id: string) => {
      if (filters.selectionMode) {
        selection.toggle(id);
        return;
      }
      const task = allTasks.find((t) => t.id === id);
      if (!task) return;
      router.push(`/projects/${task.projectId}/tasks/${task.id}`);
    },
    [filters.selectionMode, selection, allTasks, router],
  );

  // ─── Reschedule / resize / link ───────────────────────────────
  const handleReschedule = useCallback(
    (id: string, start: string, end: string) => {
      const task = allTasks.find((t) => t.id === id);
      if (!task) return;
      const prevStart = task.startDate ?? task.createdAt;
      const prevEnd = task.dueDate;
      void optimisticAction({
        apply: () => updateTask(id, { startDate: start, dueDate: end }),
        rollback: () => updateTask(id, { startDate: prevStart, dueDate: prevEnd ?? null }),
        silent: true,
      });
    },
    [allTasks, updateTask],
  );

  const handleLink = useCallback(
    (fromId: string, toId: string) => {
      const created = addDependency(fromId, toId, "FS");
      if (created) toast.success("Dependency linked");
    },
    [addDependency],
  );

  // ─── Bulk actions ─────────────────────────────────────────────
  const selected = useMemo(
    () => allTasks.filter((t) => selection.isSelected(t.id)),
    [allTasks, selection],
  );

  const bulkActions = useMemo(
    () => [
      {
        id: "bulk-reassign",
        label: "Reassign",
        icon: UserPlus,
        onClick: () => {
          const target = window.prompt(
            "Assign to (initials or empty to unassign):",
            "",
          );
          if (target === null) return;
          const member = target
            ? teamMembers.find(
                (m) =>
                  m.initials.toLowerCase() === target.trim().toLowerCase() ||
                  m.name.toLowerCase().includes(target.trim().toLowerCase()),
              )
            : null;
          for (const t of selected) {
            updateTask(t.id, { assigneeId: member?.id ?? null });
          }
          toast.success(
            member
              ? `Reassigned ${selected.length} to ${member.name}`
              : `Unassigned ${selected.length}`,
          );
          selection.clear();
        },
      },
      {
        id: "bulk-reschedule",
        label: "Push +7d",
        icon: CalendarClock,
        onClick: () => {
          for (const t of selected) {
            const start = t.startDate ?? t.createdAt;
            const end = t.dueDate ?? start;
            if (!start || !end) continue;
            const ns = new Date(new Date(start).getTime() + 7 * 86_400_000).toISOString();
            const ne = new Date(new Date(end).getTime() + 7 * 86_400_000).toISOString();
            updateTask(t.id, { startDate: ns, dueDate: ne });
          }
          toast.success(`Pushed ${selected.length} by 7 days`);
          selection.clear();
        },
      },
      {
        id: "bulk-delete",
        label: "Delete",
        icon: Trash2,
        destructive: true,
        onClick: () => {
          if (!window.confirm(`Delete ${selected.length} task(s)? This cannot be undone.`)) {
            return;
          }
          for (const t of selected) deleteTask(t.id);
          toast.success(`Deleted ${selected.length} task(s)`);
          selection.clear();
        },
      },
    ],
    [selected, selection, teamMembers, updateTask, deleteTask],
  );

  // ─── Cmd+K + AI ───────────────────────────────────────────────
  const suggestions = useAiSuggestedPrompts();
  useRegisterAiCommands("timeline");
  useRegisterCommands("projects-timeline", [
    {
      id: "tl-zoom-day",
      label: "Timeline: Zoom to Day",
      icon: <GanttIcon size={14} />,
      action: () => setFilter("zoom", "day"),
    },
    {
      id: "tl-zoom-week",
      label: "Timeline: Zoom to Week",
      icon: <GanttIcon size={14} />,
      action: () => setFilter("zoom", "week"),
    },
    {
      id: "tl-zoom-month",
      label: "Timeline: Zoom to Month",
      icon: <GanttIcon size={14} />,
      action: () => setFilter("zoom", "month"),
    },
    {
      id: "tl-group-project",
      label: "Timeline: Group by Project",
      icon: <Layers size={14} />,
      action: () => setFilter("groupBy", "project"),
    },
    {
      id: "tl-group-assignee",
      label: "Timeline: Group by Assignee",
      icon: <Layers size={14} />,
      action: () => setFilter("groupBy", "assignee"),
    },
    {
      id: "tl-toggle-critical",
      label: "Timeline: Toggle critical path",
      icon: <CheckSquare size={14} />,
      action: () => setFilter("showCriticalPath", !filters.showCriticalPath),
    },
    {
      id: "tl-toggle-overdue",
      label: "Timeline: Only overdue",
      icon: <Filter size={14} />,
      action: () => setFilter("onlyOverdue", !filters.onlyOverdue),
    },
    {
      id: "tl-toggle-mine",
      label: "Timeline: Only my tasks",
      icon: <Filter size={14} />,
      action: () => setFilter("onlyMine", !filters.onlyMine),
    },
  ]);

  // ─── Audit export ─────────────────────────────────────────────
  const auditExportRows = useMemo(
    () =>
      visibleTasks.map((t) => ({
        key: t.key,
        title: t.title,
        project:
          projects.find((p) => p.id === t.projectId)?.name ?? t.projectId,
        status: t.status,
        priority: t.priority,
        assignee:
          teamMembers.find((m) => m.id === t.assigneeId)?.name ?? "",
        startDate: t.startDate ?? "",
        dueDate: t.dueDate ?? "",
        estimatedHours: t.estimatedHours ?? "",
      })),
    [visibleTasks, projects, teamMembers],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <ProjectsSubNav />
      <SavedViewsBar store={views} noun="timeline" />
      <PageHeader
        icon={<GanttIcon size={16} />}
        title="Timeline"
        subtitle={`${visibleTasks.length} task${visibleTasks.length === 1 ? "" : "s"} across ${
          new Set(visibleTasks.map((t) => t.projectId)).size
        } project${new Set(visibleTasks.map((t) => t.projectId)).size === 1 ? "" : "s"}`}
        actions={
          <>
            <AskAiButton noun="timeline" suggestions={suggestions} />
            <ExportButton
              data={auditExportRows}
              filename={`timeline-${views.activeView?.name ?? "all"}`}
              audit={{
                noun: "timeline tasks",
                viewName: views.activeView?.name ?? null,
                filters: {
                  projectIds: filters.projectIds.join(",") || "all",
                  assigneeIds: filters.assigneeIds.join(",") || "all",
                  statuses: filters.statuses.join(",") || "all",
                  priorities: filters.priorities.join(",") || "all",
                  tag: filters.tag || "—",
                  window: filters.window,
                  onlyMine: filters.onlyMine ? "true" : "false",
                  onlyOverdue: filters.onlyOverdue ? "true" : "false",
                  onlyMilestones: filters.onlyMilestones ? "true" : "false",
                  groupBy: filters.groupBy,
                  zoom: filters.zoom,
                },
              }}
            />
          </>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          flex: 1,
          minHeight: 0,
        }}
      >
        <TimelineFilterRail
          filters={filters}
          setFilter={setFilter}
          projects={projects}
          teamMembers={teamMembers}
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
          <TimelineToolbar
            filters={filters}
            setFilter={setFilter}
            selectedCount={selection.selectedCount}
            onClearSelection={selection.clear}
            onSelectAll={() => selection.selectAll(visibleIds)}
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
              No tasks match your filters yet.
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
              onLinkDependency={handleLink}
              onRowClick={handleRowClick}
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

function TimelineFilterRail({
  filters,
  setFilter,
  projects,
  teamMembers,
}: {
  filters: TimelineFilters;
  setFilter: <K extends keyof TimelineFilters>(key: K, value: TimelineFilters[K]) => void;
  projects: ReturnType<typeof useProjects>;
  teamMembers: ReturnType<typeof useTeamMembers>;
}) {
  const STATUS_OPTIONS: TaskStatus[] = ["todo", "in_progress", "in_review", "done", "blocked"];
  const PRIORITY_OPTIONS: TaskPriority[] = ["urgent", "high", "medium", "low"];

  return (
    <aside
      aria-label="Timeline filters"
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
          label="Only my tasks"
          checked={filters.onlyMine}
          onChange={(v) => setFilter("onlyMine", v)}
        />
        <ToggleRow
          label="Only overdue"
          checked={filters.onlyOverdue}
          onChange={(v) => setFilter("onlyOverdue", v)}
        />
        <ToggleRow
          label="Only milestones"
          checked={filters.onlyMilestones}
          onChange={(v) => setFilter("onlyMilestones", v)}
          icon={<Diamond size={11} />}
        />
      </FilterSection>

      <FilterSection title="Date window" icon={<CalendarRange size={12} />}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {(["all", "7d", "30d", "90d", "custom"] as DateWindowPreset[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setFilter("window", p)}
              aria-pressed={filters.window === p}
              style={pillStyle(filters.window === p)}
            >
              {p === "all" ? "All" : p === "custom" ? "Custom" : `Next ${p}`}
            </button>
          ))}
        </div>
        {filters.window === "custom" && (
          <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
            <DateInput
              label="From"
              value={filters.windowStart}
              onChange={(v) => setFilter("windowStart", v)}
            />
            <DateInput
              label="To"
              value={filters.windowEnd}
              onChange={(v) => setFilter("windowEnd", v)}
            />
          </div>
        )}
      </FilterSection>

      <FilterSection title="Project">
        <MultiPick
          options={projects.map((p) => ({ id: p.id, label: p.name, color: p.color }))}
          selected={filters.projectIds}
          onChange={(ids) => setFilter("projectIds", ids)}
          emptyLabel="All projects"
        />
      </FilterSection>

      <FilterSection title="Assignee">
        <MultiPick
          options={teamMembers.map((m) => ({ id: m.id, label: m.name, color: m.color }))}
          selected={filters.assigneeIds}
          onChange={(ids) => setFilter("assigneeIds", ids)}
          emptyLabel="Anyone"
        />
      </FilterSection>

      <FilterSection title="Status">
        <MultiPick
          options={STATUS_OPTIONS.map((s) => ({ id: s, label: s }))}
          selected={filters.statuses}
          onChange={(ids) => setFilter("statuses", ids as TaskStatus[])}
          emptyLabel="Any status"
        />
      </FilterSection>

      <FilterSection title="Priority">
        <MultiPick
          options={PRIORITY_OPTIONS.map((p) => ({ id: p, label: p }))}
          selected={filters.priorities}
          onChange={(ids) => setFilter("priorities", ids as TaskPriority[])}
          emptyLabel="Any priority"
        />
      </FilterSection>

      <FilterSection title="Tag">
        <input
          type="search"
          value={filters.tag}
          onChange={(e) => setFilter("tag", e.target.value)}
          placeholder="contains…"
          aria-label="Filter by tag"
          style={{
            width: "100%",
            padding: "6px 8px",
            borderRadius: 6,
            border: "1px solid var(--content-border)",
            background: "var(--content-bg)",
            color: "var(--text-primary)",
            fontSize: 12,
          }}
        />
      </FilterSection>
    </aside>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────

function TimelineToolbar({
  filters,
  setFilter,
  selectedCount,
  onSelectAll,
  onClearSelection,
}: {
  filters: TimelineFilters;
  setFilter: <K extends keyof TimelineFilters>(key: K, value: TimelineFilters[K]) => void;
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
      <ZoomSegmented value={filters.zoom} onChange={(z) => setFilter("zoom", z)} />

      <label style={labelStyle}>
        <Layers size={12} aria-hidden="true" />
        Group by
        <select
          aria-label="Group by"
          value={filters.groupBy}
          onChange={(e) => setFilter("groupBy", e.target.value as GanttGroupBy)}
          style={select}
        >
          <option value="project">Project</option>
          <option value="none">None</option>
          <option value="assignee">Assignee</option>
          <option value="status">Status</option>
          <option value="priority">Priority</option>
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
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            style={{
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 4,
              border: "none",
              background: selected ? "var(--vyne-accent, var(--vyne-purple))" : "transparent",
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

// ─── Small UI helpers (local) ─────────────────────────────────────

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
  icon,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ReactNode;
}) {
  return (
    <label style={{ ...labelStyle, justifyContent: "space-between", width: "100%" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        {icon}
        {label}
      </span>
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
            key={o.id}
            type="button"
            onClick={() =>
              onChange(on ? selected.filter((x) => x !== o.id) : [...selected, o.id])
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

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11, color: "var(--text-tertiary)" }}>
      {label}
      <input
        type="date"
        value={value ? value.slice(0, 10) : ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v ? new Date(`${v}T00:00:00.000Z`).toISOString() : null);
        }}
        style={{
          padding: "5px 7px",
          borderRadius: 6,
          border: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          color: "var(--text-primary)",
          fontSize: 12,
        }}
      />
    </label>
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
    background: active ? "var(--vyne-accent, var(--vyne-purple))" : "var(--content-bg)",
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

// ─── Pure helpers ─────────────────────────────────────────────────

function taskIsMilestone(t: Task): boolean {
  // Treat tasks with the same start and due date and zero estimated
  // hours as milestones, plus anything tagged "milestone".
  if (t.tags.some((tag) => tag.toLowerCase() === "milestone")) return true;
  if (t.startDate && t.dueDate && t.startDate === t.dueDate) {
    return (t.estimatedHours ?? 0) === 0;
  }
  return false;
}

function resolveWindow(filters: TimelineFilters): {
  windowStart: number | null;
  windowEnd: number | null;
} {
  if (filters.window === "all") return { windowStart: null, windowEnd: null };
  if (filters.window === "custom") {
    return {
      windowStart: filters.windowStart ? new Date(filters.windowStart).getTime() : null,
      windowEnd: filters.windowEnd ? new Date(filters.windowEnd).getTime() : null,
    };
  }
  const now = Date.now();
  const days = filters.window === "7d" ? 7 : filters.window === "30d" ? 30 : 90;
  return { windowStart: now, windowEnd: now + days * 86_400_000 };
}
