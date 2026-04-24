"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckSquare,
  Clock,
  Flag,
  MessageSquare,
  Plus,
  Square,
  Tag,
  Trash2,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  useProject,
  useProjectsStore,
  useTeamMembers,
} from "@/lib/stores/projects";
import {
  TASK_PRIORITY_META,
  TASK_STATUS_META,
  getMember,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/fixtures/projects";
import { PipelineBreadcrumb, type PipelineStage } from "@/components/shared/Kit";
import { useCustomFieldsStore } from "@/lib/stores/customFields";

const STATUS_ORDER: TaskStatus[] = [
  "todo",
  "in_progress",
  "in_review",
  "done",
  "blocked",
];
const STATUS_TONE: Record<
  TaskStatus,
  "neutral" | "info" | "warn" | "success" | "danger"
> = {
  todo: "neutral",
  in_progress: "info",
  in_review: "warn",
  done: "success",
  blocked: "danger",
};

interface PageProps {
  params: Promise<{ projectId: string; taskId: string }>;
}

export default function TaskDetailPage({ params }: PageProps) {
  const { projectId, taskId } = use(params);
  const router = useRouter();
  const project = useProject(projectId);
  const task = useProjectsStore((s) => s.tasks.find((t) => t.id === taskId));
  const teamMembers = useTeamMembers();
  const updateTask = useProjectsStore((s) => s.updateTask);
  const deleteTask = useProjectsStore((s) => s.deleteTask);
  const addSubtask = useProjectsStore((s) => s.addSubtask);
  const toggleSubtask = useProjectsStore((s) => s.toggleSubtask);
  const deleteSubtask = useProjectsStore((s) => s.deleteSubtask);
  const addComment = useProjectsStore((s) => s.addComment);

  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newComment, setNewComment] = useState("");

  const stages: PipelineStage[] = useMemo(
    () =>
      STATUS_ORDER.map((s) => ({
        id: s,
        label: TASK_STATUS_META[s].label,
        tone: STATUS_TONE[s],
      })),
    [],
  );

  if (!task || !project) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
          Task not found.
        </p>
        <Link href="/projects" className="btn-teal">
          Back to projects
        </Link>
      </div>
    );
  }

  const assignee = task.assigneeId ? getMember(task.assigneeId) : null;
  const priorityMeta = TASK_PRIORITY_META[task.priority];
  const doneSubs = task.subtasks.filter((s) => s.done).length;
  const totalSubs = task.subtasks.length;
  const subPct = totalSubs > 0 ? Math.round((doneSubs / totalSubs) * 100) : 0;

  function onStatusChange(nextId: string) {
    const next = nextId as TaskStatus;
    if (next === task!.status) return;
    updateTask(task!.id, { status: next });
    toast.success(`Status → ${TASK_STATUS_META[next].label}`);
  }

  function onAddSubtask() {
    const title = newSubtaskTitle.trim();
    if (!title) return;
    addSubtask(task!.id, { title, done: false, assigneeId: null, dueDate: null });
    setNewSubtaskTitle("");
  }

  function onAddComment() {
    const text = newComment.trim();
    if (!text) return;
    addComment(task!.id, {
      authorId: "u1",
      content: text,
    });
    setNewComment("");
  }

  function onDelete() {
    if (!confirm("Delete this task? This cannot be undone.")) return;
    deleteTask(task!.id);
    toast.success("Task deleted");
    router.push(`/projects/${projectId}`);
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--content-bg-secondary)" }}>
      {/* Breadcrumb + meta bar */}
      <header
        style={{
          padding: "14px 24px 10px",
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
        }}
      >
        <nav
          aria-label="Breadcrumb"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "var(--text-tertiary)",
            marginBottom: 10,
          }}
        >
          <Link
            href="/projects"
            style={{ color: "var(--text-tertiary)", textDecoration: "none" }}
          >
            Projects
          </Link>
          <span>/</span>
          <Link
            href={`/projects/${project.id}`}
            style={{ color: "var(--text-tertiary)", textDecoration: "none" }}
          >
            {project.name}
          </Link>
          <span>/</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
            {task.key}
          </span>
        </nav>

        {/* Status pipeline — click to change task status */}
        <PipelineBreadcrumb
          stages={stages}
          activeId={task.status}
          onSelect={onStatusChange}
        />
      </header>

      {/* Body */}
      <div
        className="flex-1 overflow-auto content-scroll"
        style={{ padding: "20px 24px 48px" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 320px",
            gap: 20,
            maxWidth: 1240,
            margin: "0 auto",
          }}
        >
          {/* Main column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <section style={cardStyle}>
              <Link
                href={`/projects/${project.id}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                  textDecoration: "none",
                  marginBottom: 10,
                }}
              >
                <ArrowLeft size={12} /> Back to board
              </Link>
              <input
                type="text"
                value={task.title}
                onChange={(e) => updateTask(task.id, { title: e.target.value })}
                aria-label="Task title"
                style={{
                  width: "100%",
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  color: "var(--text-primary)",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  padding: "4px 0",
                  marginBottom: 4,
                }}
              />
              <textarea
                value={task.description}
                onChange={(e) =>
                  updateTask(task.id, { description: e.target.value })
                }
                aria-label="Task description"
                placeholder="Add a description…"
                rows={6}
                style={{
                  width: "100%",
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "var(--text-primary)",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  resize: "vertical",
                  padding: "8px 0",
                  minHeight: 120,
                }}
              />
            </section>

            {/* Subtasks */}
            <section style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 14,
                }}
              >
                <h2 style={sectionTitle}>Subtasks</h2>
                {totalSubs > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--vyne-teal)",
                      background: "var(--vyne-teal-soft)",
                      padding: "2px 10px",
                      borderRadius: 999,
                    }}
                  >
                    {doneSubs}/{totalSubs} · {subPct}%
                  </span>
                )}
              </div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "0 0 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {task.subtasks.map((s) => (
                  <li
                    key={s.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      background: "var(--content-secondary)",
                      border: "1px solid var(--content-border)",
                      borderRadius: 9,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSubtask(task.id, s.id)}
                      aria-label={s.done ? "Mark open" : "Mark done"}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: s.done ? "var(--vyne-teal)" : "var(--text-tertiary)",
                        cursor: "pointer",
                      }}
                    >
                      {s.done ? <CheckSquare size={15} /> : <Square size={15} />}
                    </button>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 13.5,
                        color: "var(--text-primary)",
                        textDecoration: s.done ? "line-through" : "none",
                        opacity: s.done ? 0.65 : 1,
                      }}
                    >
                      {s.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteSubtask(task.id, s.id)}
                      aria-label="Delete subtask"
                      style={iconBtn}
                    >
                      <Trash2 size={12} />
                    </button>
                  </li>
                ))}
              </ul>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onAddSubtask();
                }}
                style={{ display: "flex", gap: 8 }}
              >
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Add a subtask and press Enter"
                  aria-label="New subtask"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="submit"
                  className="btn-teal"
                  disabled={!newSubtaskTitle.trim()}
                >
                  <Plus size={13} /> Add
                </button>
              </form>
            </section>

            {/* Comments */}
            <section style={cardStyle}>
              <h2 style={sectionTitle}>
                <MessageSquare size={14} style={{ marginRight: 6 }} />
                Activity · {task.comments.length} comment
                {task.comments.length === 1 ? "" : "s"}
              </h2>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "14px 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {task.comments.map((c) => {
                  const author = getMember(c.authorId);
                  return (
                    <li
                      key={c.id}
                      style={{
                        display: "flex",
                        gap: 10,
                        padding: "10px 12px",
                        background: "var(--content-secondary)",
                        borderRadius: 9,
                        border: "1px solid var(--content-border)",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: author?.color ?? "var(--content-border)",
                          color: "#fff",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {author?.initials ?? "?"}
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "baseline",
                            marginBottom: 2,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--text-primary)",
                            }}
                          >
                            {author?.name ?? "Unknown"}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--text-tertiary)",
                            }}
                          >
                            {new Date(c.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 13.5,
                            color: "var(--text-primary)",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {c.content}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onAddComment();
                }}
                style={{ display: "flex", gap: 8, alignItems: "flex-start" }}
              >
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      onAddComment();
                    }
                  }}
                  placeholder="Write a comment… (⌘ + Enter to send)"
                  aria-label="New comment"
                  rows={3}
                  style={{ ...inputStyle, flex: 1, resize: "vertical" }}
                />
                <button
                  type="submit"
                  className="btn-teal"
                  disabled={!newComment.trim()}
                >
                  Post
                </button>
              </form>
            </section>
          </div>

          {/* Sidebar column */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <section style={cardStyle}>
              <h2 style={sectionTitle}>Properties</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                <Row icon={<Flag size={13} />} label="Priority">
                  <select
                    value={task.priority}
                    onChange={(e) =>
                      updateTask(task.id, {
                        priority: e.target.value as TaskPriority,
                      })
                    }
                    aria-label="Priority"
                    style={{ ...inputStyle, padding: "6px 8px" }}
                  >
                    {(Object.keys(TASK_PRIORITY_META) as TaskPriority[]).map((p) => (
                      <option key={p} value={p}>
                        {TASK_PRIORITY_META[p].label}
                      </option>
                    ))}
                  </select>
                </Row>
                <Row icon={<User size={13} />} label="Assignee">
                  <select
                    value={task.assigneeId ?? ""}
                    onChange={(e) =>
                      updateTask(task.id, {
                        assigneeId: e.target.value || null,
                      })
                    }
                    aria-label="Assignee"
                    style={{ ...inputStyle, padding: "6px 8px" }}
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </Row>
                <Row icon={<Calendar size={13} />} label="Due date">
                  <input
                    type="date"
                    value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                    onChange={(e) =>
                      updateTask(task.id, {
                        dueDate: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      })
                    }
                    aria-label="Due date"
                    style={{ ...inputStyle, padding: "6px 8px" }}
                  />
                </Row>
                <Row icon={<Clock size={13} />} label="Estimate (h)">
                  <input
                    type="number"
                    min={0}
                    step={0.25}
                    value={task.estimatedHours ?? ""}
                    onChange={(e) =>
                      updateTask(task.id, {
                        estimatedHours: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                    aria-label="Estimate in hours"
                    style={{ ...inputStyle, padding: "6px 8px" }}
                    placeholder="—"
                  />
                </Row>
                <Row icon={<Tag size={13} />} label="Tags">
                  <input
                    type="text"
                    value={task.tags.join(", ")}
                    onChange={(e) =>
                      updateTask(task.id, {
                        tags: e.target.value
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="comma, separated"
                    aria-label="Tags"
                    style={{ ...inputStyle, padding: "6px 8px" }}
                  />
                </Row>
              </div>
            </section>

            <CustomFieldsPanel taskId={task.id} />


            <section style={cardStyle}>
              <h2 style={sectionTitle}>Summary</h2>
              <div style={{ fontSize: 13, margin: 0 }}>
                <SummaryRow
                  label="Status"
                  value={
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 600,
                        background: TASK_STATUS_META[task.status].bgColor,
                        color: TASK_STATUS_META[task.status].color,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: TASK_STATUS_META[task.status].color,
                        }}
                      />
                      {TASK_STATUS_META[task.status].label}
                    </span>
                  }
                />
                <SummaryRow
                  label="Priority"
                  value={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: priorityMeta.color,
                        }}
                      />
                      {priorityMeta.label}
                    </span>
                  }
                />
                <SummaryRow
                  label="Assignee"
                  value={
                    assignee ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: assignee.color,
                            color: "#fff",
                            fontSize: 9,
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {assignee.initials}
                        </span>
                        {assignee.name}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-tertiary)" }}>Unassigned</span>
                    )
                  }
                />
                <SummaryRow label="Created" value={new Date(task.createdAt).toLocaleDateString()} />
                <SummaryRow label="Updated" value={new Date(task.updatedAt).toLocaleDateString()} />
                <SummaryRow label="Key" value={<code style={{ fontFamily: "var(--font-mono)" }}>{task.key}</code>} />
              </div>
            </section>

            <button
              type="button"
              onClick={onDelete}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "10px 14px",
                borderRadius: 9,
                border: "1px solid rgba(239, 68, 68, 0.3)",
                background: "rgba(239, 68, 68, 0.08)",
                color: "#EF4444",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Trash2 size={13} /> Delete task
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}

