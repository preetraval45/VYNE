"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Plus,
  LayoutGrid,
  Search,
  X,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import {
  useProjects,
  useProjectsStore,
  useTeamMembers,
} from "@/lib/stores/projects";
import type { ProjectDetail } from "@/lib/stores/projects";
import { useDebounce } from "@/hooks/useDebounce";
import { cn, generateIdentifier, formatDate } from "@/lib/utils";
import { PROJECT_COLORS, STATUS_META } from "@/types";
import toast from "react-hot-toast";

const EMOJI_OPTIONS = [
  "📋",
  "🚀",
  "⚡",
  "🔥",
  "💎",
  "🛠️",
  "🎯",
  "🌟",
  "🔬",
  "🎨",
  "🏗️",
  "🤖",
];

// ─── Main Page ────────────────────────────────────────────────────

export default function ProjectsPage() {
  const projects = useProjects();
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectDetail | null>(
    null,
  );
  const [deletingProject, setDeletingProject] = useState<ProjectDetail | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-1.5 rounded-lg"
            style={{ background: "rgba(108,71,255,0.08)" }}
          >
            <LayoutGrid size={18} style={{ color: "var(--vyne-purple)" }} />
          </div>
          <div>
            <h1
              className="text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Projects
            </h1>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {projects.length} project{projects.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{
              background: "var(--content-secondary)",
              border: "1px solid var(--content-border)",
              width: "220px",
            }}
          >
            <Search size={14} style={{ color: "var(--text-tertiary)" }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              aria-label="Search projects"
              className="flex-1 bg-transparent text-sm focus:outline-none"
              style={{ color: "var(--text-primary)" }}
            />
          </div>

          {/* New Project */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold text-white transition-all"
            style={{
              background: "linear-gradient(135deg, #6C47FF 0%, #8B6BFF 100%)",
              boxShadow: "0 2px 8px rgba(108,71,255,0.3)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 4px 14px rgba(108,71,255,0.45)";
              (e.currentTarget as HTMLElement).style.transform =
                "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 2px 8px rgba(108,71,255,0.3)";
              (e.currentTarget as HTMLElement).style.transform =
                "translateY(0)";
            }}
          >
            <Plus size={16} />
            New Project
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto content-scroll px-6 py-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "rgba(108,71,255,0.08)" }}
            >
              <LayoutGrid size={28} style={{ color: "var(--vyne-purple)" }} />
            </div>
            <h3
              className="font-semibold text-lg mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              {search ? "No projects found" : "No projects yet"}
            </h3>
            <p
              className="text-sm mb-6 max-w-xs"
              style={{ color: "var(--text-tertiary)" }}
            >
              {search
                ? `No projects match "${search}"`
                : "Create your first project to start tracking work with your team"}
            </p>
            {!search && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{
                  background:
                    "linear-gradient(135deg, #6C47FF 0%, #8B6BFF 100%)",
                }}
              >
                <Plus size={16} />
                Create first project
              </button>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            }}
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((project, i) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                >
                  <ProjectCardLocal
                    project={project}
                    onNavigate={() => router.push(`/projects/${project.id}`)}
                    onEdit={() => setEditingProject(project)}
                    onDelete={() => setDeletingProject(project)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Modals */}
      <CreateProjectModalLocal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {editingProject && (
        <EditProjectModal
          project={editingProject}
          open={!!editingProject}
          onClose={() => setEditingProject(null)}
        />
      )}

      {deletingProject && (
        <DeleteProjectDialog
          project={deletingProject}
          open={!!deletingProject}
          onClose={() => setDeletingProject(null)}
        />
      )}
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────

function ProjectCardLocal({
  project,
  onNavigate,
  onEdit,
  onDelete,
}: {
  project: ProjectDetail;
  onNavigate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tasks = useProjectsStore((s) =>
    s.tasks.filter((t) => t.projectId === project.id),
  );
  const members = useTeamMembers();

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const inProgressTasks = tasks.filter(
    (t) => t.status === "in_progress",
  ).length;
  const todoTasks = tasks.filter((t) => t.status === "todo").length;
  const blockedTasks = tasks.filter((t) => t.status === "blocked").length;
  const progress =
    totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const lead = members.find((m) => m.id === project.leadId);

  const statusEntries = [
    {
      count: inProgressTasks,
      label: "In Progress",
      meta: STATUS_META.in_progress,
    },
    { count: todoTasks, label: "Todo", meta: STATUS_META.todo },
    { count: doneTasks, label: "Done", meta: STATUS_META.done },
    {
      count: blockedTasks,
      label: "Blocked",
      color: "#EF4444",
      bgColor: "#FEF2F2",
    },
  ];

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}
      transition={{ duration: 0.15 }}
      className="group cursor-pointer rounded-xl p-5 flex flex-col gap-4 transition-all"
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0" onClick={onNavigate}>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: project.color + "18" }}
          >
            {project.icon ?? "📋"}
          </div>
          <div className="min-w-0">
            <h3
              className="font-semibold truncate leading-tight group-hover:text-[#6C47FF] transition-colors"
              style={{ color: "var(--text-primary)", fontSize: "15px" }}
            >
              {project.name}
            </h3>
            <span
              className="text-xs font-mono font-medium"
              style={{ color: "var(--text-tertiary)" }}
            >
              {project.identifier}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#F0EDFF";
              (e.currentTarget as HTMLElement).style.color = "#6C47FF";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color =
                "var(--text-tertiary)";
            }}
            title="Edit project"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#FEF2F2";
              (e.currentTarget as HTMLElement).style.color = "#EF4444";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color =
                "var(--text-tertiary)";
            }}
            title="Delete project"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Description */}
      <div onClick={onNavigate}>
        {project.description && (
          <p
            className="text-sm leading-relaxed line-clamp-2"
            style={{ color: "var(--text-secondary)" }}
          >
            {project.description}
          </p>
        )}
      </div>

      {/* Progress Bar */}
      {totalTasks > 0 && (
        <div onClick={onNavigate}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Progress
            </span>
            <span
              className="text-xs font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              {progress}%
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--content-secondary)" }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${project.color} 0%, ${project.color}CC 100%)`,
              }}
            />
          </div>
        </div>
      )}

      {/* Status Pills */}
      <div className="flex flex-wrap gap-1.5" onClick={onNavigate}>
        {statusEntries.map(({ count, label, ...rest }) => {
          if (count === 0) return null;
          const color = "meta" in rest ? rest.meta.color : rest.color;
          const bgColor = "meta" in rest ? rest.meta.bgColor : rest.bgColor;
          return (
            <span
              key={label}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: bgColor, color }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ background: color }}
              />
              {count} {label}
            </span>
          );
        })}
        {totalTasks === 0 && (
          <span className="text-xs" style={{ color: "#D1D1E0" }}>
            No tasks yet
          </span>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between pt-3"
        style={{ borderTop: "1px solid #F0F0F8" }}
        onClick={onNavigate}
      >
        <div className="flex items-center gap-2">
          {lead ? (
            <>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                style={{ background: lead.color }}
              >
                {lead.initials}
              </div>
              <span
                className="text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                {lead.name}
              </span>
            </>
          ) : (
            <div
              className="flex items-center gap-1.5 text-xs"
              style={{ color: "#D1D1E0" }}
            >
              <Users size={12} />
              No lead
            </div>
          )}
        </div>
        <span className="text-xs" style={{ color: "#D1D1E0" }}>
          {formatDate(project.createdAt)}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Create Project Modal ─────────────────────────────────────────

function CreateProjectModalLocal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const addProject = useProjectsStore((s) => s.addProject);
  const [form, setForm] = useState({
    name: "",
    identifier: "",
    description: "",
    color: PROJECT_COLORS[0],
    icon: "📋",
  });
  const [identifierEdited, setIdentifierEdited] = useState(false);

  // Auto-generate identifier
  const effectiveIdentifier = identifierEdited
    ? form.identifier
    : form.name
      ? generateIdentifier(form.name)
      : "";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    addProject({
      id,
      name: form.name.trim(),
      identifier: (
        effectiveIdentifier || generateIdentifier(form.name)
      ).toUpperCase(),
      description: form.description.trim(),
      color: form.color,
      icon: form.icon,
      status: "active",
      memberIds: ["u1"],
      leadId: "u1",
    });
    toast.success(`Project "${form.name}" created!`);
    setForm({
      name: "",
      identifier: "",
      description: "",
      color: PROJECT_COLORS[0],
      icon: "📋",
    });
    setIdentifierEdited(false);
    onClose();
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      setForm({
        name: "",
        identifier: "",
        description: "",
        color: PROJECT_COLORS[0],
        icon: "📋",
      });
      setIdentifierEdited(false);
      onClose();
    }
  }

  const inputClass = cn(
    "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150",
    "placeholder:text-[#C0C0D8]",
  );

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-50"
                style={{
                  background: "rgba(0,0,0,0.4)",
                  backdropFilter: "blur(4px)",
                }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-[500px] rounded-2xl"
                style={{
                  background: "var(--content-bg)",
                  boxShadow:
                    "0 25px 60px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)",
                }}
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between px-6 py-5"
                  style={{ borderBottom: "1px solid var(--content-border)" }}
                >
                  <div>
                    <Dialog.Title
                      className="text-base font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      New Project
                    </Dialog.Title>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Set up a new project for your team
                    </p>
                  </div>
                  <Dialog.Close asChild>
                    <button aria-label="Close"
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      <X size={16} />
                    </button>
                  </Dialog.Close>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
                  {/* Icon + Name */}
                  <div className="flex gap-3">
                    <div>
                      <label
                        className="block text-xs font-medium mb-1.5"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Icon
                      </label>
                      <div className="relative group">
                        <div
                          className="w-[52px] h-[42px] rounded-lg flex items-center justify-center text-xl cursor-pointer"
                          style={{
                            background: form.color + "18",
                            border: "1px solid " + form.color + "40",
                          }}
                        >
                          {form.icon}
                        </div>
                        <div
                          className="absolute top-full left-0 mt-1 p-2 rounded-xl z-10 hidden group-hover:grid"
                          style={{
                            background: "var(--content-bg)",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                            border: "1px solid var(--content-border)",
                            gridTemplateColumns: "repeat(4, 1fr)",
                            gap: "4px",
                            width: "160px",
                          }}
                        >
                          {EMOJI_OPTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() =>
                                setForm((f) => ({ ...f, icon: emoji }))
                              }
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-base hover:bg-[#F8F8FC]"
                              style={{
                                background:
                                  form.icon === emoji
                                    ? "#F0EDFF"
                                    : "transparent",
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <label
                        className="block text-xs font-medium mb-1.5"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Project name *
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, name: e.target.value }))
                        }
                        placeholder="e.g. Product Redesign"
                        required
                        autoFocus
                        className={inputClass}
                        style={{
                          background: "var(--content-secondary)",
                          border: "1px solid var(--content-border)",
                          color: "var(--text-primary)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Identifier */}
                  <div>
                    <label
                      className="block text-xs font-medium mb-1.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Identifier
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={
                          identifierEdited
                            ? form.identifier
                            : effectiveIdentifier
                        }
                        onChange={(e) => {
                          setIdentifierEdited(true);
                          setForm((f) => ({
                            ...f,
                            identifier: e.target.value
                              .toUpperCase()
                              .replace(/[^A-Z0-9]/g, "")
                              .slice(0, 6),
                          }));
                        }}
                        placeholder="AUTO"
                        maxLength={6}
                        className={cn(inputClass, "font-mono w-24 text-center")}
                        style={{
                          background: "var(--content-secondary)",
                          border: "1px solid var(--content-border)",
                          color: "var(--text-primary)",
                        }}
                      />
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        Tasks will be labeled {effectiveIdentifier || "PROJ"}-1,{" "}
                        {effectiveIdentifier || "PROJ"}-2...
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label
                      className="block text-xs font-medium mb-1.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Description
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, description: e.target.value }))
                      }
                      placeholder="What is this project about?"
                      rows={3}
                      className={cn(inputClass, "resize-none")}
                      style={{
                        background: "var(--content-secondary)",
                        border: "1px solid var(--content-border)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>

                  {/* Color */}
                  <fieldset>
                    <legend
                      className="block text-xs font-medium mb-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Color
                    </legend>
                    <div className="flex gap-2.5 flex-wrap">
                      {PROJECT_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          aria-label={`Select ${color} color`}
                          aria-pressed={form.color === color}
                          onClick={() => setForm((f) => ({ ...f, color }))}
                          className="w-7 h-7 rounded-full transition-all"
                          style={{
                            background: color,
                            transform:
                              form.color === color ? "scale(1.2)" : "scale(1)",
                            boxShadow:
                              form.color === color
                                ? `0 0 0 2px white, 0 0 0 4px ${color}`
                                : "none",
                          }}
                        />
                      ))}
                    </div>
                  </fieldset>

                  {/* Actions */}
                  <div
                    className="flex items-center justify-end gap-2 pt-2"
                    style={{ borderTop: "1px solid #F0F0F8" }}
                  >
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-lg text-sm font-medium"
                      style={{
                        background: "var(--content-secondary)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--content-border)",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!form.name.trim()}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background:
                          "linear-gradient(135deg, #6C47FF 0%, #8B6BFF 100%)",
                        boxShadow: "0 2px 8px rgba(108,71,255,0.3)",
                      }}
                    >
                      Create project
                    </button>
                  </div>
                </form>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

