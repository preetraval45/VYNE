"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { AlertTriangle } from "lucide-react";
import {
  FormPageLayout,
  FormSection,
  FormField,
  FormFooterButtons,
} from "@/components/shared/FormPageLayout";
import { useProjectsStore } from "@/lib/stores/projects";

const inputClass = "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150 placeholder:text-[#C0C0D8]";
const inputStyle: React.CSSProperties = {
  background: "var(--content-secondary)",
  border: "1px solid var(--content-border)",
  color: "var(--text-primary)",
};

export default function DeleteProjectPage() {
  const router = useRouter();
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId as string;

  const project = useProjectsStore((s) => s.projects.find((p) => p.id === projectId));
  const deleteProject = useProjectsStore((s) => s.deleteProject);
  const tasks = useProjectsStore((s) =>
    s.tasks.filter((t) => t.projectId === projectId),
  );

  const [confirm, setConfirm] = useState("");
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

  const canDelete = confirm === project.name;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canDelete || !project) return;
    setSubmitting(true);
    deleteProject(projectId);
    toast.success(`Project "${project.name}" deleted`);
    router.push("/projects");
  }

  return (
    <FormPageLayout
      title="Delete project"
      subtitle={`Permanently delete "${project.name}" and all its data`}
      breadcrumbs={[
        { label: "Projects", href: "/projects" },
        { label: project.name, href: `/projects/${projectId}` },
        { label: "Delete" },
      ]}
      backHref={`/projects/${projectId}`}
      footer={
        <FormFooterButtons
          onCancel={() => router.push(`/projects/${projectId}`)}
          primaryLabel="Delete project"
          primaryForm="delete-project-form"
          primaryDisabled={!canDelete}
          primaryLoading={submitting}
          danger
        />
      }
    >
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "flex-start",
          padding: 20,
          borderRadius: 14,
          background: "rgba(239,68,68,0.06)",
          border: "1px solid rgba(239,68,68,0.2)",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 40, height: 40, flexShrink: 0, borderRadius: 10,
            background: "rgba(239,68,68,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--status-danger)",
          }}
        >
          <AlertTriangle size={20} />
        </div>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4, letterSpacing: "-0.01em" }}>
            This action cannot be undone
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55, letterSpacing: "-0.005em" }}>
            Deleting <strong>{project.name}</strong> will permanently remove{" "}
            <strong>{tasks.length} task{tasks.length === 1 ? "" : "s"}</strong>, all project data,
            comments, attachments, and history. This cannot be recovered.
          </p>
        </div>
      </div>

      <form id="delete-project-form" onSubmit={handleSubmit}>
        <FormSection
          title="Confirm deletion"
          description={`Type "${project.name}" exactly to confirm you want to delete this project.`}
        >
          <FormField label={`Project name`} htmlFor="confirm-delete" required>
            <input
              id="confirm-delete"
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={project.name}
              autoFocus
              autoComplete="off"
              className={inputClass}
              style={inputStyle}
            />
          </FormField>
        </FormSection>
      </form>
    </FormPageLayout>
  );
}
