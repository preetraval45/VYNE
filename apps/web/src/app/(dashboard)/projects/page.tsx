"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  LayoutGrid,
  Search,
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
import { formatDate } from "@/lib/utils";
import { STATUS_META } from "@/types";

// ─── Main Page ────────────────────────────────────────────────────

export default function ProjectsPage() {
  const projects = useProjects();
  const router = useRouter();
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

          <Link
            href="/projects/new"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold text-white transition-all"
            style={{
              background: "linear-gradient(135deg, #6C47FF 0%, #8B6BFF 100%)",
              boxShadow: "0 2px 8px rgba(108,71,255,0.3)",
            }}
          >
            <Plus size={16} />
            New Project
          </Link>
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
              <Link
                href="/projects/new"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{
                  background:
                    "linear-gradient(135deg, #6C47FF 0%, #8B6BFF 100%)",
                }}
              >
                <Plus size={16} />
                Create first project
              </Link>
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
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────

function ProjectCardLocal({
  project,
  onNavigate,
}: {
  project: ProjectDetail;
  onNavigate: () => void;
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
        <div
          className="flex items-center gap-3 min-w-0 cursor-pointer"
          onClick={onNavigate}
        >
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

        {/* Action links — navigate to full-page edit / delete */}
        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <Link
            href={`/projects/${project.id}/edit`}
            aria-label={`Edit ${project.name}`}
            title="Edit project"
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
          >
            <Pencil size={14} />
          </Link>
          <Link
            href={`/projects/${project.id}/delete`}
            aria-label={`Delete ${project.name}`}
            title="Delete project"
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
          >
            <Trash2 size={14} />
          </Link>
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
        style={{ borderTop: "1px solid var(--content-border)" }}
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
              style={{ color: "var(--text-tertiary)" }}
            >
              <Users size={12} />
              No lead
            </div>
          )}
        </div>
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {formatDate(project.createdAt)}
        </span>
      </div>
    </motion.div>
  );
}
