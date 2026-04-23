"use client";

import { useState, useMemo, useRef, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeft,
  Plus,
  LayoutList,
  Columns3,
  Calendar as CalendarIcon,
  GanttChart as GanttIcon,
  Layers,
  Search,
  X,
  Calendar,
  Clock,
  User,
  Tag,
  Flag,
  MessageSquare,
  CheckSquare,
  Square,
  Trash2,
  Send,
} from "lucide-react";
import Link from "next/link";
import {
  useProjectsStore,
  useProject,
  useProjectTasks,
  useTeamMembers,
  type ProjectDetail,
} from "@/lib/stores/projects";
import {
  Pill,
  PrimaryLink,
  ViewToggle,
  PipelineBreadcrumb,
  type Tone,
  type PipelineStage,
} from "@/components/shared/Kit";
import {
  TASK_STATUS_META,
  TASK_PRIORITY_META,
  getMember,
  type Task,
  type TaskStatus,
  type TaskPriority,
} from "@/lib/fixtures/projects";
import { cn, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import { CalendarView } from "@/components/shared/CalendarView";
import { GanttChart } from "@/components/shared/GanttChart";

// ─── Constants ──────────────────────────────────────────────────────

type ViewMode = "list" | "board" | "calendar" | "gantt";
type SwimlaneMode = "none" | "assignee" | "priority";

const STATUS_ORDER: TaskStatus[] = [
  "todo",
  "in_progress",
  "in_review",
  "done",
  "blocked",
];
const PRIORITY_ORDER: TaskPriority[] = ["urgent", "high", "medium", "low"];

interface ProjectPageProps {
  readonly params: Promise<{ projectId: string }>;
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function ProjectDetailPage({ params }: ProjectPageProps) {
  const { projectId } = use(params);
  const project = useProject(projectId);
  const tasks = useProjectTasks(projectId);
  const teamMembers = useTeamMembers();
  const updateProject = useProjectsStore((s) => s.updateProject);

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [swimlaneMode, setSwimlaneMode] = useState<SwimlaneMode>("none");
  const [search, setSearch] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  );

  const filteredTasks = useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.toLowerCase();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.key.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [tasks, search]);

  const progress = useMemo(() => {
    if (tasks.length === 0) return 0;
    const done = tasks.filter((t) => t.status === "done").length;
    return Math.round((done / tasks.length) * 100);
  }, [tasks]);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h3
          className="font-semibold text-lg mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          Project not found
        </h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-tertiary)" }}>
          This project may have been deleted or you don&apos;t have access.
        </p>
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-sm font-medium"
          style={{ color: "#06B6D4" }}
        >
          <ArrowLeft size={14} />
          Back to projects
        </Link>
      </div>
    );
  }

  const members = project.memberIds.map((id) => getMember(id)).filter(Boolean);

  const statusTone: Tone =
    project.status === "completed"
      ? "success"
      : project.status === "paused"
        ? "warn"
        : "info";
  const statusLabel =
    project.status === "completed"
      ? "Completed"
      : project.status === "paused"
        ? "On hold"
        : "Active";

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--content-bg-secondary)" }}
    >
      {/* Project Header — muted, Odoo/Linear-adjacent */}
      <header
        className="px-6 pt-5 pb-4 flex-shrink-0"
        style={{
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
        }}
      >
        <div className="flex items-center gap-2 mb-3" style={{ fontSize: 12 }}>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1"
            style={{ color: "var(--text-tertiary)", textDecoration: "none" }}
          >
            <ArrowLeft size={12} />
            Projects
          </Link>
          <span style={{ color: "var(--text-tertiary)" }}>/</span>
          <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
            {project.identifier}
          </span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{
                background: "var(--content-secondary)",
                border: "1px solid var(--content-border)",
              }}
            >
              {project.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    letterSpacing: "-0.015em",
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {project.name}
                </h1>
                <Pill tone={statusTone} dot>
                  {statusLabel}
                </Pill>
              </div>
              {project.description && (
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-tertiary)",
                    margin: "4px 0 0",
                    lineHeight: 1.5,
                    maxWidth: 720,
                  }}
                >
                  {project.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="flex -space-x-2">
              {members.slice(0, 5).map(
                (member) =>
                  member && (
                    <div
                      key={member.id}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white border-2"
                      style={{
                        background: member.color,
                        borderColor: "var(--content-bg)",
                      }}
                      title={member.name}
                    >
                      {member.initials}
                    </div>
                  ),
              )}
            </div>
            <div style={{ minWidth: 160 }}>
              <div
                className="flex items-center justify-between"
                style={{ marginBottom: 4 }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontWeight: 500,
                  }}
                >
                  Progress
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {progress}%
                </span>
              </div>
              <div
                style={{
                  height: 5,
                  borderRadius: 999,
                  background: "var(--content-secondary)",
                  overflow: "hidden",
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  style={{
                    height: "100%",
                    background: "var(--vyne-purple)",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  marginTop: 4,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {tasks.filter((t) => t.status === "done").length} of {tasks.length} tasks
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Pipeline stages — Odoo/ERPNext style */}
      <div
        className="px-6 flex-shrink-0"
        style={{
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
        }}
      >
        {(() => {
          const stages: PipelineStage[] = [
            { id: "active", label: "Active", tone: "info" },
            { id: "paused", label: "On Hold", tone: "warn" },
            { id: "completed", label: "Completed", tone: "success" },
          ];
          const counts = {
            todo: tasks.filter((t) => t.status === "todo").length,
            in_progress: tasks.filter((t) => t.status === "in_progress").length,
            in_review: tasks.filter((t) => t.status === "in_review").length,
            done: tasks.filter((t) => t.status === "done").length,
            blocked: tasks.filter((t) => t.status === "blocked").length,
          };
          const taskStages: PipelineStage[] = [
            { id: "todo", label: "Todo", meta: String(counts.todo), tone: "neutral" },
            { id: "in_progress", label: "In Progress", meta: String(counts.in_progress), tone: "info" },
            { id: "in_review", label: "In Review", meta: String(counts.in_review), tone: "warn" },
            { id: "done", label: "Done", meta: String(counts.done), tone: "success" },
            { id: "blocked", label: "Blocked", meta: String(counts.blocked), tone: "danger" },
          ];
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 10, paddingBottom: 6 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-tertiary)" }}>
                Project status
              </div>
              <PipelineBreadcrumb
                stages={stages}
                activeId={project.status}
                onSelect={(id) => {
                  updateProject(project.id, { status: id as ProjectDetail["status"] });
                }}
              />
              <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-tertiary)", marginTop: 4 }}>
                Task pipeline · drag cards between columns
              </div>
              <PipelineBreadcrumb
                stages={taskStages}
                activeId={
                  counts.in_progress > 0 ? "in_progress" :
                  counts.in_review > 0 ? "in_review" :
                  counts.todo > 0 ? "todo" :
                  counts.blocked > 0 ? "blocked" : "done"
                }
              />
            </div>
          );
        })()}
      </div>

      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-6 py-3 flex-shrink-0 flex-wrap gap-2"
        style={{
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
        }}
      >
        <div className="flex items-center gap-3">
          <ViewToggle
            value={viewMode}
            onChange={setViewMode}
            options={[
              { value: "list", label: "List", icon: <LayoutList size={14} /> },
              { value: "board", label: "Board", icon: <Columns3 size={14} /> },
              { value: "calendar", label: "Calendar", icon: <CalendarIcon size={14} /> },
              { value: "gantt", label: "Gantt", icon: <GanttIcon size={14} /> },
            ]}
          />
          {viewMode === "board" && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "var(--text-tertiary)",
              }}
            >
              <Layers size={12} />
              <span>Group by</span>
              <select
                value={swimlaneMode}
                onChange={(e) => setSwimlaneMode(e.target.value as SwimlaneMode)}
                aria-label="Swimlane grouping"
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid var(--content-border)",
                  background: "var(--content-bg)",
                  color: "var(--text-primary)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="none">None</option>
                <option value="assignee">Assignee</option>
                <option value="priority">Priority</option>
              </select>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{
              background: "var(--content-secondary)",
              border: "1px solid var(--content-border)",
              width: 220,
              height: 32,
            }}
          >
            <Search size={13} style={{ color: "var(--text-tertiary)" }} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              aria-label="Search tasks"
              className="flex-1 bg-transparent text-sm focus:outline-none"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowAddTask(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              height: 32,
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              color: "#fff",
              background: "var(--vyne-purple)",
              border: "none",
              cursor: "pointer",
              transition: "background 0.12s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "var(--vyne-purple-light, #22D3EE)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--vyne-purple)";
            }}
          >
            <Plus size={14} />
            New task
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto content-scroll">
        {viewMode === "list" && (
          <TaskListView tasks={filteredTasks} onTaskClick={setSelectedTaskId} />
        )}
        {viewMode === "board" && (
          <TaskBoardView
            tasks={filteredTasks}
            projectId={projectId}
            onTaskClick={setSelectedTaskId}
            swimlaneMode={swimlaneMode}
          />
        )}
        {viewMode === "calendar" && (
          <div style={{ padding: 20 }}>
            <TaskCalendarView
              tasks={filteredTasks}
              onTaskClick={setSelectedTaskId}
            />
          </div>
        )}
        {viewMode === "gantt" && (
          <div style={{ padding: 20 }}>
            <TaskGanttView tasks={filteredTasks} />
          </div>
        )}
      </div>

      {/* Task Detail Panel */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
        />
      )}

      {/* Add Task Modal */}
      <AddTaskModal
        open={showAddTask}
        onClose={() => setShowAddTask(false)}
        projectId={projectId}
      />
    </div>
  );
}

