"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";
import {
  FormPageLayout,
  FormSection,
  FormField,
  FormFooterButtons,
} from "@/components/shared/FormPageLayout";
import { useProjectsStore } from "@/lib/stores/projects";
import { cn } from "@/lib/utils";
import { PROJECT_COLORS } from "@/types";

const inputClass = "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150";
const inputStyle: React.CSSProperties = {
  background: "var(--content-secondary)",
  border: "1px solid var(--content-border)",
  color: "var(--text-primary)",
};

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId as string;

  const project = useProjectsStore((s) => s.projects.find((p) => p.id === projectId));
  const updateProject = useProjectsStore((s) => s.updateProject);

  const [form, setForm] = useState({
    name: project?.name ?? "",
    description: project?.description ?? "",
    color: project?.color ?? PROJECT_COLORS[0],
  });
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

  const dirty =
    form.name !== project.name ||
    form.description !== project.description ||
    form.color !== project.color;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    updateProject(projectId, {
      name: form.name.trim(),
      description: form.description.trim(),
      color: form.color,
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
          primaryForm="edit-project-form"
          primaryDisabled={!form.name.trim() || !dirty}
          primaryLoading={submitting}
        />
      }
    >
      <form id="edit-project-form" onSubmit={handleSubmit}>
        <FormSection title="Basics">
          <div>
            <div>
              <FormField label="Project name" htmlFor="edit-project-name" required>
                <input
                  id="edit-project-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Project name"
                  required
                  className={inputClass}
                  style={inputStyle}
                />
              </FormField>

              <div style={{ marginTop: 14 }}>
                <FormField label="Identifier" htmlFor="edit-project-id" hint="Identifier is locked after project creation.">
                  <input
                    id="edit-project-id"
                    type="text"
                    value={project.identifier}
                    placeholder="PRJ"
                    disabled
                    className={cn(inputClass, "font-mono w-32 text-center")}
                    style={{ ...inputStyle, opacity: 0.7, cursor: "not-allowed" }}
                  />
                </FormField>
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection title="Description">
          <FormField label="Description" htmlFor="edit-project-description">
            <textarea
              id="edit-project-description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What is this project about?"
              rows={4}
              className={cn(inputClass, "resize-none")}
              style={inputStyle}
            />
          </FormField>
        </FormSection>

        <FormSection title="Appearance">
          <fieldset>
            <legend style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 10 }}>
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
                    width: 30, height: 30, borderRadius: "50%",
                    background: color, border: "none", cursor: "pointer",
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
