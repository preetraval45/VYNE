"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Tag, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  useProjects,
  useProjectsStore,
  useTeamMembers,
} from "@/lib/stores/projects";
import type { TaskPriority } from "@/lib/fixtures/projects";

const PRIORITY_OPTIONS: Array<{
  value: TaskPriority;
  label: string;
  color: string;
}> = [
  { value: "urgent", label: "Urgent", color: "#EF4444" },
  { value: "high", label: "High", color: "#F59E0B" },
  { value: "medium", label: "Medium", color: "#06B6D4" },
  { value: "low", label: "Low", color: "#6B7280" },
];

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
    description: "",
    priority: "medium" as TaskPriority,
    assigneeId: "",
    startDate: "",
    dueDate: "",
    estimatedHours: "",
    tags: [] as string[],
  });
  const [tagDraft, setTagDraft] = useState("");

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function addTag(t: string) {
    const trimmed = t.trim().replace(/,$/, "");
    if (!trimmed || form.tags.includes(trimmed)) return;
    set("tags", [...form.tags, trimmed]);
    setTagDraft("");
  }

  function removeTag(t: string) {
    set("tags", form.tags.filter((x) => x !== t));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.taskId || !form.title.trim()) return;
    addSubtask(form.taskId, {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      priority: form.priority,
      done: false,
      assigneeId: form.assigneeId || null,
      startDate: form.startDate
        ? new Date(form.startDate).toISOString()
        : null,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      estimatedHours: form.estimatedHours
        ? Number(form.estimatedHours)
        : null,
      tags: form.tags.length > 0 ? form.tags : undefined,
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
            title="Parent task"
            aria-label="Parent task"
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

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Optional — what needs to happen?"
            rows={3}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
          />
        </Field>

        <Field label="Priority">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {PRIORITY_OPTIONS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => set("priority", p.value)}
                style={{
                  padding: "7px 12px",
                  borderRadius: 99,
                  border:
                    form.priority === p.value
                      ? `1px solid ${p.color}`
                      : "1px solid var(--content-border)",
                  background:
                    form.priority === p.value
                      ? `${p.color}22`
                      : "transparent",
                  color:
                    form.priority === p.value
                      ? p.color
                      : "var(--text-secondary)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Assignee">
            <select
              value={form.assigneeId}
              onChange={(e) => set("assigneeId", e.target.value)}
              title="Assignee"
              aria-label="Assignee"
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
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Start date">
            <input
              type="date"
              title="Start date"
              aria-label="Start date"
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="Due date">
            <input
              type="date"
              title="Due date"
              aria-label="Due date"
              value={form.dueDate}
              onChange={(e) => set("dueDate", e.target.value)}
              min={form.startDate || undefined}
              style={inputStyle}
            />
          </Field>
        </div>

        <Field label="Tags">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              padding: 6,
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              background: "var(--content-bg)",
              minHeight: 40,
            }}
          >
            {form.tags.map((t) => (
              <span
                key={t}
                style={{
                  padding: "3px 8px 3px 10px",
                  borderRadius: 99,
                  background: "rgba(108, 71, 255, 0.12)",
                  color: "var(--vyne-purple)",
                  fontSize: 11,
                  fontWeight: 500,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Tag size={10} />
                {t}
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  aria-label={`Remove tag ${t}`}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    border: "none",
                    background: "rgba(108, 71, 255, 0.25)",
                    color: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={9} />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag(tagDraft);
                } else if (
                  e.key === "Backspace" &&
                  tagDraft === "" &&
                  form.tags.length > 0
                ) {
                  removeTag(form.tags[form.tags.length - 1]);
                }
              }}
              onBlur={() => addTag(tagDraft)}
              placeholder={form.tags.length === 0 ? "Type and press Enter" : ""}
              aria-label="Add tag"
              style={{
                flex: 1,
                minWidth: 100,
                border: "none",
                background: "transparent",
                color: "var(--text-primary)",
                fontSize: 13,
                outline: "none",
                padding: "4px 6px",
              }}
            />
          </div>
        </Field>
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
