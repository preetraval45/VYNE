"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Tag, X } from "lucide-react";
import {
  FormPageLayout,
  FormSection,
  FormField,
  FormFooterButtons,
} from "@/components/shared/FormPageLayout";
import { useProjectsStore, useTeamMembers } from "@/lib/stores/projects";
import { cn, generateIdentifier } from "@/lib/utils";
import { PROJECT_COLORS } from "@/types";
import type { TaskPriority } from "@/lib/fixtures/projects";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150 placeholder:text-[#C0C0D8]";
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

export default function NewProjectPage() {
  const router = useRouter();
  const addProject = useProjectsStore((s) => s.addProject);
  const teamMembers = useTeamMembers();

  const [form, setForm] = useState({
    name: "",
    identifier: "",
    description: "",
    color: PROJECT_COLORS[0],
    status: "active" as "active" | "paused" | "completed",
    priority: "medium" as TaskPriority,
    leadId: teamMembers[0]?.id ?? "u1",
    memberIds: [] as string[],
    startDate: "",
    endDate: "",
    budgetUSD: "",
    tags: [] as string[],
  });
  const [tagDraft, setTagDraft] = useState("");
  const [identifierEdited, setIdentifierEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const effectiveIdentifier = identifierEdited
    ? form.identifier
    : form.name
      ? generateIdentifier(form.name)
      : "";

  const dirty = !!(
    form.name ||
    form.description ||
    form.tags.length > 0 ||
    form.startDate ||
    form.endDate ||
    identifierEdited
  );

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
    if (!trimmed) return;
    if (form.tags.includes(trimmed)) return;
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

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    addProject({
      id,
      name: form.name.trim(),
      identifier: (
        effectiveIdentifier || generateIdentifier(form.name)
      ).toUpperCase(),
      description: form.description.trim(),
      color: form.color,
      icon: "📋",
      status: form.status,
      memberIds: form.memberIds.length > 0 ? form.memberIds : [form.leadId],
      leadId: form.leadId,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      priority: form.priority,
      tags: form.tags,
      budgetUSD: form.budgetUSD ? Number(form.budgetUSD) : null,
    });
    toast.success(`Project "${form.name}" created!`);
    router.push(`/projects/${id}`);
  }

  return (
    <FormPageLayout
      title="New project"
      subtitle="Set up a new project for your team"
      breadcrumbs={[
        { label: "Projects", href: "/projects" },
        { label: "New project" },
      ]}
      backHref="/projects"
      dirty={dirty}
      footer={
        <FormFooterButtons
          onCancel={() => router.push("/projects")}
          primaryLabel="Create project"
          primaryFormId="new-project-form"
          submitting={submitting}
          primaryDisabled={!form.name.trim()}
        />
      }
    >
      <form id="new-project-form" onSubmit={handleSubmit}>
        <FormSection
          title="Basics"
          description="Name, identifier, and a short description."
        >
          <FormField label="Project name" htmlFor="new-project-name" required>
            <input
              id="new-project-name"
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Product Redesign"
              required
              autoFocus
              className={inputClass}
              style={inputStyle}
            />
          </FormField>

          <div style={{ marginTop: 14 }}>
            <FormField
              label="Identifier"
              htmlFor="new-project-identifier"
              hint={`Tasks will be labeled ${effectiveIdentifier || "PRJ"}-1, ${effectiveIdentifier || "PRJ"}-2…`}
            >
              <input
                id="new-project-identifier"
                type="text"
                value={
                  identifierEdited ? form.identifier : effectiveIdentifier
                }
                onChange={(e) => {
                  setIdentifierEdited(true);
                  update(
                    "identifier",
                    e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "")
                      .slice(0, 6),
                  );
                }}
                placeholder="PRJ"
                maxLength={6}
                className={cn(inputClass, "font-mono w-32 text-center")}
                style={inputStyle}
              />
            </FormField>
          </div>

          <div style={{ marginTop: 14 }}>
            <FormField
              label="Description"
              htmlFor="new-project-description"
              hint="What are you trying to achieve?"
            >
              <textarea
                id="new-project-description"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="What is this project about? Who does it serve? What's the goal?"
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
            <FormField label="Status" htmlFor="new-project-status">
              <select
                id="new-project-status"
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
            <FormField label="Start date" htmlFor="new-project-start">
              <input
                id="new-project-start"
                type="date"
                title="Project start date"
                aria-label="Project start date"
                value={form.startDate}
                onChange={(e) => update("startDate", e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Target end date" htmlFor="new-project-end">
              <input
                id="new-project-end"
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
            <FormField
              label="Budget (USD)"
              htmlFor="new-project-budget"
              hint="Optional — total budget for tracking finance-side"
            >
              <input
                id="new-project-budget"
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
          description="Who's leading the project and who's involved."
        >
          <FormField label="Lead" htmlFor="new-project-lead">
            <select
              id="new-project-lead"
              title="Project lead"
              aria-label="Project lead"
              value={form.leadId}
              onChange={(e) => update("leadId", e.target.value)}
              className={inputClass}
              style={inputStyle}
            >
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.role}
                </option>
              ))}
            </select>
          </FormField>

          <div style={{ marginTop: 14 }}>
            <FormField label="Additional members" hint="Click to add/remove">
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

        <FormSection
          title="Tags"
          description="Optional labels to filter this project later."
        >
          <FormField label="Tags" htmlFor="new-project-tags-input">
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
                id="new-project-tags-input"
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

        <FormSection
          title="Appearance"
          description="Pick a color that'll identify this project across VYNE."
        >
          <fieldset>
            <legend
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-secondary)",
                marginBottom: 10,
                letterSpacing: "-0.005em",
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