// ─── Edit Project Modal ───────────────────────────────────────────

function EditProjectModal({
  project,
  open,
  onClose,
}: {
  project: ProjectDetail;
  open: boolean;
  onClose: () => void;
}) {
  const updateProject = useProjectsStore((s) => s.updateProject);
  const [form, setForm] = useState({
    name: project.name,
    description: project.description,
    color: project.color,
    icon: project.icon,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    updateProject(project.id, {
      name: form.name.trim(),
      description: form.description.trim(),
      color: form.color,
      icon: form.icon,
    });
    toast.success(`Project "${form.name}" updated!`);
    onClose();
  }

  const inputClass = cn(
    "w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150",
    "placeholder:text-[#C0C0D8]",
  );

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50"
                style={{
                  background: "rgba(0,0,0,0.4)",
                  backdropFilter: "blur(4px)",
                }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-[500px] rounded-2xl"
                style={{
                  background: "var(--content-bg)",
                  boxShadow:
                    "0 25px 60px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)",
                }}
              >
                <div
                  className="flex items-center justify-between px-6 py-5"
                  style={{ borderBottom: "1px solid var(--content-border)" }}
                >
                  <Dialog.Title
                    className="text-base font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Edit Project
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button aria-label="Close"
                      className="p-1.5 rounded-lg"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      <X size={16} />
                    </button>
                  </Dialog.Close>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
                  <div className="flex gap-3">
                    <div>
                      <label
                        className="block text-xs font-medium mb-1.5"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Icon
                      </label>
                      <div className="relative group">
                        <div
                          className="w-[52px] h-[42px] rounded-lg flex items-center justify-center text-xl cursor-pointer"
                          style={{
                            background: form.color + "18",
                            border: "1px solid " + form.color + "40",
                          }}
                        >
                          {form.icon}
                        </div>
                        <div
                          className="absolute top-full left-0 mt-1 p-2 rounded-xl z-10 hidden group-hover:grid"
                          style={{
                            background: "var(--content-bg)",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                            border: "1px solid var(--content-border)",
                            gridTemplateColumns: "repeat(4, 1fr)",
                            gap: "4px",
                            width: "160px",
                          }}
                        >
                          {EMOJI_OPTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() =>
                                setForm((f) => ({ ...f, icon: emoji }))
                              }
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-base hover:bg-[#F8F8FC]"
                              style={{
                                background:
                                  form.icon === emoji
                                    ? "#F0EDFF"
                                    : "transparent",
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <label
                        className="block text-xs font-medium mb-1.5"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Name *
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, name: e.target.value }))
                        }
                        required
                        autoFocus
                        className={inputClass}
                        style={{
                          background: "var(--content-secondary)",
                          border: "1px solid var(--content-border)",
                          color: "var(--text-primary)",
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="edit-project-description"
                      className="block text-xs font-medium mb-1.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Description
                    </label>
                    <textarea
                      id="edit-project-description"
                      value={form.description}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, description: e.target.value }))
                      }
                      placeholder="What is this project about?"
                      rows={3}
                      className={cn(inputClass, "resize-none")}
                      style={{
                        background: "var(--content-secondary)",
                        border: "1px solid var(--content-border)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>
                  <fieldset>
                    <legend
                      className="block text-xs font-medium mb-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Color
                    </legend>
                    <div className="flex gap-2.5 flex-wrap">
                      {PROJECT_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          aria-label={`Select ${color} color`}
                          aria-pressed={form.color === color}
                          onClick={() => setForm((f) => ({ ...f, color }))}
                          className="w-7 h-7 rounded-full transition-all"
                          style={{
                            background: color,
                            transform:
                              form.color === color ? "scale(1.2)" : "scale(1)",
                            boxShadow:
                              form.color === color
                                ? `0 0 0 2px white, 0 0 0 4px ${color}`
                                : "none",
                          }}
                        />
                      ))}
                    </div>
                  </fieldset>
                  <div
                    className="flex items-center justify-end gap-2 pt-2"
                    style={{ borderTop: "1px solid #F0F0F8" }}
                  >
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-lg text-sm font-medium"
                      style={{
                        background: "var(--content-secondary)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--content-border)",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!form.name.trim()}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                      style={{
                        background:
                          "linear-gradient(135deg, #6C47FF 0%, #8B6BFF 100%)",
                      }}
                    >
                      Save changes
                    </button>
                  </div>
                </form>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

// ─── Delete Confirmation ──────────────────────────────────────────

function DeleteProjectDialog({
  project,
  open,
  onClose,
}: {
  project: ProjectDetail;
  open: boolean;
  onClose: () => void;
}) {
  const deleteProject = useProjectsStore((s) => s.deleteProject);

  function handleDelete() {
    deleteProject(project.id);
    toast.success(`Project "${project.name}" deleted.`);
    onClose();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50"
                style={{
                  background: "rgba(0,0,0,0.4)",
                  backdropFilter: "blur(4px)",
                }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-[420px] rounded-2xl p-6"
                style={{
                  background: "var(--content-bg)",
                  boxShadow: "0 25px 60px rgba(0,0,0,0.2)",
                }}
              >
                <Dialog.Title
                  className="text-base font-semibold mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  Delete Project
                </Dialog.Title>
                <p
                  className="text-sm mb-6"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Are you sure you want to delete{" "}
                  <strong>{project.name}</strong>? This will also delete all
                  tasks in this project. This action cannot be undone.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{
                      background: "var(--content-secondary)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--content-border)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                    style={{ background: "#EF4444" }}
                  >
                    Delete project
                  </button>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
