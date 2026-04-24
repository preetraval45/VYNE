"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { useProjects, useProjectsStore, useTeamMembers } from "@/lib/stores/projects";
import { useCustomFieldsStore } from "@/lib/stores/customFields";
import {
  TASK_PRIORITY_META,
  TASK_STATUS_META,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/fixtures/projects";
import type { CustomField } from "@/lib/stores/customFields";

// Stable empty reference so the Zustand selector returns referentially
// equal values across renders and never causes a re-render loop.
const EMPTY_FIELDS: CustomField[] = [];

export default function NewTaskPage() {
  const router = useRouter();
  const params = useSearchParams();
  const defaultProject = params.get("project") ?? "";
  const projects = useProjects();
  const teamMembers = useTeamMembers();
  const addTask = useProjectsStore((s) => s.addTask);

  // Read custom fields admin has defined via the wrench tool. Selected
  // from the stored schemas map directly (getSchema returns defaults via
  // a call path that can confuse referential equality). Equivalent to
  // getSchema("tasks").fields for display.
  const customFields = useCustomFieldsStore(
    (s) => s.schemas["tasks"]?.fields ?? EMPTY_FIELDS,
  );

  const [form, setForm] = useState({
    projectId: defaultProject || projects[0]?.id || "",
    title: "",
    description: "",
    status: "todo" as TaskStatus,
    priority: "medium" as TaskPriority,
    assigneeId: "",
    dueDate: "",
    estimatedHours: "",
    tags: "",
    custom: {} as Record<string, string>,
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function setCustom(id: string, v: string) {
    setForm((f) => ({ ...f, custom: { ...f.custom, [id]: v } }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.projectId || !form.title.trim()) return;
    addTask(form.projectId, {
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      assigneeId: form.assigneeId || null,
      startDate: null,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : null,
      timeSpent: null,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      subtasks: [],
      comments: [],
    });
    // Persist custom-field values keyed by field id in a parallel store so they
    // survive refresh — rendered by the task detail page when present.
    if (Object.keys(form.custom).length > 0) {
      try {
        const key = "vyne-task-custom";
        const all = JSON.parse(localStorage.getItem(key) ?? "{}") as Record<string, Record<string, string>>;
        // Keyed by a synthetic tempId — replaced on first save round-trip
        all[`pending:${Date.now()}`] = form.custom;
        localStorage.setItem(key, JSON.stringify(all));
      } catch { /* ignore */ }
    }
    toast.success("Task created");
    router.push(`/projects/${form.projectId}`);
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
            href="/projects/tasks"
            style={{
              color: "var(--text-tertiary)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <ArrowLeft size={12} /> Tasks
          </Link>
          <span>/</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
            New task
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
          Create a new task
        </h1>
      </header>

      <form
        onSubmit={onSubmit}
        className="flex-1 overflow-auto content-scroll"
        style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 16, maxWidth: 720, margin: "0 auto", width: "100%" }}
      >
        <Field label="Project" required>
          <select
            value={form.projectId}
            onChange={(e) => set("projectId", e.target.value)}
            style={inputStyle}
            required
          >
            {projects.length === 0 ? (
              <option value="">No projects yet</option>
            ) : (
              projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon ?? "📋"} {p.name}
                </option>
              ))
            )}
          </select>
        </Field>

        <Field label="Title" required>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Short, action-oriented title"
            autoFocus
            required
            style={inputStyle}
          />
        </Field>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={5}
            placeholder="What needs to happen? Link docs, tickets, or screenshots."
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as TaskStatus)}
              style={inputStyle}
            >
              {(Object.keys(TASK_STATUS_META) as TaskStatus[]).map((s) => (
                <option key={s} value={s}>
                  {TASK_STATUS_META[s].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select
              value={form.priority}
              onChange={(e) => set("priority", e.target.value as TaskPriority)}
              style={inputStyle}
            >
              {(Object.keys(TASK_PRIORITY_META) as TaskPriority[]).map((p) => (
                <option key={p} value={p}>
                  {TASK_PRIORITY_META[p].label}
                </option>
              ))}
            </select>
          </Field>
        </div>

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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Estimate (hours)">
            <input
              type="number"
              min={0}
              step={0.25}
              value={form.estimatedHours}
              onChange={(e) => set("estimatedHours", e.target.value)}
              placeholder="—"
              style={inputStyle}
            />
          </Field>
          <Field label="Tags">
            <input
              type="text"
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="bug, frontend, urgent"
              style={inputStyle}
            />
          </Field>
        </div>

        {customFields.length > 0 && (
          <section
            style={{
              background: "var(--content-bg)",
              border: "1px solid var(--content-border)",
              borderRadius: 12,
              padding: "14px 16px",
              marginTop: 4,
            }}
          >
            <h2
              style={{
                margin: "0 0 10px",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              Custom fields
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {customFields.map((f) => (
                <Field key={f.id} label={f.label}>
                  {f.type === "checkbox" ? (
                    <input
                      type="checkbox"
                      checked={form.custom[f.id] === "true"}
                      onChange={(e) =>
                        setCustom(f.id, e.target.checked ? "true" : "false")
                      }
                    />
                  ) : f.type === "select" ? (
                    <select
                      value={form.custom[f.id] ?? ""}
                      onChange={(e) => setCustom(f.id, e.target.value)}
                      style={inputStyle}
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
                      value={form.custom[f.id] ?? ""}
                      onChange={(e) => setCustom(f.id, e.target.value)}
                      style={inputStyle}
                    />
                  )}
                </Field>
              ))}
            </div>
          </section>
        )}

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
            href="/projects/tasks"
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
            disabled={!form.projectId || !form.title.trim()}
          >
            Create task
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