function CustomFieldsPanel({ taskId }: { taskId: string }) {
  const fields = useCustomFieldsStore((s) => s.getSchema("tasks").fields);
  const [values, setValues] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(`vyne-task-custom:${taskId}`);
      return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      return {};
    }
  });

  if (fields.length === 0) return null;

  function set(id: string, v: string) {
    setValues((prev) => {
      const next = { ...prev, [id]: v };
      try {
        localStorage.setItem(`vyne-task-custom:${taskId}`, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <section style={cardStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <h2 style={sectionTitle}>Custom fields</h2>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--vyne-teal)",
            background: "var(--vyne-teal-soft)",
            padding: "2px 8px",
            borderRadius: 999,
          }}
        >
          {fields.length} configured
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {fields.map((f) => (
          <div key={f.id} style={{ display: "grid", gridTemplateColumns: "110px 1fr", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                fontWeight: 500,
              }}
            >
              {f.label}
            </span>
            {f.type === "checkbox" ? (
              <input
                type="checkbox"
                aria-label={f.label}
                title={f.label}
                checked={values[f.id] === "true"}
                onChange={(e) => set(f.id, e.target.checked ? "true" : "false")}
              />
            ) : f.type === "select" ? (
              <select
                aria-label={f.label}
                title={f.label}
                value={values[f.id] ?? ""}
                onChange={(e) => set(f.id, e.target.value)}
                style={{ ...inputStyle, padding: "6px 8px" }}
              >
                <option value="">—</option>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                aria-label={f.label}
                title={f.label}
                placeholder={f.label}
                value={values[f.id] ?? ""}
                onChange={(e) => set(f.id, e.target.value)}
                style={{ ...inputStyle, padding: "6px 8px" }}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", alignItems: "center", gap: 8 }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: "var(--text-tertiary)",
          fontWeight: 500,
        }}
      >
        {icon}
        {label}
      </span>
      <span>{children}</span>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 0",
        borderBottom: "1px solid var(--content-border)",
      }}
    >
      <span
        style={{
          fontSize: 11.5,
          color: "var(--text-tertiary)",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--content-bg)",
  border: "1px solid var(--content-border)",
  borderRadius: 14,
  padding: "16px 18px",
};

const sectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: "-0.01em",
  color: "var(--text-primary)",
  display: "inline-flex",
  alignItems: "center",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--content-border)",
  background: "var(--content-bg)",
  color: "var(--text-primary)",
  fontSize: 13,
  outline: "none",
};

const iconBtn: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 6,
  border: "1px solid var(--content-border)",
  background: "var(--content-bg)",
  color: "var(--text-tertiary)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
