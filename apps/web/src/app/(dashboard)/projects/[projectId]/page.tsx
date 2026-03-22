"use client";

import { useState, useMemo, useCallback, useRef, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  LayoutList,
  Columns3,
  GanttChart,
  Search,
  ChevronDown,
  ChevronRight,
  X,
  Calendar,
  Clock,
  User,
  Tag,
  Flag,
  MessageSquare,
  Paperclip,
  FileText,
  CheckSquare,
  Square,
  Trash2,
  Edit3,
  Send,
  Activity,
} from "lucide-react";
import Link from "next/link";
import {
  getProjectDetail,
  getProjectTasks,
  getProjectProgress,
  getMember,
  TEAM_MEMBERS,
  TASK_STATUS_META,
  TASK_PRIORITY_META,
  type Task,
  type TaskStatus,
  type TaskPriority,
  type Subtask,
  type ProjectDetail,
} from "@/lib/fixtures/projects";

// ─── Types ───────────────────────────────────────────────────────

type ViewMode = "list" | "board" | "timeline";

interface ProjectPageProps {
  readonly params: Promise<{ projectId: string }>;
}

// ─── Main Page ───────────────────────────────────────────────────

export default function ProjectDetailPage({ params }: ProjectPageProps) {
  const { projectId } = use(params);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [tasks, setTasks] = useState<Task[]>(() => getProjectTasks(projectId));

  const project = getProjectDetail(projectId);
  const progress = getProjectProgress(projectId);

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

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  const handleTaskUpdate = useCallback((updated: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setSelectedTask(updated);
  }, []);

  const handleTaskDelete = useCallback(
    (taskId: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }
    },
    [selectedTask],
  );

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
          style={{ color: "#6C47FF" }}
        >
          <ArrowLeft size={14} />
          Back to projects
        </Link>
      </div>
    );
  }

  const members = project.memberIds.map((id) => getMember(id)).filter(Boolean);

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--content-bg)" }}
    >
      {/* ─── Project Header ─────────────────────────────── */}
      <ProjectHeader
        project={project}
        members={members as NonNullable<ReturnType<typeof getMember>>[]}
        progress={progress}
        taskCount={tasks.length}
      />

      {/* ─── Toolbar ────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-2.5 flex-shrink-0"
        style={{
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
        }}
      >
        {/* View Toggles */}
        <div
          className="flex items-center gap-0.5 p-0.5 rounded-lg"
          style={{ background: "var(--content-secondary)" }}
        >
          <ViewToggleButton
            active={viewMode === "list"}
            onClick={() => setViewMode("list")}
            icon={<LayoutList size={14} />}
            label="List"
          />
          <ViewToggleButton
            active={viewMode === "board"}
            onClick={() => setViewMode("board")}
            icon={<Columns3 size={14} />}
            label="Board"
          />
          <ViewToggleButton
            active={viewMode === "timeline"}
            onClick={() => setViewMode("timeline")}
            icon={<GanttChart size={14} />}
            label="Timeline"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{
              background: "var(--content-secondary)",
              border: "1px solid var(--content-border)",
              width: "200px",
            }}
          >
            <Search size={13} style={{ color: "var(--text-tertiary)" }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="flex-1 bg-transparent text-xs focus:outline-none"
              style={{ color: "var(--text-primary)" }}
            />
          </div>

          {/* Add Task */}
          <button
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
            style={{
              background: "linear-gradient(135deg, #6C47FF 0%, #8B6BFF 100%)",
              boxShadow: "0 2px 8px rgba(108,71,255,0.3)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 4px 14px rgba(108,71,255,0.45)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 2px 8px rgba(108,71,255,0.3)";
            }}
          >
            <Plus size={14} />
            Add Task
          </button>
        </div>
      </div>

      {/* ─── Content Area ───────────────────────────────── */}
      <div className="flex-1 overflow-auto content-scroll">
        {viewMode === "list" && (
          <TaskListView
            tasks={filteredTasks}
            onTaskClick={handleTaskClick}
            onTaskDelete={handleTaskDelete}
          />
        )}
        {viewMode === "board" && (
          <TaskBoardView tasks={filteredTasks} onTaskClick={handleTaskClick} />
        )}
        {viewMode === "timeline" && (
          <TaskTimelineView
            tasks={filteredTasks}
            onTaskClick={handleTaskClick}
          />
        )}
      </div>

      {/* ─── Task Detail Panel ──────────────────────────── */}
      <TaskDetailPanel
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={handleTaskUpdate}
      />
    </div>
  );
}

// ─── Project Header ──────────────────────────────────────────────

