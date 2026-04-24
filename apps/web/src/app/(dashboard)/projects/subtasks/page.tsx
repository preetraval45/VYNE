"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Clock, CheckSquare, Square, Search, X, ListTree, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { useProjects, useProjectsStore } from "@/lib/stores/projects";
import type { Subtask, Task } from "@/lib/fixtures/projects";
import { ProjectsStatsStrip } from "@/components/projects/ProjectsStatsStrip";
import { PageHeader, EmptyState } from "@/components/shared/Kit";
import { useFocusTrap } from "@/hooks/useFocusTrap";

type Filter = "open" | "done" | "all";

export default function SubtasksKanbanPage() {
  const projects = useProjects();
  const allTasks = useProjectsStore((s) => s.tasks);
  const toggleSubtask = useProjectsStore((s) => s.toggleSubtask);
  const addSubtask = useProjectsStore((s) => s.addSubtask);
  const [filter, setFilter] = useState<Filter>("open");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  // Flatten subtasks with parent info
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list: Array<{ parent: Task; sub: Subtask }> = [];
    for (const t of allTasks) {
      for (const s of t.subtasks) {
        if (filter === "open" && s.done) continue;
        if (filter === "done" && !s.done) continue;
        if (q && !s.title.toLowerCase().includes(q) && !t.title.toLowerCase().includes(q)) continue;
        list.push({ parent: t, sub: s });
      }
    }
    return list;
  }, [allTasks, filter, search]);

  const kpis = useMemo(() => {
    let total = 0;
    let done = 0;
    let overdue = 0;
    const now = Date.now();
    for (const t of allTasks) {
      for (const s of t.subtasks) {
        total += 1;
        if (s.done) done += 1;
        if (!s.done && t.dueDate && new Date(t.dueDate).getTime() < now) overdue += 1;
      }
    }
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, pct, overdue };
  }, [allTasks]);

  // Group by parent task
  const groupedByTask = useMemo(() => {
    const map = new Map<string, { parent: Task; subs: Subtask[] }>();
    for (const { parent, sub } of rows) {
      const entry = map.get(parent.id);
      if (entry) entry.subs.push(sub);
      else map.set(parent.id, { parent, subs: [sub] });
    }
    return Array.from(map.values());
  }, [rows]);

  return (
    <div className="flex flex-col h-full">
      <ProjectsStatsStrip
        items={[
          { label: "Total", value: kpis.total, hint: "All subtasks" },
          { label: "Done", value: `${kpis.pct}%`, tone: "success", hint: `${kpis.done} completed` },
          { label: "Open", value: kpis.total - kpis.done, tone: "teal", hint: "Still to do" },
          { label: "Overdue", value: kpis.overdue, tone: kpis.overdue > 0 ? "danger" : "default", hint: "Parent past due" },
        ]}
      />
      <PageHeader
        icon={<ListTree size={16} />}
        title="Sub Tasks"
        subtitle={`${rows.length} subtask${rows.length === 1 ? "" : "s"} across ${groupedByTask.length} parent task${groupedByTask.length === 1 ? "" : "s"}`}
        actions={
          <>
            <div
              role="group"
              aria-label="Subtask filter"
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
                  {f === "open" ? "Open" : f === "done" ? "Done" : "All"}
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
                placeholder="Search subtasks…"
                aria-label="Search subtasks"
                className="flex-1 bg-transparent text-sm focus:outline-none"
                style={{ color: "var(--text-primary)" }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 0 }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="btn-teal"
              aria-label="Create new subtask (C)"
              title="New subtask  ·  C"
              style={{ height: 34 }}
              disabled={allTasks.length === 0}
            >
              <Plus size={14} /> New subtask
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
        {groupedByTask.length === 0 ? (
          <EmptyState
            icon={<ListTree size={24} />}
            title={search || filter !== "all" ? "No subtasks match your filter" : "No subtasks yet"}
            body="Open any task and break it down with subtasks — they'll appear here grouped by parent."
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
            {groupedByTask.map(({ parent, subs }) => {
              const project = projects.find((p) => p.id === parent.projectId);
              const done = subs.filter((s) => s.done).length;
              return (
                <section
                  key={parent.id}
                  style={{
                    width: 292,
                    minWidth: 292,
                    background: "var(--content-secondary)",
                    border: "1px solid var(--content-border)",
                    borderRadius: 12,
                    padding: 6,
                  }}
                >
                  <header
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      padding: "10px 12px",
                      borderBottom: "1px solid var(--content-border)",
                      borderTop: `3px solid ${project?.color ?? "var(--vyne-teal)"}`,
                      borderTopLeftRadius: 8,
                      borderTopRightRadius: 8,
                    }}
                  >
                    <Link
                      href={`/projects/${parent.projectId}`}
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "var(--text-tertiary)",
                        textDecoration: "none",
                      }}
                    >
                      {project?.name ?? "Project"} · {parent.key}
                    </Link>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13.5,
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          letterSpacing: "-0.01em",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          flex: 1,
                        }}
                      >
                        {parent.title}
                      </span>
                      <span
                        aria-label={`${done} of ${subs.length} done`}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--vyne-teal)",
                          background: "var(--vyne-teal-soft)",
                          padding: "2px 7px",
                          borderRadius: 999,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {done}/{subs.length}
                      </span>
                    </div>
                  </header>
                  <div
                    style={{
                      padding: 8,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    {subs.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          toggleSubtask(parent.id, s.id);
                          toast.success(
                            s.done ? "Marked as open" : "Marked as done",
                          );
                        }}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          padding: "10px 12px",
                          background: "var(--content-bg)",
                          border: "1px solid var(--content-border)",
                          borderRadius: 9,
                          textAlign: "left",
                          cursor: "pointer",
                          color: "var(--text-primary)",
                          fontSize: 13.5,
                          lineHeight: 1.4,
                          textDecoration: s.done ? "line-through" : "none",
                          opacity: s.done ? 0.7 : 1,
                        }}
                      >
                        <span style={{ color: s.done ? "var(--vyne-teal)" : "var(--text-tertiary)", marginTop: 1 }}>
                          {s.done ? <CheckSquare size={14} /> : <Square size={14} />}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>{s.title}</span>
                        {parent.dueDate && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 11,
                              color: "var(--text-tertiary)",
                              flexShrink: 0,
                            }}
                          >
                            <Clock size={10} />
                            {new Date(parent.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <NewSubtaskQuickModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        tasks={allTasks}
        projects={projects}
        onCreate={(taskId, title) => {
          addSubtask(taskId, {
            title,
            done: false,
            assigneeId: null,
            dueDate: null,
          });
          const parent = allTasks.find((t) => t.id === taskId);
          toast.success(`Subtask added to ${parent?.title ?? "task"}`);
          setShowCreate(false);
        }}
      />
    </div>
  );
}

