"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import {
  useProjects,
  useProjectsStore,
  useTeamMembers,
} from "@/lib/stores/projects";

export default function NewSubtaskPage() {
  const router = useRouter();
  const params = useSearchParams();
  const defaultTask = params.get("task") ?? "";
  const projects = useProjects();
  const allTasks = useProjectsStore((s) => s.tasks);
  const addSubtask = useProjectsStore((s) => s.addSubtask);
  const teamMembers = useTeamMembers();

  const [form, setForm] = useState({
    taskId: defaultTask || allTasks[0]?.id || "",
    title: "",
    assigneeId: "",
    dueDate: "",
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.taskId || !form.title.trim()) return;
    addSubtask(form.taskId, {
      title: form.title.trim(),
      done: false,
      assigneeId: form.assigneeId || null,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
    });
    toast.success("Subtask created");
    router.push("/projects/subtasks");
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--content-bg-secondary)" }}
    >
      <header
        style={{
          padding: "16px 24px 12px",
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
            marginBottom: 8,
          }}
        >
          <Link
            href="/projects/subtasks"
            style={{
              color: "var(--text-tertiary)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <ArrowLeft size={12} /> Sub Tasks
          </Link>
          <span>/</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
            New subtask
          </span>
        </nav>
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
          }}
        >
          Create a new subtask
        </h1>
      </header>

      <form
        onSubmit={onSubmit}
        className="flex-1 overflow-auto content-scroll"
        style={{
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxWidth: 720,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <Field label="Parent task" required>
          <select
            value={form.taskId}
            onChange={(e) => set("taskId", e.target.value)}
            style={inputStyle}
            required
          >
            {allTasks.length === 0 ? (
              <option value="">No tasks yet</option>
            ) : (
              allTasks.map((t) => {
                const p = projects.find((pr) => pr.id === t.projectId);
                return (
                  <option key={t.id} value={t.id}>
                    {p?.name ? `${p.name} · ` : ""}{t.key} — {t.title}
                  </option>
                );
              })
            )}
          </select>
        </Field>
        <Field label="Title" required>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Draft the API spec"
            autoFocus
            required
            style={inputStyle}
          />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Assignee">
            <select
              value={form.assigneeId}
              onChange={(e) => set("assigneeId", e.target.value)}
              style={inputStyle}
            >
              <option value="">Unassigned</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Due date">
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => set("dueDate", e.target.value)}
              style={inputStyle}
            />
          </Field>
        </div>
        <footer
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            padding: "14px 0 24px",
            borderTop: "1px solid var(--content-border)",
            marginTop: 8,
          }}
        >
          <Link
            href="/projects/subtasks"
            style={{
              padding: "10px 18px",
              borderRadius: 9,
              border: "1px solid var(--content-border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="btn-teal"
            disabled={!form.taskId || !form.title.trim()}
          >
            Create subtask
          </button>
        </footer>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-secondary)",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        {label}
        {required && <span style={{ color: "var(--status-danger)" }}>*</span>}
      </span>
      {children}
    </label>
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
