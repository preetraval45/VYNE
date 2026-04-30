"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Trash2, Tag, X } from "lucide-react";
import { useProjectsStore, useTeamMembers } from "@/lib/stores/projects";
import { PROJECT_COLORS } from "@/types";
import type { TaskPriority } from "@/lib/fixtures/projects";

const STATUS_OPTIONS: Array<{
  value: "active" | "paused" | "completed";
  label: string;
  emoji: string;
}> = [
  { value: "active", label: "Active", emoji: "🟢" },
  { value: "paused", label: "Paused", emoji: "🟡" },
  { value: "completed", label: "Done", emoji: "✅" },
];

const PRIORITY_OPTIONS: Array<{
  value: TaskPriority;
  label: string;
  color: string;
}> = [
  { value: "urgent", label: "Urgent", color: "#EF4444" },
  { value: "high", label: "High", color: "#F59E0B" },
  { value: "medium", label: "Medium", color: "var(--vyne-accent, #06B6D4)" },
  { value: "low", label: "Low", color: "#6B7280" },
];

function isoDateInput(s: string | null | undefined): string {
  if (!s) return "";
  try {
    return new Date(s).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId as string;
  const teamMembers = useTeamMembers();

  const project = useProjectsStore((s) =>
    s.projects.find((p) => p.id === projectId),
  );
  const updateProject = useProjectsStore((s) => s.updateProject);

  const [form, setForm] = useState({
    name: project?.name ?? "",
    description: project?.description ?? "",
    color: project?.color ?? PROJECT_COLORS[0],
    status: (project?.status ?? "active") as
      | "active"
      | "paused"
      | "completed",
    priority: (project?.priority ?? "medium") as TaskPriority,
    leadId: project?.leadId ?? "",
    memberIds: project?.memberIds ?? [],
    startDate: isoDateInput(project?.startDate),
    endDate: isoDateInput(project?.endDate),
    budgetUSD: project?.budgetUSD?.toString() ?? "",
    tags: project?.tags ?? [],
  });
  const [tagDraft, setTagDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!project) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 16 }}>
          Project not found.
        </p>
        <Link
          href="/projects"
          style={{
            display: "inline-block",
            padding: "8px 14px",
            borderRadius: 8,
            background: "var(--vyne-accent, var(--vyne-purple))",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Back to projects
        </Link>
      </div>
    );
  }

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function toggleMember(id: string) {
    setForm((f) => ({
      ...f,
      memberIds: f.memberIds.includes(id)
        ? f.memberIds.filter((m) => m !== id)
        : [...f.memberIds, id],
    }));
  }
  function addTag(t: string) {
    const trimmed = t.trim().replace(/,$/, "");
    if (!trimmed || form.tags.includes(trimmed)) return;
    update("tags", [...form.tags, trimmed]);
    setTagDraft("");
  }
  function removeTag(t: string) {
    update("tags", form.tags.filter((x) => x !== t));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    updateProject(projectId, {
      name: form.name.trim(),
      description: form.description.trim(),
      color: form.color,
      status: form.status,
      priority: form.priority,
      leadId: form.leadId || project!.leadId,
      memberIds: form.memberIds,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      budgetUSD: form.budgetUSD ? Number(form.budgetUSD) : null,
      tags: form.tags,
    });
    toast.success(`Project "${form.name}" updated`);
    router.push(`/projects/${projectId}`);
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--content-bg-secondary)", overflow: "hidden" }}
    >
      <header
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          flexShrink: 0,
        }}
      >
        <Link
          href={`/projects/${projectId}`}
          style={{
            color: "var(--text-tertiary)",
            textDecoration: "none",
            fontSize: 11,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            marginBottom: 4,
          }}
        >
          <ArrowLeft size={11} /> {project.name}
        </Link>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: "var(--text-primary)",
            }}
          >
            Edit project
          </h1>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href={`/projects/${projectId}/delete`} style={dangerBtn}>
              <Trash2 size={12} />
              Delete
            </Link>
            <button
              type="button"
              onClick={() => router.push(`/projects/${projectId}`)}
              style={cancelBtn}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-project-form"
              disabled={!form.name.trim() || submitting}
              style={{
                ...primaryBtn,
                opacity: form.name.trim() && !submitting ? 1 : 0.55,
                cursor:
                  form.name.trim() && !submitting ? "pointer" : "not-allowed",
              }}
            >
              {submitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </header>

      <form
        id="edit-project-form"
        onSubmit={handleSubmit}
        className="flex-1 overflow-auto content-scroll"
        style={{
          padding: "16px 20px",
          maxWidth: 1100,
          width: "100%",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.3fr 1fr",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card title="Project basics">
              <Field label="Project name" required>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Project name"
                  required
                  style={inputStyle}
                />
              </Field>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 140px",
                  gap: 10,
                }}
              >
                <Field label="Description">
                  <textarea
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="What is this project about?"
                    rows={2}
                    style={{
                      ...inputStyle,
                      resize: "vertical",
                      fontFamily: "inherit",
                    }}
                  />
                </Field>
                <Field label="Identifier" hint="Locked after creation">
                  <input
                    type="text"
                    title="Project identifier (locked)"
                    aria-label="Project identifier"
                    value={project.identifier}
                    disabled
                    style={{
                      ...inputStyle,
                      fontFamily:
                        "var(--font-geist-mono), ui-monospace, monospace",
                      textAlign: "center",
                      opacity: 0.7,
                      cursor: "not-allowed",
                    }}
                  />
                </Field>
              </div>
            </Card>

            <Card title="Status & priority">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <Field label="Status">
                  <div style={{ display: "flex", gap: 4 }}>
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => update("status", s.value)}
                        style={chipStyle(form.status === s.value)}
                      >
                        <span>{s.emoji}</span> {s.label}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Priority">
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {PRIORITY_OPTIONS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => update("priority", p.value)}
                        style={priorityChip(form.priority === p.value, p.color)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            </Card>

            <Card title="Timeline & budget">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 10,
                }}
              >
                <Field label="Start date">
                  <input
                    type="date"
                    title="Start date"
                    aria-label="Start date"
                    value={form.startDate}
                    onChange={(e) => update("startDate", e.target.value)}
                    style={inputStyle}
                  />
                </Field>
                <Field label="End date">
                  <input
                    type="date"
                    title="Target end date"
                    aria-label="Target end date"
                    value={form.endDate}
                    onChange={(e) => update("endDate", e.target.value)}
                    min={form.startDate || undefined}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Budget (USD)">
                  <input
                    type="number"
                    value={form.budgetUSD}
                    onChange={(e) => update("budgetUSD", e.target.value)}
                    placeholder="0"
                    min="0"
                    step="100"
                    style={inputStyle}
                  />
                </Field>
              </div>
            </Card>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card title="Assigned to">
              <Field label="Lead" hint="Anyone on the team">
                <select
                  title="Project lead"
                  aria-label="Project lead"
                  value={form.leadId}
                  onChange={(e) => update("leadId", e.target.value)}
                  style={inputStyle}
                >
                  <option value="">— Unassigned —</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {m.role}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Additional members" hint="Click to add or remove">
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    flexWrap: "wrap",
                    maxHeight: 88,
                    overflowY: "auto",
                  }}
                >
                  {teamMembers
                    .filter((m) => m.id !== form.leadId)
                    .map((m) => {
                      const selected = form.memberIds.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleMember(m.id)}
                          style={memberChip(selected, m.color)}
                        >
                          <span style={memberAvatar(m.color)}>
                            {m.initials}
                          </span>
                          {m.name}
                        </button>
                      );
                    })}
                </div>
              </Field>
            </Card>

            <Card title="Tags">
              <div style={tagsContainerStyle}>
                {form.tags.map((t) => (
                  <span key={t} style={tagPill}>
                    <Tag size={10} />
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      aria-label={`Remove tag ${t}`}
                      style={tagRemoveBtn}
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
                  placeholder={form.tags.length === 0 ? "design, q3, customer-ask…" : ""}
                  aria-label="Add tag"
                  style={tagInput}
                />
              </div>
            </Card>

            <Card title="Color">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {PROJECT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Select ${color}`}
                    aria-pressed={form.color === color}
                    onClick={() => update("color", color)}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: color,
                      border: "none",
                      cursor: "pointer",
                      transform:
                        form.color === color ? "scale(1.15)" : "scale(1)",
                      boxShadow:
                        form.color === color
                          ? `0 0 0 2px var(--content-bg), 0 0 0 4px ${color}`
                          : "none",
                      transition: "transform 0.15s, box-shadow 0.15s",
                    }}
                  />
                ))}
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}

// ── Reusable styles (matches /projects/new) ─────────────────

function Card({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <section
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        borderRadius: 10,
        padding: "12px 14px",
      }}
    >
      <h2
        style={{
          margin: "0 0 10px",
          fontSize: 11,
          fontWeight: 700,
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  readonly label: string;
  readonly required?: boolean;
  readonly hint?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-secondary)",
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
        }}
      >
        {label}
        {required && <span style={{ color: "var(--status-danger)" }}>*</span>}
      </span>
      {children}
      {hint && (
        <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
          {hint}
        </span>
      )}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  borderRadius: 7,
  border: "1px solid var(--content-border)",
  background: "var(--content-secondary)",
  color: "var(--text-primary)",
  fontSize: 13,
  outline: "none",
};

function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: "5px 9px",
    borderRadius: 99,
    border: active ? "1px solid var(--vyne-accent, var(--vyne-purple))" : "1px solid var(--content-border)",
    background: active ? "rgba(108, 71, 255, 0.12)" : "transparent",
    color: active ? "var(--vyne-accent, var(--vyne-purple))" : "var(--text-secondary)",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    whiteSpace: "nowrap",
  };
}

function priorityChip(active: boolean, color: string): React.CSSProperties {
  return {
    padding: "5px 9px",
    borderRadius: 99,
    border: active ? `1px solid ${color}` : "1px solid var(--content-border)",
    background: active ? `${color}22` : "transparent",
    color: active ? color : "var(--text-secondary)",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

function memberChip(active: boolean, _color: string): React.CSSProperties {
  return {
    padding: "3px 8px 3px 3px",
    borderRadius: 99,
    border: active ? "1px solid var(--vyne-accent, var(--vyne-purple))" : "1px solid var(--content-border)",
    background: active ? "rgba(108, 71, 255, 0.1)" : "transparent",
    color: active ? "var(--vyne-accent, var(--vyne-purple))" : "var(--text-secondary)",
    fontSize: 11,
    fontWeight: 500,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    whiteSpace: "nowrap",
  };
}

function memberAvatar(color: string): React.CSSProperties {
  return {
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: color,
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 8,
    fontWeight: 700,
    flexShrink: 0,
  };
}

const tagsContainerStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 4,
  padding: 5,
  borderRadius: 7,
  border: "1px solid var(--content-border)",
  background: "var(--content-secondary)",
  minHeight: 36,
};

const tagPill: React.CSSProperties = {
  padding: "2px 6px 2px 8px",
  borderRadius: 99,
  background: "rgba(108, 71, 255, 0.12)",
  color: "var(--vyne-accent, var(--vyne-purple))",
  fontSize: 10.5,
  fontWeight: 500,
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
};

const tagRemoveBtn: React.CSSProperties = {
  width: 13,
  height: 13,
  borderRadius: "50%",
  border: "none",
  background: "rgba(108, 71, 255, 0.25)",
  color: "#fff",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const tagInput: React.CSSProperties = {
  flex: 1,
  minWidth: 80,
  border: "none",
  background: "transparent",
  color: "var(--text-primary)",
  fontSize: 12,
  outline: "none",
  padding: "2px 4px",
};

const cancelBtn: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: 7,
  border: "1px solid var(--content-border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
};

const primaryBtn: React.CSSProperties = {
  padding: "7px 16px",
  borderRadius: 7,
  border: "none",
  background: "var(--vyne-accent, var(--vyne-purple))",
  color: "#fff",
  fontSize: 12,
  fontWeight: 600,
};

const dangerBtn: React.CSSProperties = {
  padding: "7px 12px",
  borderRadius: 7,
  border: "1px solid rgba(239,68,68,0.3)",
  background: "rgba(239,68,68,0.08)",
  color: "var(--status-danger)",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
};