function NewSubtaskQuickModal({
  open,
  onClose,
  tasks,
  projects,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  projects: ReturnType<typeof useProjects>;
  onCreate: (taskId: string, title: string) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open, onClose);
  const [taskId, setTaskId] = useState("");
  const [title, setTitle] = useState("");

  if (!open) return null;
  const effectiveTaskId = taskId || tasks[0]?.id || "";

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
        aria-label="Create new subtask"
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
            New subtask
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
            if (!title.trim() || !effectiveTaskId) return;
            onCreate(effectiveTaskId, title.trim());
            setTitle("");
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Parent task</span>
            <select
              value={effectiveTaskId}
              onChange={(e) => setTaskId(e.target.value)}
              aria-label="Parent task"
              style={stInput}
            >
              {tasks.map((t) => {
                const p = projects.find((pr) => pr.id === t.projectId);
                return (
                  <option key={t.id} value={t.id}>
                    {p?.name ? `${p.name} · ` : ""}{t.key} — {t.title}
                  </option>
                );
              })}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              placeholder="e.g. Draft the API spec"
              style={stInput}
              required
            />
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
            <button type="button" onClick={onClose} style={stCancelBtn}>
              Cancel
            </button>
            <button type="submit" className="btn-teal" disabled={!title.trim()}>
              Create subtask
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const stInput: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--content-border)",
  background: "var(--content-bg)",
  color: "var(--text-primary)",
  fontSize: 14,
  outline: "none",
};

const stCancelBtn: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: 8,
  border: "1px solid var(--content-border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 13.5,
  fontWeight: 600,
  cursor: "pointer",
};
