"use client";

import { useEffect, useState } from "react";
import { X, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useProjectsStore } from "@/lib/stores/projects";
import { notifySuccess, notifyError } from "@/lib/toast";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Quick-create issue modal — used by the "+ New Issue" button in the
 * UnifiedTopBar. Lets the user pick a project + title without leaving
 * the current page (previously: routed to /projects). Falls back to
 * routing if the projects store is empty.
 */
export function QuickCreateIssueModal({ open, onClose }: Props) {
  const router = useRouter();
  const projects = useProjectsStore((s) => s.projects);
  const addTask = useProjectsStore((s) => s.addTask);
  const [projectId, setProjectId] = useState<string>("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle("");
    if (!projectId && projects.length > 0) setProjectId(projects[0].id);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, projects, projectId]);

  if (!open) return null;

  function submit() {
    if (!title.trim()) return;
    if (!projectId) {
      // No projects yet — push to project create page.
      router.push("/projects/new");
      onClose();
      return;
    }
    try {
      addTask(projectId, {
        title: title.trim(),
        status: "todo",
        priority: "medium",
      } as Parameters<typeof addTask>[1]);
      // addTask returns void; navigate to the project so the new task
      // is visible. The user can drill in via the board view.
      notifySuccess(`Issue created in ${
        projects.find((p) => p.id === projectId)?.name ?? "project"
      }`);
      router.push(`/projects/${projectId}`);
      onClose();
    } catch (e) {
      notifyError(e, "Couldn't create task");
    }
  }

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 95,
          animation: "fadeIn 0.18s ease-out both",
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick-create issue"
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(440px, 92vw)",
          background: "var(--content-bg)",
          border: "1px solid var(--content-border)",
          borderRadius: 14,
          boxShadow: "var(--elev-4)",
          zIndex: 96,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <header style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "var(--vyne-accent, var(--vyne-purple))",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Plus size={15} />
          </div>
          <h2
            style={{
              flex: 1,
              margin: 0,
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            New issue
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              border: "1px solid var(--content-border)",
              background: "var(--content-secondary)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={13} />
          </button>
        </header>

        <label
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--text-tertiary)",
          }}
        >
          Project
        </label>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          aria-label="Project"
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid var(--content-border)",
            background: "var(--content-secondary)",
            color: "var(--text-primary)",
            fontSize: 13,
            outline: "none",
          }}
        >
          {projects.length === 0 && (
            <option value="">No projects — create one first</option>
          )}
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <label
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--text-tertiary)",
          }}
        >
          Title
        </label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="What needs to be done?"
          aria-label="Issue title"
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid var(--content-border)",
            background: "var(--content-secondary)",
            color: "var(--text-primary)",
            fontSize: 14,
            outline: "none",
          }}
        />

        <footer
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 4,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              background: "transparent",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!title.trim()}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              background:
                "linear-gradient(135deg, var(--vyne-accent-light, #7c4dff) 0%, var(--vyne-accent, var(--vyne-purple)) 100%)",
              color: "#fff",
              cursor: title.trim() ? "pointer" : "not-allowed",
              opacity: title.trim() ? 1 : 0.55,
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            Create
          </button>
        </footer>
      </div>
    </>
  );
}