// ─── View Toggle Button ──────────────────────────────────────────

function ViewBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
      style={{
        background: active ? "var(--content-bg)" : "transparent",
        color: active ? "var(--vyne-purple)" : "var(--text-tertiary)",
        boxShadow: active ? "var(--shadow-sm)" : "none",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── LIST VIEW ─────────────────────────────────────────────────────

function TaskListView({
  tasks,
  onTaskClick,
}: {
  tasks: Task[];
  onTaskClick: (id: string) => void;
}) {
  const deleteTask = useProjectsStore((s) => s.deleteTask);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-3xl mb-3">📝</div>
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          No tasks found
        </p>
      </div>
    );
  }

  return (
    <div className="px-6 py-4">
      <table
        className="w-full"
        style={{ borderCollapse: "separate", borderSpacing: 0 }}
      >
        <thead>
          <tr>
            {[
              "Key",
              "Title",
              "Status",
              "Priority",
              "Assignee",
              "Due Date",
              "Est.",
              "Tags",
              "",
            ].map((h) => (
              <th
                key={h}
                className="text-left text-xs font-semibold uppercase tracking-wider px-3 py-2.5"
                style={{
                  color: "var(--text-tertiary)",
                  borderBottom: "1px solid var(--content-border)",
                  background: "var(--content-secondary)",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, i) => {
            const statusMeta = TASK_STATUS_META[task.status];
            const priorityMeta = TASK_PRIORITY_META[task.priority];
            const assignee = task.assigneeId
              ? getMember(task.assigneeId)
              : null;
            return (
              <motion.tr
                key={task.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="group cursor-pointer"
                style={{ borderBottom: "1px solid var(--content-border)" }}
                onClick={() => onTaskClick(task.id)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--content-secondary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
                }}
              >
                <td className="px-3 py-2.5">
                  <span
                    className="text-xs font-mono font-semibold"
                    style={{ color: "var(--vyne-purple)" }}
                  >
                    {task.key}
                  </span>
                </td>
                <td className="px-3 py-2.5" style={{ maxWidth: "320px" }}>
                  <span
                    className="text-sm font-medium truncate block group-hover:text-[#06B6D4] transition-colors"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {task.title}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full"
                    style={{
                      background: statusMeta.bgColor,
                      color: statusMeta.color,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: statusMeta.color }}
                    />
                    {statusMeta.label}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-1.5 text-xs font-medium">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: priorityMeta.color }}
                    />
                    <span style={{ color: "var(--text-secondary)" }}>
                      {priorityMeta.label}
                    </span>
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {assignee ? (
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold text-white"
                        style={{ background: assignee.color }}
                      >
                        {assignee.initials}
                      </div>
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {assignee.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs" style={{ color: "#D1D1E0" }}>
                      --
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {task.dueDate ? (
                    <span
                      className="text-xs"
                      style={{
                        color:
                          new Date(task.dueDate) < new Date()
                            ? "#EF4444"
                            : "var(--text-secondary)",
                      }}
                    >
                      {formatDate(task.dueDate)}
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: "#D1D1E0" }}>
                      --
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {task.estimatedHours ? `${task.estimatedHours}h` : "--"}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-1">
                    {task.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-1.5 py-0.5 rounded font-medium"
                        style={{
                          background: "var(--content-secondary)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <button aria-label="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this task?")) {
                        deleteTask(task.id);
                        toast.success("Task deleted");
                      }
                    }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "var(--text-tertiary)" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = "#EF4444";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color =
                        "var(--text-tertiary)";
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── BOARD VIEW ────────────────────────────────────────────────────

function TaskBoardView({
  tasks,
  projectId: _projectId,
  onTaskClick,
  swimlaneMode = "none",
}: {
  tasks: Task[];
  projectId: string;
  onTaskClick: (id: string) => void;
  swimlaneMode?: "none" | "assignee" | "priority";
}) {
  const updateTask = useProjectsStore((s) => s.updateTask);
  const teamMembers = useTeamMembers();

  function handleDrop(taskId: string, newStatus: TaskStatus) {
    updateTask(taskId, { status: newStatus });
    toast.success(`Moved to ${TASK_STATUS_META[newStatus].label}`);
  }

  function buildColumns(subset: Task[]) {
    return STATUS_ORDER.map((status) => ({
      id: status,
      meta: TASK_STATUS_META[status],
      tasks: subset
        .filter((t) => t.status === status)
        .sort((a, b) => a.order - b.order),
    }));
  }

  if (swimlaneMode === "none") {
    const columns = buildColumns(tasks);
    return (
      <div
        className="flex gap-3 h-full overflow-x-auto px-6 py-4"
        style={{ minWidth: "max-content", alignItems: "flex-start" }}
      >
        {columns.map((col) => (
          <BoardColumn
            key={col.id}
            columnId={col.id}
            meta={col.meta}
            tasks={col.tasks}
            onDrop={handleDrop}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
    );
  }

  // Build swimlane groups
  const lanes: { key: string; label: string; color: string; tasks: Task[] }[] = [];
  if (swimlaneMode === "assignee") {
    const byAssignee = new Map<string, Task[]>();
    for (const t of tasks) {
      const key = t.assigneeId ?? "_unassigned";
      const list = byAssignee.get(key) ?? [];
      list.push(t);
      byAssignee.set(key, list);
    }
    // Unassigned last
    const keys = Array.from(byAssignee.keys())
      .filter((k) => k !== "_unassigned")
      .sort();
    if (byAssignee.has("_unassigned")) keys.push("_unassigned");
    for (const k of keys) {
      const member = teamMembers.find((m) => m.id === k);
      lanes.push({
        key: k,
        label: member?.name ?? (k === "_unassigned" ? "Unassigned" : k),
        color: member ? "#06B6D4" : "#6B6B8A",
        tasks: byAssignee.get(k) ?? [],
      });
    }
  } else {
    // priority
    const byPriority = new Map<string, Task[]>();
    for (const t of tasks) {
      const key = t.priority ?? "medium";
      const list = byPriority.get(key) ?? [];
      list.push(t);
      byPriority.set(key, list);
    }
    for (const p of PRIORITY_ORDER) {
      if (byPriority.has(p)) {
        lanes.push({
          key: p,
          label: p.charAt(0).toUpperCase() + p.slice(1),
          color:
            p === "urgent"
              ? "#EF4444"
              : p === "high"
                ? "#F59E0B"
                : p === "medium"
                  ? "#3B82F6"
                  : "#6B7280",
          tasks: byPriority.get(p) ?? [],
        });
      }
    }
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-4">
      {lanes.map((lane) => (
        <div key={lane.key}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
              paddingLeft: 4,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: lane.color,
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: "var(--text-primary)",
              }}
            >
              {lane.label}
            </span>
            <span
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                fontWeight: 500,
              }}
            >
              {lane.tasks.length}
            </span>
          </div>
          <div
            className="flex gap-3 overflow-x-auto"
            style={{ minWidth: "max-content", alignItems: "flex-start" }}
          >
            {buildColumns(lane.tasks).map((col) => (
              <BoardColumn
                key={`${lane.key}-${col.id}`}
                columnId={col.id}
                meta={col.meta}
                tasks={col.tasks}
                onDrop={handleDrop}
                onTaskClick={onTaskClick}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskCalendarView({
  tasks,
  onTaskClick,
}: {
  tasks: Task[];
  onTaskClick: (id: string) => void;
}) {
  const events = useMemo(
    () =>
      tasks
        .filter((t) => t.dueDate)
        .map((t) => ({
          id: t.id,
          date: t.dueDate!,
          title: t.title,
          color:
            t.priority === "urgent"
              ? "#EF4444"
              : t.priority === "high"
                ? "#F59E0B"
                : "#06B6D4",
          meta: `${t.status} · ${t.priority ?? "medium"}`,
          onClick: () => onTaskClick(t.id),
        })),
    [tasks, onTaskClick],
  );

  return <CalendarView events={events} title="Task calendar" />;
}

function TaskGanttView({ tasks }: { tasks: Task[] }) {
  const rows = useMemo(
    () =>
      tasks
        .filter((t) => t.createdAt)
        .map((t) => ({
          id: t.id,
          label: t.title,
          start: t.createdAt,
          end: t.dueDate ?? new Date(
            new Date(t.createdAt).getTime() + 7 * 86_400_000,
          ).toISOString(),
          color:
            t.priority === "urgent"
              ? "#EF4444"
              : t.priority === "high"
                ? "#F59E0B"
                : t.status === "done"
                  ? "#22C55E"
                  : "#06B6D4",
          progress:
            t.status === "done"
              ? 1
              : t.status === "in_progress" || t.status === "in_review"
                ? 0.55
                : 0.1,
          meta: `${t.status}${t.priority ? ` · ${t.priority}` : ""}`,
        })),
    [tasks],
  );

  if (rows.length === 0) {
    return (
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
        No dated tasks yet — assign due dates to see the timeline.
      </div>
    );
  }

  return <GanttChart rows={rows} title="Sprint timeline" />;
}

function BoardColumn({
  columnId,
  meta,
  tasks,
  onDrop,
  onTaskClick,
}: {
  columnId: TaskStatus;
  meta: { label: string; color: string; bgColor: string };
  tasks: Task[];
  onDrop: (taskId: string, status: TaskStatus) => void;
  onTaskClick: (id: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl transition-all",
        dragOver && "ring-2",
      )}
      style={{
        width: "288px",
        minWidth: "288px",
        background: dragOver ? meta.bgColor : "var(--content-secondary)",
        border: `1px solid ${dragOver ? `${meta.color}60` : "var(--content-border)"}`,
        boxShadow: dragOver ? `0 8px 24px ${meta.color}20` : "none",
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const taskId = e.dataTransfer.getData("taskId");
        if (taskId) onDrop(taskId, columnId);
      }}
    >
      {/* Column Header */}
      <div
        className="flex items-center justify-between px-4 py-3.5 rounded-t-xl"
        style={{
          borderBottom: `1px solid var(--content-border)`,
          borderTop: `3px solid ${meta.color}`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{
              background: meta.color,
              boxShadow: `0 0 0 3px ${meta.color}25`,
            }}
          />
          <span
            className="font-semibold"
            style={{
              color: "var(--text-primary)",
              fontSize: 14,
              letterSpacing: "-0.01em",
            }}
          >
            {meta.label}
          </span>
          <span
            className="font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: meta.bgColor,
              color: meta.color,
              fontSize: 11,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-2 flex-1 min-h-[60px]">
        {tasks.map((task) => (
          <BoardCard key={task.id} task={task} onTaskClick={onTaskClick} />
        ))}
      </div>
    </div>
  );
}

function BoardCard({
  task,
  onTaskClick,
}: {
  task: Task;
  onTaskClick: (id: string) => void;
}) {
  const priorityMeta = TASK_PRIORITY_META[task.priority];
  const assignee = task.assigneeId ? getMember(task.assigneeId) : null;

  return (
    <motion.div
      draggable
      onDragStart={(e: any) => {
        e.dataTransfer?.setData("taskId", task.id);
      }}
      whileHover={{ boxShadow: "0 8px 24px rgba(6,182,212,0.12)", y: -2, borderColor: "#06B6D4" }}
      transition={{ duration: 0.15 }}
      onClick={() => onTaskClick(task.id)}
      className="group p-3.5 rounded-xl cursor-pointer select-none"
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        boxShadow: "var(--elev-1)",
      }}
    >
      <div className="flex items-start gap-2 mb-2">
        <div className="mt-0.5 flex-shrink-0">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: priorityMeta.color }}
            title={priorityMeta.label}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className="text-xs font-mono font-medium"
              style={{ color: "var(--text-tertiary)" }}
            >
              {task.key}
            </span>
          </div>
          <p
            className="text-sm font-medium leading-tight line-clamp-2 group-hover:text-[#06B6D4] transition-colors"
            style={{ color: "var(--text-primary)" }}
          >
            {task.title}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {task.tags.slice(0, 1).map((tag) => (
            <span
              key={tag}
              className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{ background: "var(--content-secondary)", color: "var(--text-secondary)" }}
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {task.dueDate && (
            <span
              className="flex items-center gap-1 text-xs"
              style={{
                color:
                  new Date(task.dueDate) < new Date() ? "#EF4444" : "#A0A0B8",
              }}
            >
              <Calendar size={10} />
              {formatDate(task.dueDate)}
            </span>
          )}
          {task.comments.length > 0 && (
            <span
              className="flex items-center gap-1 text-xs"
              style={{ color: "var(--text-tertiary)" }}
            >
              <MessageSquare size={10} />
              {task.comments.length}
            </span>
          )}
          {assignee ? (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold text-white"
              style={{ background: assignee.color }}
              title={assignee.name}
            >
              {assignee.initials}
            </div>
          ) : (
            <div
              className="w-5 h-5 rounded-full border-2 border-dashed"
              style={{ borderColor: "var(--content-border)" }}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── ADD TASK MODAL ────────────────────────────────────────────────

function AddTaskModal({
  open,
  onClose,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
}) {
  const addTask = useProjectsStore((s) => s.addTask);
  const teamMembers = useTeamMembers();

  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "todo" as TaskStatus,
    priority: "medium" as TaskPriority,
    assigneeId: "" as string,
    startDate: "",
    dueDate: "",
    estimatedHours: "",
    tags: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;

    addTask(projectId, {
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      assigneeId: form.assigneeId || null,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      estimatedHours: form.estimatedHours
        ? parseFloat(form.estimatedHours)
        : null,
      timeSpent: 0,
      tags: form.tags
        ? form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      subtasks: [],
      comments: [],
    });

    toast.success("Task created!");
    setForm({
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      assigneeId: "",
      startDate: "",
      dueDate: "",
      estimatedHours: "",
      tags: "",
    });
    onClose();
  }

  const inputClass =
    "w-full px-3 py-2 rounded-lg text-sm focus:outline-none placeholder:text-[#C0C0D8]";
  const inputStyle = {
    background: "var(--content-secondary)",
    border: "1px solid var(--content-border)",
    color: "var(--text-primary)",
  };
  const labelClass = "block text-xs font-medium mb-1.5";
  const labelStyle = { color: "var(--text-secondary)" };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50"
                style={{
                  background: "rgba(0,0,0,0.4)",
                  backdropFilter: "blur(4px)",
                }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-[560px] rounded-2xl max-h-[90vh] overflow-y-auto"
                style={{
                  background: "var(--content-bg)",
                  boxShadow: "0 25px 60px rgba(0,0,0,0.2)",
                }}
              >
                <div
                  className="flex items-center justify-between px-6 py-5"
                  style={{ borderBottom: "1px solid var(--content-border)" }}
                >
                  <Dialog.Title
                    className="text-base font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Add Task
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button aria-label="Close"
                      className="p-1.5 rounded-lg"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      <X size={16} />
                    </button>
                  </Dialog.Close>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                  {/* Title */}
                  <div>
                    <label className={labelClass} style={labelStyle}>
                      Title *
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, title: e.target.value }))
                      }
                      placeholder="Task title..."
                      required
                      autoFocus
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  {/* Description */}
                  <div>
                    <label className={labelClass} style={labelStyle}>
                      Description
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, description: e.target.value }))
                      }
                      placeholder="Describe the task..."
                      rows={3}
                      className={cn(inputClass, "resize-none")}
                      style={inputStyle}
                    />
                  </div>
                  {/* Status + Priority */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass} style={labelStyle}>
                        Status
                      </label>
                      <select aria-label="Select option"
                        value={form.status}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            status: e.target.value as TaskStatus,
                          }))
                        }
                        className={inputClass}
                        style={inputStyle}
                      >
                        {STATUS_ORDER.map((s) => (
                          <option key={s} value={s}>
                            {TASK_STATUS_META[s].label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass} style={labelStyle}>
                        Priority
                      </label>
                      <select aria-label="Select option"
                        value={form.priority}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            priority: e.target.value as TaskPriority,
                          }))
                        }
                        className={inputClass}
                        style={inputStyle}
                      >
                        {PRIORITY_ORDER.map((p) => (
                          <option key={p} value={p}>
                            {TASK_PRIORITY_META[p].label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {/* Assignee */}
                  <div>
                    <label className={labelClass} style={labelStyle}>
                      Assignee
                    </label>
                    <select aria-label="Select option"
                      value={form.assigneeId}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, assigneeId: e.target.value }))
                      }
                      className={inputClass}
                      style={inputStyle}
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass} style={labelStyle}>
                        Start Date
                      </label>
                      <input
                        type="date"
                        aria-label="Start date"
                        value={form.startDate}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, startDate: e.target.value }))
                        }
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label className={labelClass} style={labelStyle}>
                        Due Date
                      </label>
                      <input
                        type="date"
                        aria-label="Due date"
                        value={form.dueDate}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, dueDate: e.target.value }))
                        }
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  {/* Est hours + Tags */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass} style={labelStyle}>
                        Estimated Hours
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={form.estimatedHours}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            estimatedHours: e.target.value,
                          }))
                        }
                        placeholder="0"
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label className={labelClass} style={labelStyle}>
                        Tags (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={form.tags}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, tags: e.target.value }))
                        }
                        placeholder="frontend, bug"
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  {/* Actions */}
                  <div
                    className="flex justify-end gap-2 pt-2"
                    style={{ borderTop: "1px solid #F0F0F8" }}
                  >
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-lg text-sm font-medium"
                      style={{
                        background: "var(--content-secondary)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--content-border)",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!form.title.trim()}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                      style={{
                        background:
                          "linear-gradient(135deg, #06B6D4 0%, #22D3EE 100%)",
                      }}
                    >
                      Create task
                    </button>
                  </div>
                </form>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

// ─── TASK DETAIL PANEL ─────────────────────────────────────────────

function TaskDetailPanel({
  task,
  onClose,
}: {
  task: Task;
  onClose: () => void;
}) {
  const updateTask = useProjectsStore((s) => s.updateTask);
  const deleteTask = useProjectsStore((s) => s.deleteTask);
  const addSubtask = useProjectsStore((s) => s.addSubtask);
  const toggleSubtask = useProjectsStore((s) => s.toggleSubtask);
  const deleteSubtask = useProjectsStore((s) => s.deleteSubtask);
  const addComment = useProjectsStore((s) => s.addComment);
  const teamMembers = useTeamMembers();

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [commentText, setCommentText] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState("");
  const [newSubtaskDue, setNewSubtaskDue] = useState("");
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [newTag, setNewTag] = useState("");

  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Sync when task changes
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
  }, [task.id, task.title, task.description]);

  // Auto-resize title
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = "auto";
      titleRef.current.style.height = titleRef.current.scrollHeight + "px";
    }
  }, [title]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleTitleBlur() {
    if (title.trim() && title !== task.title) {
      updateTask(task.id, { title: title.trim() });
    }
  }

  function handleDescriptionBlur() {
    if (description !== task.description) {
      updateTask(task.id, { description });
    }
  }

  function handleStatusChange(status: TaskStatus) {
    updateTask(task.id, { status });
    toast.success(`Status changed to ${TASK_STATUS_META[status].label}`);
  }

  function handlePriorityChange(priority: TaskPriority) {
    updateTask(task.id, { priority });
  }

  function handleAssigneeChange(assigneeId: string) {
    updateTask(task.id, { assigneeId: assigneeId || null });
  }

  function handleStartDateChange(date: string) {
    updateTask(task.id, {
      startDate: date ? new Date(date).toISOString() : null,
    });
  }

  function handleDueDateChange(date: string) {
    updateTask(task.id, {
      dueDate: date ? new Date(date).toISOString() : null,
    });
  }

  function handleEstimatedHoursChange(val: string) {
    updateTask(task.id, { estimatedHours: val ? parseFloat(val) : null });
  }

  function handleAddTag() {
    if (!newTag.trim()) return;
    if (!task.tags.includes(newTag.trim())) {
      updateTask(task.id, { tags: [...task.tags, newTag.trim()] });
    }
    setNewTag("");
  }

  function handleRemoveTag(tag: string) {
    updateTask(task.id, { tags: task.tags.filter((t) => t !== tag) });
  }

  function handleAddSubtask() {
    if (!newSubtaskTitle.trim()) return;
    addSubtask(task.id, {
      title: newSubtaskTitle.trim(),
      done: false,
      assigneeId: newSubtaskAssignee || null,
      dueDate: newSubtaskDue ? new Date(newSubtaskDue).toISOString() : null,
    });
    setNewSubtaskTitle("");
    setNewSubtaskAssignee("");
    setNewSubtaskDue("");
    setShowAddSubtask(false);
    toast.success("Subtask added");
  }

  function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment(task.id, { authorId: "u1", content: commentText.trim() });
    setCommentText("");
    toast.success("Comment added");
  }

  function handleDeleteTask() {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTask(task.id);
      toast.success("Task deleted");
      onClose();
    }
  }

  const assignee = task.assigneeId ? getMember(task.assigneeId) : null;
  const doneSubtasks = task.subtasks.filter((s) => s.done).length;
  const inputStyle = {
    background: "var(--content-secondary)",
    border: "1px solid var(--content-border)",
    color: "var(--text-primary)",
  };

  return (
    <AnimatePresence>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />
      {/* Panel */}
      <motion.div
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
        style={{
          width: "min(620px, 95vw)",
          background: "var(--content-bg)",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
          borderLeft: "1px solid var(--content-border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--content-border)" }}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-mono font-semibold px-2 py-0.5 rounded"
              style={{ background: "var(--content-secondary)", color: "var(--text-secondary)" }}
            >
              {task.key}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleDeleteTask}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#FEF2F2";
                (e.currentTarget as HTMLElement).style.color = "#EF4444";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
                (e.currentTarget as HTMLElement).style.color =
                  "var(--text-tertiary)";
              }}
              title="Delete task"
            >
              <Trash2 size={14} />
            </button>
            <button aria-label="Close"
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--content-bg-secondary)";
                (e.currentTarget as HTMLElement).style.color = "#1A1A2E";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
                (e.currentTarget as HTMLElement).style.color =
                  "var(--text-tertiary)";
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto content-scroll">
          <div className="px-5 pt-5 pb-4">
            {/* Title - editable */}
            <textarea
              ref={titleRef}
              aria-label="Task title"
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="w-full bg-transparent text-xl font-semibold resize-none focus:outline-none leading-snug"
              style={{ color: "var(--text-primary)", minHeight: "32px" }}
              rows={1}
            />

            {/* Properties */}
            <div
              className="mt-5 space-y-3"
              style={{ borderTop: "1px solid #F0F0F8", paddingTop: "16px" }}
            >
              {/* Status */}
              <PropRow icon={<Flag size={13} />} label="Status">
                <select aria-label="Select option"
                  value={task.status}
                  onChange={(e) =>
                    handleStatusChange(e.target.value as TaskStatus)
                  }
                  className="text-xs font-medium px-2 py-1 rounded-lg focus:outline-none cursor-pointer"
                  style={{
                    background: TASK_STATUS_META[task.status].bgColor,
                    color: TASK_STATUS_META[task.status].color,
                    border: "none",
                  }}
                >
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {TASK_STATUS_META[s].label}
                    </option>
                  ))}
                </select>
              </PropRow>

              {/* Priority */}
              <PropRow icon={<Flag size={13} />} label="Priority">
                <select aria-label="Select option"
                  value={task.priority}
                  onChange={(e) =>
                    handlePriorityChange(e.target.value as TaskPriority)
                  }
                  className="text-xs font-medium px-2 py-1 rounded-lg focus:outline-none cursor-pointer"
                  style={{
                    background: "var(--content-secondary)",
                    color: TASK_PRIORITY_META[task.priority].color,
                    border: "none",
                  }}
                >
                  {PRIORITY_ORDER.map((p) => (
                    <option key={p} value={p}>
                      {TASK_PRIORITY_META[p].label}
                    </option>
                  ))}
                </select>
              </PropRow>

              {/* Assignee */}
              <PropRow icon={<User size={13} />} label="Assignee">
                <select aria-label="Select option"
                  value={task.assigneeId ?? ""}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className="text-xs font-medium px-2 py-1 rounded-lg focus:outline-none cursor-pointer"
                  style={{
                    background: "var(--content-secondary)",
                    color: "var(--text-primary)",
                    border: "none",
                  }}
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </PropRow>

              {/* Start Date */}
              <PropRow icon={<Calendar size={13} />} label="Start date">
                <input
                  type="date"
                  aria-label="Task start date"
                  value={task.startDate ? task.startDate.slice(0, 10) : ""}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="text-xs font-medium px-2 py-1 rounded-lg focus:outline-none cursor-pointer"
                  style={{
                    background: "var(--content-secondary)",
                    color: "var(--text-primary)",
                    border: "none",
                  }}
                />
              </PropRow>

              {/* Due Date */}
              <PropRow icon={<Calendar size={13} />} label="Due date">
                <input
                  type="date"
                  aria-label="Task due date"
                  value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                  className="text-xs font-medium px-2 py-1 rounded-lg focus:outline-none cursor-pointer"
                  style={{
                    background:
                      task.dueDate && new Date(task.dueDate) < new Date()
                        ? "#FEF2F2"
                        : "var(--content-bg-secondary)",
                    color:
                      task.dueDate && new Date(task.dueDate) < new Date()
                        ? "#EF4444"
                        : "var(--text-primary)",
                    border: "none",
                  }}
                />
              </PropRow>

              {/* Estimated Hours */}
              <PropRow icon={<Clock size={13} />} label="Est. hours">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={task.estimatedHours ?? ""}
                  onChange={(e) => handleEstimatedHoursChange(e.target.value)}
                  placeholder="0"
                  className="text-xs font-medium px-2 py-1 rounded-lg focus:outline-none w-20"
                  style={{
                    background: "var(--content-secondary)",
                    color: "var(--text-primary)",
                    border: "none",
                  }}
                />
              </PropRow>

              {/* Tags */}
              <PropRow icon={<Tag size={13} />} label="Tags">
                <div className="flex flex-wrap items-center gap-1">
                  {task.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: "var(--content-secondary)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {tag}
                      <button aria-label="Close"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="+ tag"
                      className="text-xs px-1.5 py-0.5 rounded bg-transparent focus:outline-none w-16"
                      style={{ color: "var(--text-tertiary)" }}
                    />
                  </div>
                </div>
              </PropRow>
            </div>

            {/* Description */}
            <div className="mt-5">
              <label
                className="block text-xs font-medium mb-2"
                style={{ color: "var(--text-tertiary)" }}
              >
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                placeholder="Add a description..."
                rows={5}
                className="w-full p-3 rounded-lg text-sm resize-none focus:outline-none transition-all placeholder:text-[#C0C0D8]"
                style={{
                  background: "var(--content-secondary)",
                  border: "1px solid var(--content-border)",
                  color: "var(--text-primary)",
                  lineHeight: "1.6",
                }}
                onFocus={(e) => {
                  e.target.style.border = "1px solid #06B6D4";
                  e.target.style.boxShadow = "0 0 0 3px rgba(6, 182, 212,0.08)";
                }}
              />
            </div>
          </div>

          {/* Subtasks */}
          <div
            className="px-5 pt-4 pb-4"
            style={{ borderTop: "1px solid #F0F0F8" }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Subtasks ({doneSubtasks}/{task.subtasks.length})
              </h3>
              <button
                onClick={() => setShowAddSubtask(!showAddSubtask)}
                className="text-xs font-medium flex items-center gap-1 transition-colors"
                style={{ color: "#06B6D4" }}
              >
                <Plus size={12} /> Add
              </button>
            </div>

            {/* Subtask list */}
            {task.subtasks.length > 0 ? (
              <div className="space-y-1.5 mb-3">
                {task.subtasks.map((st) => {
                  const stAssignee = st.assigneeId
                    ? getMember(st.assigneeId)
                    : null;
                  return (
                    <div
                      key={st.id}
                      className="flex items-center gap-2 group rounded-lg px-2 py-1.5 transition-colors"
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "var(--content-bg-secondary)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                      }}
                    >
                      <button
                        onClick={() => toggleSubtask(task.id, st.id)}
                        className="flex-shrink-0"
                        style={{ color: st.done ? "#22C55E" : "#D1D1E0" }}
                      >
                        {st.done ? (
                          <CheckSquare size={16} />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                      <span
                        className={cn(
                          "text-sm flex-1",
                          st.done && "line-through",
                        )}
                        style={{
                          color: st.done
                            ? "var(--text-tertiary)"
                            : "var(--text-primary)",
                        }}
                      >
                        {st.title}
                      </span>
                      {stAssignee && (
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-semibold text-white"
                          style={{ background: stAssignee.color }}
                          title={stAssignee.name}
                        >
                          {stAssignee.initials}
                        </div>
                      )}
                      {st.dueDate && (
                        <span
                          className="text-xs"
                          style={{
                            color:
                              new Date(st.dueDate) < new Date()
                                ? "#EF4444"
                                : "#A0A0B8",
                          }}
                        >
                          {formatDate(st.dueDate)}
                        </span>
                      )}
                      <button aria-label="Close"
                        onClick={() => {
                          deleteSubtask(task.id, st.id);
                          toast.success("Subtask removed");
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
                        style={{ color: "var(--text-tertiary)" }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.color =
                            "#EF4444";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.color =
                            "var(--text-tertiary)";
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              !showAddSubtask && (
                <p
                  className="text-xs text-center py-3"
                  style={{ color: "#C0C0D8" }}
                >
                  No subtasks yet
                </p>
              )
            )}

            {/* Add subtask form */}
            <AnimatePresence>
              {showAddSubtask && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 p-3 rounded-lg"
                  style={{
                    background: "var(--content-secondary)",
                    border: "1px solid var(--content-border)",
                  }}
                >
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Subtask title..."
                    autoFocus
                    className="w-full px-2 py-1.5 rounded text-sm bg-transparent focus:outline-none"
                    style={{ color: "var(--text-primary)" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddSubtask();
                      if (e.key === "Escape") setShowAddSubtask(false);
                    }}
                  />
                  <div className="flex gap-2">
                    <select aria-label="Select option"
                      value={newSubtaskAssignee}
                      onChange={(e) => setNewSubtaskAssignee(e.target.value)}
                      className="text-xs px-2 py-1 rounded flex-1 focus:outline-none"
                      style={{ ...inputStyle }}
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      aria-label="Subtask due date"
                      value={newSubtaskDue}
                      onChange={(e) => setNewSubtaskDue(e.target.value)}
                      className="text-xs px-2 py-1 rounded focus:outline-none"
                      style={{ ...inputStyle }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddSubtask}
                      disabled={!newSubtaskTitle.trim()}
                      className="px-3 py-1 rounded text-xs font-semibold text-white disabled:opacity-50"
                      style={{ background: "#06B6D4" }}
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowAddSubtask(false)}
                      className="px-3 py-1 rounded text-xs font-medium"
                      style={{ background: "var(--content-secondary)", color: "var(--text-secondary)" }}
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Comments */}
          <div
            className="px-5 pt-4 pb-4"
            style={{ borderTop: "1px solid #F0F0F8" }}
          >
            <h3
              className="text-xs font-semibold uppercase tracking-wider mb-4"
              style={{ color: "var(--text-tertiary)" }}
            >
              Comments ({task.comments.length})
            </h3>

            {task.comments.length > 0 ? (
              <div className="space-y-4 mb-4">
                {task.comments.map((comment) => {
                  const author = getMember(comment.authorId);
                  return (
                    <div key={comment.id} className="flex gap-3">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                        style={{ background: author?.color ?? "#06B6D4" }}
                      >
                        {author?.initials ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span
                            className="text-sm font-medium"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {author?.name ?? "Unknown"}
                          </span>
                          <span
                            className="text-xs"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "#4A4A6A" }}
                        >
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p
                className="text-sm text-center py-4"
                style={{ color: "#C0C0D8" }}
              >
                No comments yet
              </p>
            )}

            {/* Comment input */}
            <form
              onSubmit={handleSubmitComment}
              className="flex gap-2 items-end"
            >
              <div
                className="flex-1 rounded-lg overflow-hidden"
                style={{ border: "1px solid var(--content-border)" }}
              >
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Leave a comment..."
                  rows={2}
                  className="w-full p-3 text-sm bg-transparent resize-none focus:outline-none placeholder:text-[#C0C0D8]"
                  style={{ color: "var(--text-primary)" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleSubmitComment(e as unknown as React.FormEvent);
                    }
                  }}
                />
              </div>
              <button aria-label="Send"
                type="submit"
                disabled={!commentText.trim()}
                className="p-2.5 rounded-lg transition-all disabled:opacity-40"
                style={{ background: "var(--vyne-purple)", color: "#FFFFFF" }}
              >
                <Send size={16} />
              </button>
            </form>
            <p className="text-xs mt-1.5" style={{ color: "#C0C0D8" }}>
              Ctrl + Enter to submit
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Property Row Helper ───────────────────────────────────────────

function PropRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center gap-1.5 w-24 flex-shrink-0 text-xs"
        style={{ color: "var(--text-tertiary)" }}
      >
        {icon}
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}