function ProjectHeader({
  project,
  members,
  progress,
  taskCount,
}: {
  readonly project: ProjectDetail;
  readonly members: NonNullable<ReturnType<typeof getMember>>[];
  readonly progress: number;
  readonly taskCount: number;
}) {
  return (
    <header
      className="px-6 py-4 flex-shrink-0"
      style={{
        borderBottom: "1px solid var(--content-border)",
        background: "var(--content-bg)",
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {/* Back button */}
          <Link
            href="/projects"
            className="p-1.5 rounded-lg transition-colors mt-0.5"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "var(--content-secondary)";
              (e.currentTarget as HTMLElement).style.color =
                "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color =
                "var(--text-tertiary)";
            }}
          >
            <ArrowLeft size={16} />
          </Link>

          {/* Icon + name */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: project.color + "18" }}
            >
              {project.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className="text-lg font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {project.name}
                </h1>
                <span
                  className="text-xs px-2 py-0.5 rounded-md font-mono font-semibold"
                  style={{
                    background: "#F0F0F8",
                    color: "var(--text-secondary)",
                  }}
                >
                  {project.identifier}
                </span>
                <StatusBadge status={project.status} />
              </div>
              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--text-tertiary)" }}
              >
                {project.description}
              </p>
            </div>
          </div>
        </div>

        {/* Right side: team + progress */}
        <div className="flex items-center gap-5">
          {/* Team member avatars */}
          <div className="flex items-center gap-1">
            <div className="flex -space-x-2">
              {members.slice(0, 5).map((member) => (
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
              ))}
              {members.length > 5 && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2"
                  style={{
                    background: "var(--content-secondary)",
                    borderColor: "var(--content-bg)",
                    color: "var(--text-secondary)",
                  }}
                >
                  +{members.length - 5}
                </div>
              )}
            </div>
          </div>

          {/* Progress */}
          <div
            className="flex items-center gap-3"
            style={{ minWidth: "140px" }}
          >
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {taskCount} tasks
                </span>
                <span
                  className="text-xs font-semibold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {progress}%
                </span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "#F0F0F8" }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${project.color} 0%, ${project.color}CC 100%)`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

// ─── Status Badge ────────────────────────────────────────────────

function StatusBadge({ status }: { readonly status: string }) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    active: { bg: "#F0FDF4", text: "#22C55E" },
    paused: { bg: "#FFFBEB", text: "#F59E0B" },
    completed: { bg: "#EFF6FF", text: "#3B82F6" },
  };
  const c = colorMap[status] ?? colorMap.active;
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full capitalize"
      style={{ background: c.bg, color: c.text }}
    >
      {status}
    </span>
  );
}

// ─── View Toggle Button ─────────────────────────────────────────

function ViewToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly icon: React.ReactNode;
  readonly label: string;
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

// ─── LIST VIEW ───────────────────────────────────────────────────

function TaskListView({
  tasks,
  onTaskClick,
  onTaskDelete,
}: {
  readonly tasks: Task[];
  readonly onTaskClick: (task: Task) => void;
  readonly onTaskDelete: (taskId: string) => void;
}) {
  if (tasks.length === 0) {
    return <EmptyState message="No tasks found" />;
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
              "Start Date",
              "Due Date",
              "Est. Hours",
              "Tags",
              "Subtasks",
              "",
            ].map((header) => (
              <th
                key={header}
                className="text-left text-xs font-semibold uppercase tracking-wider px-3 py-2.5"
                style={{
                  color: "var(--text-tertiary)",
                  borderBottom: "1px solid var(--content-border)",
                  background: "var(--content-secondary)",
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, i) => (
            <TaskRow
              key={task.id}
              task={task}
              index={i}
              onClick={() => onTaskClick(task)}
              onDelete={() => onTaskDelete(task.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TaskRow({
  task,
  index,
  onClick,
  onDelete,
}: {
  readonly task: Task;
  readonly index: number;
  readonly onClick: () => void;
  readonly onDelete: () => void;
}) {
  const statusMeta = TASK_STATUS_META[task.status];
  const priorityMeta = TASK_PRIORITY_META[task.priority];
  const assignee = task.assigneeId ? getMember(task.assigneeId) : null;
  const doneSubtasks = task.subtasks.filter((s) => s.done).length;
  const totalSubtasks = task.subtasks.length;

  return (
    <motion.tr
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="group cursor-pointer transition-colors"
      style={{ borderBottom: "1px solid var(--content-border)" }}
      onClick={onClick}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background =
          "var(--content-secondary)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {/* Key */}
      <td className="px-3 py-2.5">
        <span
          className="text-xs font-mono font-semibold"
          style={{ color: "var(--vyne-purple)" }}
        >
          {task.key}
        </span>
      </td>

      {/* Title */}
      <td className="px-3 py-2.5" style={{ maxWidth: "320px" }}>
        <span
          className="text-sm font-medium truncate block group-hover:text-[#6C47FF] transition-colors"
          style={{ color: "var(--text-primary)" }}
        >
          {task.title}
        </span>
      </td>

      {/* Status */}
      <td className="px-3 py-2.5">
        <span
          className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full"
          style={{ background: statusMeta.bgColor, color: statusMeta.color }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: statusMeta.color }}
          />
          {statusMeta.label}
        </span>
      </td>

      {/* Priority */}
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

      {/* Assignee */}
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
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Unassigned
          </span>
        )}
      </td>

      {/* Start Date */}
      <td className="px-3 py-2.5">
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {task.startDate ? formatShortDate(task.startDate) : "--"}
        </span>
      </td>

      {/* Due Date */}
      <td className="px-3 py-2.5">
        {task.dueDate ? (
          <span
            className="text-xs"
            style={{
              color:
                isOverdue(task.dueDate) && task.status !== "done"
                  ? "#EF4444"
                  : "var(--text-secondary)",
            }}
          >
            {formatShortDate(task.dueDate)}
          </span>
        ) : (
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            --
          </span>
        )}
      </td>

      {/* Estimated Hours */}
      <td className="px-3 py-2.5">
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {task.estimatedHours ? `${task.estimatedHours}h` : "--"}
        </span>
      </td>

      {/* Tags */}
      <td className="px-3 py-2.5">
        <div className="flex flex-wrap gap-1">
          {task.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ background: "#F0F0F8", color: "var(--text-tertiary)" }}
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 2 && (
            <span
              className="text-[10px] px-1 py-0.5 rounded font-medium"
              style={{ color: "var(--text-tertiary)" }}
            >
              +{task.tags.length - 2}
            </span>
          )}
        </div>
      </td>

      {/* Subtask count */}
      <td className="px-3 py-2.5">
        {totalSubtasks > 0 ? (
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {doneSubtasks}/{totalSubtasks}
          </span>
        ) : (
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            --
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="p-1 rounded transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            title="Edit"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <Edit3 size={12} />
          </button>
          <button
            className="p-1 rounded transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#EF4444";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color =
                "var(--text-tertiary)";
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </td>
    </motion.tr>
  );
}

// ─── BOARD VIEW ──────────────────────────────────────────────────

function TaskBoardView({
  tasks,
  onTaskClick,
}: {
  readonly tasks: Task[];
  readonly onTaskClick: (task: Task) => void;
}) {
  const allStatuses: TaskStatus[] = [
    "todo",
    "in_progress",
    "in_review",
    "done",
    "blocked",
  ];

  return (
    <div
      className="flex gap-4 p-6 overflow-x-auto"
      style={{ minWidth: "max-content", alignItems: "flex-start" }}
    >
      {allStatuses.map((status) => {
        const meta = TASK_STATUS_META[status];
        const columnTasks = tasks
          .filter((t) => t.status === status)
          .sort((a, b) => a.order - b.order);

        return (
          <div
            key={status}
            className="flex flex-col rounded-xl"
            style={{
              width: "280px",
              minWidth: "280px",
              background: "var(--content-secondary)",
            }}
          >
            {/* Column header */}
            <div
              className="flex items-center justify-between px-3.5 py-3"
              style={{ borderBottom: `2px solid ${meta.color}30` }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: meta.color }}
                />
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {meta.label}
                </span>
                <span
                  className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: meta.bgColor, color: meta.color }}
                >
                  {columnTasks.length}
                </span>
              </div>
              <button
                className="p-1 rounded-lg transition-colors"
                style={{ color: "var(--text-tertiary)" }}
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 p-2 min-h-[60px]">
              <AnimatePresence mode="popLayout">
                {columnTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                  >
                    <BoardCard task={task} onClick={() => onTaskClick(task)} />
                  </motion.div>
                ))}
              </AnimatePresence>
              {columnTasks.length === 0 && (
                <div
                  className="text-xs text-center py-6"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  No tasks
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BoardCard({
  task,
  onClick,
}: {
  readonly task: Task;
  readonly onClick: () => void;
}) {
  const priorityMeta = TASK_PRIORITY_META[task.priority];
  const assignee = task.assigneeId ? getMember(task.assigneeId) : null;
  const doneSubtasks = task.subtasks.filter((s) => s.done).length;
  const totalSubtasks = task.subtasks.length;

  return (
    <div
      className="group p-3 rounded-lg cursor-pointer transition-all"
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 4px 12px rgba(0,0,0,0.08)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 1px 2px rgba(0,0,0,0.04)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      {/* Priority + Key */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: priorityMeta.color }}
        />
        <span
          className="text-xs font-mono font-medium"
          style={{ color: "var(--text-tertiary)" }}
        >
          {task.key}
        </span>
      </div>

      {/* Title */}
      <p
        className="text-sm font-medium leading-tight mb-2 group-hover:text-[#6C47FF] transition-colors line-clamp-2"
        style={{ color: "var(--text-primary)" }}
      >
        {task.title}
      </p>

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ background: "#F0F0F8", color: "var(--text-tertiary)" }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.dueDate && (
            <span
              className="flex items-center gap-1 text-[10px]"
              style={{
                color:
                  isOverdue(task.dueDate) && task.status !== "done"
                    ? "#EF4444"
                    : "var(--text-tertiary)",
              }}
            >
              <Calendar size={9} />
              {formatShortDate(task.dueDate)}
            </span>
          )}
          {totalSubtasks > 0 && (
            <span
              className="flex items-center gap-1 text-[10px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              <CheckSquare size={9} />
              {doneSubtasks}/{totalSubtasks}
            </span>
          )}
          {task.comments.length > 0 && (
            <span
              className="flex items-center gap-1 text-[10px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              <MessageSquare size={9} />
              {task.comments.length}
            </span>
          )}
        </div>

        {assignee ? (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-semibold text-white"
            style={{ background: assignee.color }}
            title={assignee.name}
          >
            {assignee.initials}
          </div>
        ) : (
          <div
            className="w-5 h-5 rounded-full border-2 border-dashed"
            style={{ borderColor: "#E0E0F0" }}
          />
        )}
      </div>
    </div>
  );
}

// ─── TIMELINE VIEW ───────────────────────────────────────────────

function TaskTimelineView({
  tasks,
  onTaskClick,
}: {
  readonly tasks: Task[];
  readonly onTaskClick: (task: Task) => void;
}) {
  const tasksWithDates = tasks.filter((t) => t.startDate && t.dueDate);

  if (tasksWithDates.length === 0) {
    return <EmptyState message="No tasks with date ranges to display" />;
  }

  // Calculate date range for the chart
  const allDates = tasksWithDates.flatMap((t) => [
    new Date(t.startDate!).getTime(),
    new Date(t.dueDate!).getTime(),
  ]);
  const minDate = new Date(Math.min(...allDates));
  const maxDate = new Date(Math.max(...allDates));

  // Extend range by 2 days on each side
  minDate.setDate(minDate.getDate() - 2);
  maxDate.setDate(maxDate.getDate() + 2);

  const totalDays = Math.ceil(
    (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Generate date headers (every 2 days for density)
  const dateHeaders: Date[] = [];
  for (let i = 0; i <= totalDays; i += 2) {
    const d = new Date(minDate);
    d.setDate(d.getDate() + i);
    dateHeaders.push(d);
  }

  return (
    <div className="p-6 overflow-x-auto">
      <div style={{ minWidth: `${Math.max(800, totalDays * 30)}px` }}>
        {/* Date header */}
        <div
          className="flex mb-4"
          style={{
            marginLeft: "280px",
            borderBottom: "1px solid var(--content-border)",
          }}
        >
          {dateHeaders.map((d, i) => (
            <div
              key={i}
              className="text-[10px] font-medium text-center"
              style={{
                width: `${(2 / totalDays) * 100}%`,
                color: "var(--text-tertiary)",
                paddingBottom: "8px",
              }}
            >
              {d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </div>
          ))}
        </div>

        {/* Task rows */}
        <div className="space-y-2">
          {tasksWithDates.map((task, i) => {
            const start = new Date(task.startDate!);
            const end = new Date(task.dueDate!);
            const startOffset =
              ((start.getTime() - minDate.getTime()) /
                (maxDate.getTime() - minDate.getTime())) *
              100;
            const barWidth =
              ((end.getTime() - start.getTime()) /
                (maxDate.getTime() - minDate.getTime())) *
              100;
            const statusMeta = TASK_STATUS_META[task.status];
            const priorityMeta = TASK_PRIORITY_META[task.priority];
            const assignee = task.assigneeId
              ? getMember(task.assigneeId)
              : null;

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-0 cursor-pointer group"
                onClick={() => onTaskClick(task)}
              >
                {/* Task label */}
                <div
                  className="flex items-center gap-2 pr-4 flex-shrink-0"
                  style={{ width: "280px" }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: priorityMeta.color }}
                  />
                  <span
                    className="text-xs font-mono font-medium flex-shrink-0"
                    style={{ color: "var(--text-tertiary)", width: "70px" }}
                  >
                    {task.key}
                  </span>
                  <span
                    className="text-xs font-medium truncate group-hover:text-[#6C47FF] transition-colors"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {task.title}
                  </span>
                </div>

                {/* Timeline bar area */}
                <div className="flex-1 relative" style={{ height: "28px" }}>
                  {/* Grid lines */}
                  <div
                    className="absolute inset-0"
                    style={{ borderBottom: "1px solid var(--content-border)" }}
                  />

                  {/* Bar */}
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: i * 0.03 + 0.1, duration: 0.4 }}
                    className="absolute top-1 rounded-md flex items-center px-2 gap-1 overflow-hidden"
                    style={{
                      left: `${startOffset}%`,
                      width: `${Math.max(barWidth, 2)}%`,
                      height: "20px",
                      background: statusMeta.bgColor,
                      border: `1px solid ${statusMeta.color}30`,
                      transformOrigin: "left",
                    }}
                  >
                    <span
                      className="text-[9px] font-semibold truncate"
                      style={{ color: statusMeta.color }}
                    >
                      {statusMeta.label}
                    </span>
                    {assignee && (
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white flex-shrink-0 ml-auto"
                        style={{ background: assignee.color }}
                      >
                        {assignee.initials}
                      </div>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── TASK DETAIL PANEL ───────────────────────────────────────────

function TaskDetailPanel({
  task,
  onClose,
  onUpdate,
}: {
  readonly task: Task | null;
  readonly onClose: () => void;
  readonly onUpdate: (task: Task) => void;
}) {
  const [activeTab, setActiveTab] = useState<
    "details" | "activity" | "attachments"
  >("details");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [descValue, setDescValue] = useState("");
  const [commentText, setCommentText] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  // Sync values when task changes
  useEffect(() => {
    if (task) {
      setTitleValue(task.title);
      setDescValue(task.description);
      setCommentText("");
      setNewSubtaskTitle("");
      setActiveTab("details");
    }
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && task) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [task, onClose]);

  if (!task) return null;

  const statusMeta = TASK_STATUS_META[task.status];
  const priorityMeta = TASK_PRIORITY_META[task.priority];
  const assignee = task.assigneeId ? getMember(task.assigneeId) : null;
  const doneSubtasks = task.subtasks.filter((s) => s.done).length;

  function handleTitleSave() {
    if (titleValue.trim() && titleValue !== task.title) {
      onUpdate({ ...task, title: titleValue.trim() });
    }
    setEditingTitle(false);
  }

  function handleDescSave() {
    if (descValue !== task.description) {
      onUpdate({ ...task, description: descValue });
    }
  }

  function handleStatusChange(status: TaskStatus) {
    onUpdate({ ...task, status });
  }

  function handlePriorityChange(priority: TaskPriority) {
    onUpdate({ ...task, priority });
  }

  function handleAssigneeChange(assigneeId: string | null) {
    onUpdate({ ...task, assigneeId });
  }

  function handleSubtaskToggle(subtaskId: string) {
    const updatedSubtasks = task.subtasks.map((s) =>
      s.id === subtaskId ? { ...s, done: !s.done } : s,
    );
    onUpdate({ ...task, subtasks: updatedSubtasks });
  }

  function handleAddSubtask() {
    if (!newSubtaskTitle.trim()) return;
    const newSubtask: Subtask = {
      id: `st-${Date.now()}`,
      title: newSubtaskTitle.trim(),
      done: false,
      assigneeId: null,
      dueDate: null,
    };
    onUpdate({ ...task, subtasks: [...task.subtasks, newSubtask] });
    setNewSubtaskTitle("");
  }

  function handleAddComment() {
    if (!commentText.trim()) return;
    const newComment = {
      id: `c-${Date.now()}`,
      authorId: "u1",
      content: commentText.trim(),
      createdAt: new Date().toISOString(),
    };
    onUpdate({ ...task, comments: [...task.comments, newComment] });
    setCommentText("");
  }

  return (
    <AnimatePresence>
      {task && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40"
            style={{
              background: "rgba(0,0,0,0.25)",
              backdropFilter: "blur(2px)",
            }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 300,
              mass: 0.8,
            }}
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
            style={{
              width: "min(640px, 90vw)",
              background: "var(--content-bg)",
              boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
              borderLeft: "1px solid var(--content-border)",
            }}
          >
            {/* ─── Panel Header ──────────────────────────── */}
            <div
              className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
              style={{ borderBottom: "1px solid var(--content-border)" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-mono font-semibold px-2 py-0.5 rounded"
                  style={{ background: "#F0F0F8", color: "var(--vyne-purple)" }}
                >
                  {task.key}
                </span>
                <span
                  className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
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
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "var(--text-tertiary)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#F8F8FC";
                  (e.currentTarget as HTMLElement).style.color = "#1A1A2E";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
                  (e.currentTarget as HTMLElement).style.color = "#A0A0B8";
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* ─── Panel Body ────────────────────────────── */}
            <div className="flex-1 overflow-y-auto content-scroll">
              {/* Title */}
              <div className="px-5 pt-5 pb-2">
                {editingTitle ? (
                  <input
                    ref={titleRef}
                    autoFocus
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    onBlur={handleTitleSave}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleTitleSave();
                      if (e.key === "Escape") {
                        setTitleValue(task.title);
                        setEditingTitle(false);
                      }
                    }}
                    className="w-full text-lg font-semibold bg-transparent focus:outline-none px-2 py-1 rounded-lg"
                    style={{
                      color: "var(--text-primary)",
                      border: "1px solid var(--vyne-purple)",
                      boxShadow: "0 0 0 3px rgba(108,71,255,0.08)",
                    }}
                  />
                ) : (
                  <h2
                    className="text-lg font-semibold cursor-pointer rounded-lg px-2 py-1 transition-colors"
                    style={{ color: "var(--text-primary)" }}
                    onClick={() => setEditingTitle(true)}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "var(--content-secondary)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "transparent";
                    }}
                  >
                    {task.title}
                  </h2>
                )}
              </div>

              {/* ─── Properties Grid ─────────────────────── */}
              <div
                className="px-5 py-4 space-y-3"
                style={{ borderBottom: "1px solid var(--content-border)" }}
              >
                {/* Status */}
                <PropertyRow icon={<Flag size={13} />} label="Status">
                  <DropdownSelect
                    value={task.status}
                    options={Object.entries(TASK_STATUS_META).map(([k, v]) => ({
                      value: k,
                      label: v.label,
                      color: v.color,
                    }))}
                    onChange={(v) => handleStatusChange(v as TaskStatus)}
                  />
                </PropertyRow>

                {/* Priority */}
                <PropertyRow icon={<Flag size={13} />} label="Priority">
                  <DropdownSelect
                    value={task.priority}
                    options={Object.entries(TASK_PRIORITY_META).map(
                      ([k, v]) => ({
                        value: k,
                        label: v.label,
                        color: v.color,
                      }),
                    )}
                    onChange={(v) => handlePriorityChange(v as TaskPriority)}
                  />
                </PropertyRow>

                {/* Assignee */}
                <PropertyRow icon={<User size={13} />} label="Assignee">
                  <DropdownSelect
                    value={task.assigneeId ?? ""}
                    options={[
                      { value: "", label: "Unassigned", color: "#A0A0B8" },
                      ...TEAM_MEMBERS.map((m) => ({
                        value: m.id,
                        label: m.name,
                        color: m.color,
                      })),
                    ]}
                    onChange={(v) => handleAssigneeChange(v || null)}
                  />
                </PropertyRow>

                {/* Start Date */}
                <PropertyRow icon={<Calendar size={13} />} label="Start Date">
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {task.startDate
                      ? formatShortDate(task.startDate)
                      : "Not set"}
                  </span>
                </PropertyRow>

                {/* Due Date */}
                <PropertyRow icon={<Calendar size={13} />} label="Due Date">
                  <span
                    className="text-xs font-medium"
                    style={{
                      color:
                        task.dueDate &&
                        isOverdue(task.dueDate) &&
                        task.status !== "done"
                          ? "#EF4444"
                          : "var(--text-secondary)",
                    }}
                  >
                    {task.dueDate ? formatShortDate(task.dueDate) : "Not set"}
                  </span>
                </PropertyRow>

                {/* Estimated Hours */}
                <PropertyRow icon={<Clock size={13} />} label="Estimated">
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {task.estimatedHours
                      ? `${task.estimatedHours} hours`
                      : "Not set"}
                  </span>
                </PropertyRow>

                {/* Time Spent */}
                <PropertyRow icon={<Clock size={13} />} label="Time Spent">
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {task.timeSpent ? `${task.timeSpent} hours` : "0 hours"}
                  </span>
                </PropertyRow>

                {/* Tags */}
                <PropertyRow icon={<Tag size={13} />} label="Tags">
                  <div className="flex flex-wrap gap-1">
                    {task.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: "#F0F0F8",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                    {task.tags.length === 0 && (
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        No tags
                      </span>
                    )}
                  </div>
                </PropertyRow>
              </div>

              {/* ─── Tab Nav ─────────────────────────────── */}
              <div
                className="flex items-center gap-0 px-5"
                style={{ borderBottom: "1px solid var(--content-border)" }}
              >
                <TabButton
                  active={activeTab === "details"}
                  onClick={() => setActiveTab("details")}
                  label="Details"
                  count={task.subtasks.length}
                />
                <TabButton
                  active={activeTab === "activity"}
                  onClick={() => setActiveTab("activity")}
                  label="Activity"
                  count={task.activity.length}
                />
                <TabButton
                  active={activeTab === "attachments"}
                  onClick={() => setActiveTab("attachments")}
                  label="Attachments"
                  count={task.attachments.length}
                />
              </div>

              {/* ─── Tab Content ─────────────────────────── */}
              {activeTab === "details" && (
                <div className="px-5 py-4 space-y-6">
                  {/* Description */}
                  <div>
                    <label
                      className="block text-xs font-semibold uppercase tracking-wider mb-2"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Description
                    </label>
                    <textarea
                      value={descValue}
                      onChange={(e) => setDescValue(e.target.value)}
                      onBlur={handleDescSave}
                      placeholder="Add a description..."
                      rows={4}
                      className="w-full p-3 rounded-lg text-sm resize-none focus:outline-none transition-all placeholder:text-[#C0C0D8]"
                      style={{
                        background: "var(--content-secondary)",
                        border: "1px solid var(--content-border)",
                        color: "var(--text-primary)",
                        lineHeight: "1.6",
                      }}
                      onFocus={(e) => {
                        e.target.style.border = "1px solid #6C47FF";
                        e.target.style.boxShadow =
                          "0 0 0 3px rgba(108,71,255,0.08)";
                      }}
                    />
                  </div>

                  {/* Subtasks */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label
                        className="text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        Subtasks ({doneSubtasks}/{task.subtasks.length})
                      </label>
                    </div>

                    {/* Subtask progress bar */}
                    {task.subtasks.length > 0 && (
                      <div
                        className="h-1.5 rounded-full overflow-hidden mb-3"
                        style={{ background: "#F0F0F8" }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(doneSubtasks / task.subtasks.length) * 100}%`,
                            background:
                              "linear-gradient(90deg, #22C55E, #4ADE80)",
                          }}
                        />
                      </div>
                    )}

                    {/* Subtask list */}
                    <div className="space-y-1">
                      {task.subtasks.map((subtask) => {
                        const stAssignee = subtask.assigneeId
                          ? getMember(subtask.assigneeId)
                          : null;
                        return (
                          <div
                            key={subtask.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors group/st"
                            style={{ background: "transparent" }}
                            onMouseEnter={(e) => {
                              (
                                e.currentTarget as HTMLElement
                              ).style.background = "var(--content-secondary)";
                            }}
                            onMouseLeave={(e) => {
                              (
                                e.currentTarget as HTMLElement
                              ).style.background = "transparent";
                            }}
                          >
                            <button
                              onClick={() => handleSubtaskToggle(subtask.id)}
                              className="flex-shrink-0"
                              style={{
                                color: subtask.done
                                  ? "#22C55E"
                                  : "var(--text-tertiary)",
                              }}
                            >
                              {subtask.done ? (
                                <CheckSquare size={14} />
                              ) : (
                                <Square size={14} />
                              )}
                            </button>
                            <span
                              className="flex-1 text-sm"
                              style={{
                                color: subtask.done
                                  ? "var(--text-tertiary)"
                                  : "var(--text-primary)",
                                textDecoration: subtask.done
                                  ? "line-through"
                                  : "none",
                              }}
                            >
                              {subtask.title}
                            </span>
                            {stAssignee && (
                              <div
                                className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white flex-shrink-0"
                                style={{ background: stAssignee.color }}
                                title={stAssignee.name}
                              >
                                {stAssignee.initials}
                              </div>
                            )}
                            {subtask.dueDate && (
                              <span
                                className="text-[10px] flex-shrink-0"
                                style={{
                                  color:
                                    isOverdue(subtask.dueDate) && !subtask.done
                                      ? "#EF4444"
                                      : "var(--text-tertiary)",
                                }}
                              >
                                {formatShortDate(subtask.dueDate)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Add subtask */}
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddSubtask();
                        }}
                        placeholder="Add subtask..."
                        className="flex-1 text-sm px-2 py-1.5 rounded-lg bg-transparent focus:outline-none placeholder:text-[#C0C0D8]"
                        style={{
                          border: "1px solid var(--content-border)",
                          color: "var(--text-primary)",
                        }}
                      />
                      <button
                        onClick={handleAddSubtask}
                        disabled={!newSubtaskTitle.trim()}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40"
                        style={{ background: "var(--vyne-purple)" }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Comments */}
                  <div>
                    <label
                      className="block text-xs font-semibold uppercase tracking-wider mb-3"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Comments ({task.comments.length})
                    </label>

                    {task.comments.length > 0 ? (
                      <div className="space-y-3 mb-4">
                        {task.comments.map((comment) => {
                          const author = getMember(comment.authorId);
                          return (
                            <div key={comment.id} className="flex gap-2.5">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold text-white flex-shrink-0 mt-0.5"
                                style={{
                                  background: author?.color ?? "#6C47FF",
                                }}
                              >
                                {author?.initials ?? "?"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 mb-0.5">
                                  <span
                                    className="text-xs font-semibold"
                                    style={{ color: "var(--text-primary)" }}
                                  >
                                    {author?.name ?? "Unknown"}
                                  </span>
                                  <span
                                    className="text-[10px]"
                                    style={{ color: "var(--text-tertiary)" }}
                                  >
                                    {formatRelativeTime(comment.createdAt)}
                                  </span>
                                </div>
                                <p
                                  className="text-sm leading-relaxed"
                                  style={{ color: "var(--text-secondary)" }}
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
                        className="text-sm text-center py-3"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        No comments yet
                      </p>
                    )}

                    {/* Comment input */}
                    <div className="flex gap-2 items-end">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            handleAddComment();
                          }
                        }}
                        placeholder="Leave a comment..."
                        rows={2}
                        className="flex-1 p-2.5 text-sm bg-transparent resize-none focus:outline-none placeholder:text-[#C0C0D8] rounded-lg"
                        style={{
                          border: "1px solid var(--content-border)",
                          color: "var(--text-primary)",
                        }}
                      />
                      <button
                        onClick={handleAddComment}
                        disabled={!commentText.trim()}
                        className="p-2.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          background: "var(--vyne-purple)",
                          color: "#FFFFFF",
                        }}
                      >
                        <Send size={14} />
                      </button>
                    </div>
                    <p
                      className="text-[10px] mt-1"
                      style={{ color: "#C0C0D8" }}
                    >
                      Ctrl + Enter to submit
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "activity" && (
                <div className="px-5 py-4">
                  {task.activity.length > 0 ? (
                    <div className="space-y-3">
                      {task.activity.map((entry) => {
                        const user = getMember(entry.userId);
                        return (
                          <div
                            key={entry.id}
                            className="flex items-start gap-2.5"
                          >
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold text-white flex-shrink-0 mt-0.5"
                              style={{ background: user?.color ?? "#6C47FF" }}
                            >
                              {user?.initials ?? "?"}
                            </div>
                            <div className="flex-1">
                              <p
                                className="text-sm"
                                style={{ color: "var(--text-primary)" }}
                              >
                                <span className="font-semibold">
                                  {user?.name ?? "Unknown"}
                                </span>{" "}
                                <span
                                  style={{ color: "var(--text-secondary)" }}
                                >
                                  {entry.description}
                                </span>
                              </p>
                              <span
                                className="text-[10px]"
                                style={{ color: "var(--text-tertiary)" }}
                              >
                                {formatRelativeTime(entry.createdAt)}
                              </span>
                            </div>
                            <ActivityIcon type={entry.type} />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p
                      className="text-sm text-center py-8"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      No activity recorded
                    </p>
                  )}
                </div>
              )}

              {activeTab === "attachments" && (
                <div className="px-5 py-4">
                  {task.attachments.length > 0 ? (
                    <div className="space-y-2">
                      {task.attachments.map((attachment) => {
                        const uploader = getMember(attachment.uploadedBy);
                        return (
                          <div
                            key={attachment.id}
                            className="flex items-center gap-3 p-3 rounded-lg transition-colors"
                            style={{
                              background: "var(--content-secondary)",
                              border: "1px solid var(--content-border)",
                            }}
                          >
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center"
                              style={{ background: "#F0F0F8" }}
                            >
                              <FileText
                                size={16}
                                style={{ color: "var(--text-tertiary)" }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className="text-sm font-medium truncate"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {attachment.name}
                              </p>
                              <p
                                className="text-[10px]"
                                style={{ color: "var(--text-tertiary)" }}
                              >
                                {attachment.size} &middot; Uploaded by{" "}
                                {uploader?.name ?? "Unknown"} &middot;{" "}
                                {formatRelativeTime(attachment.uploadedAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Paperclip
                        size={24}
                        style={{
                          color: "var(--text-tertiary)",
                          margin: "0 auto 8px",
                        }}
                      />
                      <p
                        className="text-sm"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        No attachments
                      </p>
                      <button
                        className="mt-3 text-xs font-medium px-3 py-1.5 rounded-lg"
                        style={{
                          background: "var(--content-secondary)",
                          color: "var(--vyne-purple)",
                          border: "1px solid var(--content-border)",
                        }}
                      >
                        Upload file
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Shared Sub-Components ───────────────────────────────────────

function PropertyRow({
  icon,
  label,
  children,
}: {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center gap-1.5 w-28 flex-shrink-0 text-xs"
        style={{ color: "var(--text-tertiary)" }}
      >
        {icon}
        {label}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function DropdownSelect({
  value,
  options,
  onChange,
}: {
  readonly value: string;
  readonly options: ReadonlyArray<{
    value: string;
    label: string;
    color: string;
  }>;
  readonly onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg transition-colors"
        style={{
          background: "var(--content-secondary)",
          border: "1px solid var(--content-border)",
          color: "var(--text-secondary)",
        }}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: selected?.color ?? "#A0A0B8" }}
        />
        {selected?.label ?? "Select"}
        <ChevronDown size={10} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full left-0 mt-1 rounded-lg py-1 z-50"
            style={{
              background: "var(--content-bg)",
              border: "1px solid var(--content-border)",
              boxShadow: "var(--shadow-lg)",
              minWidth: "140px",
            }}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-medium transition-colors text-left"
                style={{
                  color:
                    opt.value === value
                      ? "var(--vyne-purple)"
                      : "var(--text-secondary)",
                  background:
                    opt.value === value
                      ? "rgba(108,71,255,0.06)"
                      : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (opt.value !== value) {
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--content-secondary)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    opt.value === value
                      ? "rgba(108,71,255,0.06)"
                      : "transparent";
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: opt.color }}
                />
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly label: string;
  readonly count: number;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2.5 text-xs font-medium transition-all relative"
      style={{
        color: active ? "var(--vyne-purple)" : "var(--text-tertiary)",
      }}
    >
      {label}
      {count > 0 && (
        <span
          className="ml-1 text-[10px] px-1 py-0.5 rounded-full"
          style={{
            background: active
              ? "rgba(108,71,255,0.08)"
              : "var(--content-secondary)",
            color: active ? "var(--vyne-purple)" : "var(--text-tertiary)",
          }}
        >
          {count}
        </span>
      )}
      {active && (
        <motion.div
          layoutId="panel-tab-indicator"
          className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
          style={{ background: "var(--vyne-purple)" }}
        />
      )}
    </button>
  );
}

function ActivityIcon({ type }: { readonly type: string }) {
  const style = { color: "var(--text-tertiary)" };
  switch (type) {
    case "status_change":
      return <Flag size={12} style={style} />;
    case "assignment":
      return <User size={12} style={style} />;
    case "comment":
      return <MessageSquare size={12} style={style} />;
    case "created":
      return <Plus size={12} style={style} />;
    case "priority_change":
      return <ChevronRight size={12} style={style} />;
    default:
      return <Activity size={12} style={style} />;
  }
}

function EmptyState({ message }: { readonly message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "rgba(108,71,255,0.08)" }}
      >
        <LayoutList size={24} style={{ color: "var(--vyne-purple)" }} />
      </div>
      <h3
        className="font-semibold text-base mb-1"
        style={{ color: "var(--text-primary)" }}
      >
        {message}
      </h3>
      <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
        Try adjusting your search or filters
      </p>
    </div>
  );
}

// ─── Utility Functions ───────────────────────────────────────────

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isOverdue(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

function formatRelativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
