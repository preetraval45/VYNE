"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Star, Clock, CheckSquare, Search, X, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { useProjects, useProjectsStore } from "@/lib/stores/projects";
import { TASK_STATUS_META, getMember, type Task } from "@/lib/fixtures/projects";
import { ProjectsStatsStrip } from "@/components/projects/ProjectsStatsStrip";
import { PageHeader, EmptyState } from "@/components/shared/Kit";
import { useFocusTrap } from "@/hooks/useFocusTrap";

type Filter = "open" | "done" | "all";

export default function TasksKanbanPage() {
  const projects = useProjects();
  const allTasks = useProjectsStore((s) => s.tasks);
  const updateTask = useProjectsStore((s) => s.updateTask);
  const addTask = useProjectsStore((s) => s.addTask);
  const [filter, setFilter] = useState<Filter>("open");
  const [search, setSearch] = useState("");
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);
  const [createForProjectId, setCreateForProjectId] = useState<string | null>(null);
  const showCreate = createForProjectId !== null;

  const visibleTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allTasks.filter((t) => {
      if (filter === "open" && t.status === "done") return false;
      if (filter === "done" && t.status !== "done") return false;
      if (q && !(t.title.toLowerCase().includes(q) || t.key.toLowerCase().includes(q))) {
        return false;
      }
      return true;
    });
  }, [allTasks, filter, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const p of projects) map.set(p.id, []);
    for (const t of visibleTasks) {
      const list = map.get(t.projectId);
      if (list) list.push(t);
    }
    return map;
  }, [projects, visibleTasks]);

  const totalFiltered = visibleTasks.length;

  const kpis = useMemo(() => {
    const total = allTasks.length;
    const done = allTasks.filter((t) => t.status === "done").length;
    const inProgress = allTasks.filter((t) => t.status === "in_progress").length;
    const overdue = allTasks.filter(
      (t) => t.status !== "done" && t.dueDate && new Date(t.dueDate) < new Date(),
    ).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, overdue, pct };
  }, [allTasks]);

  function onDropToProject(e: React.DragEvent, projectId: string) {
    e.preventDefault();
    setDragOverProjectId(null);
    const raw = e.dataTransfer.getData("text/plain");
    const taskId = raw.startsWith("task:") ? raw.slice(5) : "";
    if (!taskId) return;
    const task = allTasks.find((t) => t.id === taskId);
    if (!task || task.projectId === projectId) return;
    updateTask(taskId, { projectId });
    const projectName = projects.find((p) => p.id === projectId)?.name ?? "project";
    toast.success(`Moved to ${projectName}`);
  }

  return (
    <div className="flex flex-col h-full">
      <ProjectsStatsStrip
        items={[
          { label: "Total", value: kpis.total, hint: "All tasks" },
          { label: "In progress", value: kpis.inProgress, tone: "teal", hint: "Active now" },
          { label: "Done", value: `${kpis.pct}%`, tone: "success", hint: `${kpis.done} complete` },
          { label: "Overdue", value: kpis.overdue, tone: kpis.overdue > 0 ? "danger" : "default", hint: "Past due date" },
        ]}
      />
      <PageHeader
        icon={<CheckSquare size={16} />}
        title="All Tasks"
        subtitle={`${totalFiltered} task${totalFiltered === 1 ? "" : "s"}`}
        actions={
          <>
            {/* Filter chip */}
            <div
              role="group"
              aria-label="Task filter"
              style={{
                display: "inline-flex",
                padding: 4,
                borderRadius: 10,
                background: "var(--content-secondary)",
                border: "1px solid var(--content-border)",
                gap: 2,
              }}
            >
              {(["open", "done", "all"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 7,
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: filter === f ? "#fff" : "var(--text-secondary)",
                    background: filter === f ? "var(--vyne-teal)" : "transparent",
                    border: "none",
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {f === "open" ? "Open tasks" : f === "done" ? "Done" : "All"}
                </button>
              ))}
            </div>
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{
                background: "var(--content-secondary)",
                border: "1px solid var(--content-border)",
                width: 240,
                height: 34,
              }}
            >
              <Search size={14} style={{ color: "var(--text-tertiary)" }} />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks…"
                aria-label="Search tasks"
                className="flex-1 bg-transparent text-sm focus:outline-none"
                style={{ color: "var(--text-primary)" }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-tertiary)",
                    padding: 0,
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setCreateForProjectId("")}
              className="btn-teal"
              aria-label="Create new task (C)"
              title="New task  ·  C"
              style={{ height: 34 }}
            >
              <Plus size={14} /> New task
              <kbd
                aria-hidden="true"
                style={{
                  marginLeft: 6,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: "rgba(255,255,255,0.18)",
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                }}
              >
                C
              </kbd>
            </button>
          </>
        }
      />

      <div
        className="flex-1 overflow-x-auto content-scroll"
        style={{ padding: "18px 20px 24px", background: "var(--content-bg-secondary)" }}
      >
        {projects.length === 0 ? (
          <EmptyState
            icon={<CheckSquare size={24} />}
            title="No projects yet"
            body="Create a project first, then add tasks to it."
          />
        ) : (
          <div
            style={{
              display: "flex",
              gap: 14,
              alignItems: "flex-start",
              minWidth: "max-content",
            }}
          >
            {projects.map((project) => {
              const tasks = grouped.get(project.id) ?? [];
              const isOver = dragOverProjectId === project.id;
              return (
                <section
                  key={project.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDragOverProjectId(project.id);
                  }}
                  onDragLeave={(e) => {
                    const related = e.relatedTarget as Node | null;
                    if (!related || !(e.currentTarget as Node).contains(related)) {
                      setDragOverProjectId((v) => (v === project.id ? null : v));
                    }
                  }}
                  onDrop={(e) => onDropToProject(e, project.id)}
                  style={{
                    width: 292,
                    minWidth: 292,
                    background: "var(--content-secondary)",
                    border: `1px solid ${isOver ? "var(--vyne-teal)" : "var(--content-border)"}`,
                    borderRadius: 12,
                    padding: 6,
                    boxShadow: isOver ? "0 12px 28px rgba(6,182,212,0.25)" : "none",
                    transition: "box-shadow 0.15s, border-color 0.15s",
                  }}
                >
                  <header
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderBottom: "1px solid var(--content-border)",
                      borderTop: `3px solid ${project.color}`,
                      borderTopLeftRadius: 8,
                      borderTopRightRadius: 8,
                    }}
                  >
                    <Link
                      href={`/projects/${project.id}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        textDecoration: "none",
                        color: "var(--text-primary)",
                        fontWeight: 700,
                        letterSpacing: "-0.01em",
                        fontSize: 14,
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <span aria-hidden="true" style={{ fontSize: 15 }}>
                        {project.icon ?? "📋"}
                      </span>
                      <span
                        style={{
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {project.name}
                      </span>
                    </Link>
                    <span
                      aria-label={`${tasks.length} tasks`}
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--text-secondary)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {tasks.length}
                    </span>
                  </header>
                  <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 8, minHeight: 60 }}>
                    {tasks.length === 0 ? (
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--text-tertiary)",
                          textAlign: "center",
                          padding: "18px 6px",
                          margin: 0,
                          background: "var(--content-bg)",
                          borderRadius: 8,
                          border: "1px dashed var(--content-border)",
                        }}
                      >
                        No tasks
                      </p>
                    ) : (
                      tasks.map((task) => <TaskCard key={task.id} task={task} />)
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateForProjectId(project.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "10px 12px",
                      margin: "0 4px 4px",
                      borderRadius: 8,
                      color: "var(--vyne-teal)",
                      background: "transparent",
                      border: "none",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <Plus size={12} /> Add task
                  </button>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <NewTaskQuickModal
        open={showCreate}
        onClose={() => setCreateForProjectId(null)}
        projects={projects}
        defaultProjectId={createForProjectId ?? ""}
        onCreate={(projectId, title) => {
          addTask(projectId, {
            title,
            description: "",
            status: "todo",
            priority: "medium",
            assigneeId: null,
            startDate: null,
            dueDate: null,
            estimatedHours: null,
            timeSpent: null,
            tags: [],
            subtasks: [],
            comments: [],
          });
          const name = projects.find((p) => p.id === projectId)?.name ?? "project";
          toast.success(`Task added to ${name}`);
          setCreateForProjectId(null);
        }}
      />
    </div>
  );
}

function NewTaskQuickModal({
  open,
  onClose,
  projects,
  defaultProjectId = "",
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  projects: ReturnType<typeof useProjects>;
  defaultProjectId?: string;
  onCreate: (projectId: string, title: string) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open, onClose);
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [title, setTitle] = useState("");

  if (!open) return null;
  const effectiveProjectId = projectId || defaultProjectId || projects[0]?.id || "";

  return (
    <div
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 20,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Create new task"
        tabIndex={-1}
        style={{
          background: "var(--content-bg)",
          borderRadius: 14,
          width: "100%",
          maxWidth: 480,
          padding: 22,
          boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
          border: "1px solid var(--content-border)",
          outline: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
            New task
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              background: "var(--content-secondary)",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            <X size={13} />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim() || !effectiveProjectId) return;
            onCreate(effectiveProjectId, title.trim());
            setTitle("");
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Project</span>
            <select
              value={effectiveProjectId}
              onChange={(e) => setProjectId(e.target.value)}
              aria-label="Project"
              style={inputStyle}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon ?? "📋"} {p.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              placeholder="Short, action-oriented title"
              style={inputStyle}
              required
            />
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
            <button type="button" onClick={onClose} style={cancelBtn}>
              Cancel
            </button>
            <button type="submit" className="btn-teal" disabled={!title.trim()}>
              Create task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--content-border)",
  background: "var(--content-bg)",
  color: "var(--text-primary)",
  fontSize: 14,
  outline: "none",
};

const cancelBtn: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: 8,
  border: "1px solid var(--content-border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 13.5,
  fontWeight: 600,
  cursor: "pointer",
};

function TaskCard({ task }: { task: Task }) {
  const assignee = task.assigneeId ? getMember(task.assigneeId) : undefined;
  const meta = TASK_STATUS_META[task.status];
  const done = task.subtasks.filter((s) => s.done).length;
  const total = task.subtasks.length;
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", `task:${task.id}`);
        e.dataTransfer.effectAllowed = "move";
      }}
      role="button"
      tabIndex={0}
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderLeft: `3px solid ${meta.color}`,
        borderRadius: 10,
        padding: "10px 12px",
        cursor: "grab",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <button
          type="button"
          aria-label="Star task"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-tertiary)",
            cursor: "pointer",
            padding: 0,
            marginTop: 2,
          }}
        >
          <Star size={13} />
        </button>
        <p
          style={{
            margin: 0,
            fontSize: 13.5,
            fontWeight: 600,
            color: "var(--text-primary)",
            lineHeight: 1.35,
            flex: 1,
            minWidth: 0,
          }}
        >
          {task.title}
        </p>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 11.5,
          color: "var(--text-tertiary)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {task.dueDate && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Clock size={11} />
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
          {total > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <CheckSquare size={11} /> {done}/{total}
            </span>
          )}
        </span>
        {assignee ? (
          <span
            title={assignee.name}
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: assignee.color,
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {assignee.initials}
          </span>
        ) : (
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              border: "1.5px dashed var(--content-border)",
            }}
          />
        )}
      </div>
    </div>
  );
}
