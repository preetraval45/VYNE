"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  FormPageLayout,
  FormSection,
  FormField,
  FormFooterButtons,
} from "@/components/shared/FormPageLayout";
import { useProjectsStore } from "@/lib/stores/projects";
import { cn, generateIdentifier } from "@/lib/utils";
import { PROJECT_COLORS } from "@/types";

const inputClass = "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150 placeholder:text-[#C0C0D8]";
const inputStyle: React.CSSProperties = {
  background: "var(--content-secondary)",
  border: "1px solid var(--content-border)",
  color: "var(--text-primary)",
};

export default function NewProjectPage() {
  const router = useRouter();
  const addProject = useProjectsStore((s) => s.addProject);

  const [form, setForm] = useState({
    name: "",
    identifier: "",
    description: "",
    color: PROJECT_COLORS[0],
  });
  const [identifierEdited, setIdentifierEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const effectiveIdentifier = identifierEdited
    ? form.identifier
    : form.name
      ? generateIdentifier(form.name)
      : "";

  const dirty = !!(form.name || form.description || identifierEdited);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    addProject({
      id,
      name: form.name.trim(),
      identifier: (effectiveIdentifier || generateIdentifier(form.name)).toUpperCase(),
      description: form.description.trim(),
      color: form.color,
      icon: "📋",
      status: "active",
      memberIds: ["u1"],
      leadId: "u1",
    });
    toast.success(`Project "${form.name}" created!`);
    router.push(`/projects/${id}`);
  }

  return (
    <FormPageLayout
      title="New project"
      subtitle="Set up a new project for your team"
      breadcrumbs={[{ label: "Projects", href: "/projects" }, { label: "New project" }]}
      backHref="/projects"
      dirty={dirty}
      footer={
        <FormFooterButtons
          onCancel={() => router.push("/projects")}
          primaryLabel="Create project"
          primaryForm="new-project-form"
          primaryDisabled={!form.name.trim()}
          primaryLoading={submitting}
        />
      }
      aside={
        <div
          style={{
            background: "var(--content-bg)",
            border: "1px solid var(--content-border)",
            borderRadius: 14,
            padding: 20,
          }}
        >
          <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 10, letterSpacing: "-0.01em" }}>
            Preview
          </h3>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: 14,
              borderRadius: 12,
              border: "1px solid var(--content-border)",
              background: "var(--content-secondary)",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: form.color,
                flexShrink: 0,
                boxShadow: `0 4px 12px ${form.color}40`,
              }}
            />

            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {form.name || "Project name"}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                {effectiveIdentifier || "PRJ"}-1
              </div>
            </div>
          </div>
          <p style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 14, lineHeight: 1.5, letterSpacing: "-0.005em" }}>
            Tasks in this project will be labeled {effectiveIdentifier || "PRJ"}-1, {effectiveIdentifier || "PRJ"}-2, etc. The identifier is locked after creation.
          </p>
        </div>
      }
    >
      <form id="new-project-form" onSubmit={handleSubmit}>
        <FormSection title="Basics" description="Name and what this project is about.">
          <div>
            <FormField label="Project name" htmlFor="new-project-name" required>
                <input
                  id="new-project-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
                    value={identifierEdited ? form.identifier : effectiveIdentifier}
                    onChange={(e) => {
                      setIdentifierEdited(true);
                      setForm((f) => ({
                        ...f,
                        identifier: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6),
                      }));
                    }}
                    placeholder="PRJ"
                    maxLength={6}
                    className={cn(inputClass, "font-mono w-32 text-center")}
                    style={inputStyle}
                  />
                </FormField>
              </div>
          </div>
        </FormSection>

        <FormSection title="Description" description="Optional — what are you trying to achieve?">
          <FormField label="Description" htmlFor="new-project-description">
            <textarea
              id="new-project-description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What is this project about? Who does it serve? What's the goal?"
              rows={4}
              className={cn(inputClass, "resize-none")}
              style={inputStyle}
            />
          </FormField>
        </FormSection>

        <FormSection title="Appearance" description="Pick a color that'll identify this project across VYNE.">
          <fieldset>
            <legend style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 10, letterSpacing: "-0.005em" }}>
              Color
            </legend>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {PROJECT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Select ${color} color`}
                  aria-pressed={form.color === color}
                  onClick={() => setForm((f) => ({ ...f, color }))}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: color,
                    border: "none",
                    cursor: "pointer",
                    transform: form.color === color ? "scale(1.15)" : "scale(1)",
                    boxShadow: form.color === color
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
