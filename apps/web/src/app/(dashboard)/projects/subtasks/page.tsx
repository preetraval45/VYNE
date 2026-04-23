"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock, CheckSquare, Square, Search, X, ListTree } from "lucide-react";
import toast from "react-hot-toast";
import { useProjects, useProjectsStore } from "@/lib/stores/projects";
import type { Subtask, Task } from "@/lib/fixtures/projects";
import { ProjectsSubNav } from "@/components/projects/ProjectsSubNav";
import { PageHeader, EmptyState } from "@/components/shared/Kit";

type Filter = "open" | "done" | "all";

export default function SubtasksKanbanPage() {
  const projects = useProjects();
  const allTasks = useProjectsStore((s) => s.tasks);
  const toggleSubtask = useProjectsStore((s) => s.toggleSubtask);
  const [filter, setFilter] = useState<Filter>("open");
  const [search, setSearch] = useState("");

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
      <ProjectsSubNav />
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
    </div>
  );
}
