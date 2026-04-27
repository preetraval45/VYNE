"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Trash2, Tag, X } from "lucide-react";
import {
  FormPageLayout,
  FormSection,
  FormField,
  FormFooterButtons,
} from "@/components/shared/FormPageLayout";
import { useProjectsStore, useTeamMembers } from "@/lib/stores/projects";
import { cn } from "@/lib/utils";
import { PROJECT_COLORS } from "@/types";
import type { TaskPriority } from "@/lib/fixtures/projects";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150";
const inputStyle: React.CSSProperties = {
  background: "var(--content-secondary)",
  border: "1px solid var(--content-border)",
  color: "var(--text-primary)",
};

const STATUS_OPTIONS: Array<{
  value: "active" | "paused" | "completed";
  label: string;
  emoji: string;
}> = [
  { value: "active", label: "Active", emoji: "🟢" },
  { value: "paused", label: "Paused", emoji: "🟡" },
  { value: "completed", label: "Completed", emoji: "✅" },
];

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
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: 14,
            marginBottom: 16,
          }}
        >
          Project not found.
        </p>
        <Link
          href="/projects"
          style={{
            display: "inline-block",
            padding: "8px 14px",
            borderRadius: 8,
            background: "var(--vyne-purple)",
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

  const dirty =
    form.name !== project.name ||
    form.description !== project.description ||
    form.color !== project.color ||
    form.status !== (project.status ?? "active") ||
    form.priority !== (project.priority ?? "medium") ||
    form.leadId !== (project.leadId ?? "") ||
    JSON.stringify(form.memberIds) !==
      JSON.stringify(project.memberIds ?? []) ||
    form.startDate !== isoDateInput(project.startDate) ||
    form.endDate !== isoDateInput(project.endDate) ||
    form.budgetUSD !== (project.budgetUSD?.toString() ?? "") ||
    JSON.stringify(form.tags) !== JSON.stringify(project.tags ?? []);

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
    <FormPageLayout
      title="Edit project"
      subtitle={`Update settings for ${project.name}`}
      breadcrumbs={[
        { label: "Projects", href: "/projects" },
        { label: project.name, href: `/projects/${projectId}` },
        { label: "Edit" },
      ]}
      backHref={`/projects/${projectId}`}
      dirty={dirty}
      headerActions={
        <Link
          href={`/projects/${projectId}/delete`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 12px",
            borderRadius: 8,
            fontSize: 12.5,
            fontWeight: 500,
            color: "var(--status-danger)",
            border: "1px solid rgba(239,68,68,0.25)",
            background: "rgba(239,68,68,0.06)",
          }}
        >
          <Trash2 size={13} />
          Delete project
        </Link>
      }
      footer={
        <FormFooterButtons
          onCancel={() => router.push(`/projects/${projectId}`)}
          primaryLabel="Save changes"
          primaryFormId="edit-project-form"
          submitting={submitting}
          primaryDisabled={!form.name.trim() || !dirty}
        />
      }
    >
      <form id="edit-project-form" onSubmit={handleSubmit}>
        <FormSection title="Basics">
          <FormField label="Project name" htmlFor="edit-project-name" required>
            <input
              id="edit-project-name"
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Project name"
              required
              className={inputClass}
              style={inputStyle}
            />
          </FormField>

          <div style={{ marginTop: 14 }}>
            <FormField
              label="Identifier"
              htmlFor="edit-project-id"
              hint="Identifier is locked after project creation."
            >
              <input
                id="edit-project-id"
                type="text"
                value={project.identifier}
                placeholder="PRJ"
                disabled
                className={cn(inputClass, "font-mono w-32 text-center")}
                style={{
                  ...inputStyle,
                  opacity: 0.7,
                  cursor: "not-allowed",
                }}
              />
            </FormField>
          </div>

          <div style={{ marginTop: 14 }}>
            <FormField label="Description" htmlFor="edit-project-description">
              <textarea
                id="edit-project-description"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="What is this project about?"
                rows={3}
                className={cn(inputClass, "resize-y")}
                style={inputStyle}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection
          title="Status & priority"
          description="Where this project sits and how urgent it is."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
            }}
          >
            <FormField label="Status" htmlFor="edit-project-status">
              <select
                id="edit-project-status"
                title="Project status"
                aria-label="Project status"
                value={form.status}
                onChange={(e) =>
                  update(
                    "status",
                    e.target.value as "active" | "paused" | "completed",
                  )
                }
                className={inputClass}
                style={inputStyle}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.emoji} {s.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Priority">
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {PRIORITY_OPTIONS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => update("priority", p.value)}
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
            </FormField>
          </div>
        </FormSection>

        <FormSection
          title="Timeline"
          description="When does this project start and when should it wrap up?"
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
            }}
          >
            <FormField label="Start date" htmlFor="edit-project-start">
              <input
                id="edit-project-start"
                type="date"
                title="Project start date"
                aria-label="Project start date"
                value={form.startDate}
                onChange={(e) => update("startDate", e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Target end date" htmlFor="edit-project-end">
              <input
                id="edit-project-end"
                type="date"
                title="Project target end date"
                aria-label="Project target end date"
                value={form.endDate}
                onChange={(e) => update("endDate", e.target.value)}
                min={form.startDate || undefined}
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
          </div>
          <div style={{ marginTop: 14 }}>
            <FormField label="Budget (USD)" htmlFor="edit-project-budget">
              <input
                id="edit-project-budget"
                type="number"
                value={form.budgetUSD}
                onChange={(e) => update("budgetUSD", e.target.value)}
                placeholder="0"
                min="0"
                step="100"
                className={cn(inputClass, "w-44")}
                style={inputStyle}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection
          title="Team"
          description="Anyone on the team can be assigned. Lead is the primary owner; members are also visible on the project."
        >
          <FormField label="Assigned to (lead)" htmlFor="edit-project-lead">
            <select
              id="edit-project-lead"
              title="Project lead — who's responsible"
              aria-label="Project lead"
              value={form.leadId}
              onChange={(e) => update("leadId", e.target.value)}
              className={inputClass}
              style={inputStyle}
            >
              <option value="">— Unassigned —</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.role}
                </option>
              ))}
            </select>
          </FormField>

          <div style={{ marginTop: 14 }}>
            <FormField
              label="Additional members"
              hint="Click to add or remove from the project"
            >
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {teamMembers
                  .filter((m) => m.id !== form.leadId)
                  .map((m) => {
                    const selected = form.memberIds.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMember(m.id)}
                        style={{
                          padding: "5px 10px 5px 5px",
                          borderRadius: 99,
                          border: selected
                            ? "1px solid var(--vyne-purple)"
                            : "1px solid var(--content-border)",
                          background: selected
                            ? "rgba(108, 71, 255, 0.1)"
                            : "transparent",
                          color: selected
                            ? "var(--vyne-purple)"
                            : "var(--text-secondary)",
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: m.color,
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 9,
                            fontWeight: 700,
                          }}
                        >
                          {m.initials}
                        </span>
                        {m.name}
                      </button>
                    );
                  })}
              </div>
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Tags">
          <FormField label="Tags" htmlFor="edit-project-tags-input">
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                padding: 6,
                borderRadius: 8,
                border: "1px solid var(--content-border)",
                background: "var(--content-secondary)",
                minHeight: 42,
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
                id="edit-project-tags-input"
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
                placeholder={
                  form.tags.length === 0 ? "design, q3, customer-ask…" : ""
                }
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
          </FormField>
        </FormSection>

        <FormSection title="Appearance">
          <fieldset>
            <legend
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-secondary)",
                marginBottom: 10,
              }}
            >
              Color
            </legend>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {PROJECT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Select ${color} color`}
                  aria-pressed={form.color === color}
                  onClick={() => update("color", color)}
                  style={{
                    width: 30,
                    height: 30,
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
          </fieldset>
        </FormSection>
      </form>
    </FormPageLayout>
  );
}
