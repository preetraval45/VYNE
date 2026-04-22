"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Users } from "lucide-react";
import type { Project } from "@/types";
import { STATUS_META } from "@/types";
import { formatDate, getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter();

  const statusEntries = [
    {
      key: "inProgress" as const,
      label: "In Progress",
      meta: STATUS_META.in_progress,
    },
    { key: "todo" as const, label: "Todo", meta: STATUS_META.todo },
    { key: "done" as const, label: "Done", meta: STATUS_META.done },
    { key: "backlog" as const, label: "Backlog", meta: STATUS_META.backlog },
  ];

  const totalIssues = project.issueCounts?.total ?? 0;
  const doneCount = project.issueCounts?.done ?? 0;
  const progress =
    totalIssues > 0 ? Math.round((doneCount / totalIssues) * 100) : 0;

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}
      transition={{ duration: 0.15 }}
      onClick={() => router.push(`/projects/${project.id}`)}
      className="group cursor-pointer rounded-xl p-5 flex flex-col gap-4 transition-all"
      style={{
        background: "var(--content-bg)",
        border: "1px solid var(--content-border)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      {/* ─── Header ──────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Project icon */}
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

        <ArrowRight
          size={16}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1"
          style={{ color: "var(--vyne-purple)" }}
        />
      </div>

      {/* ─── Description ─────────────────────────── */}
      {project.description && (
        <p
          className="text-sm leading-relaxed line-clamp-2"
          style={{ color: "var(--text-secondary)" }}
        >
          {project.description}
        </p>
      )}

      {/* ─── Progress Bar ────────────────────────── */}
      {totalIssues > 0 && (
        <div>
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

      {/* ─── Status Pills ────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        {statusEntries.map(({ key, label, meta }) => {
          const count = project.issueCounts?.[key] ?? 0;
          if (count === 0) return null;
          return (
            <span
              key={key}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                background: meta.bgColor,
                color: meta.color,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ background: meta.color }}
              />
              {count} {label}
            </span>
          );
        })}
        {totalIssues === 0 && (
          <span className="text-xs" style={{ color: "#D1D1E0" }}>
            No issues yet
          </span>
        )}
      </div>

      {/* ─── Footer ──────────────────────────────── */}
      <div
        className="flex items-center justify-between pt-3"
        style={{ borderTop: "1px solid #F0F0F8" }}
      >
        {/* Lead */}
        <div className="flex items-center gap-2">
          {project.lead ? (
            <>
              {project.lead.avatarUrl ? (
                <img
                  src={project.lead.avatarUrl}
                  alt={project.lead.name}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                  style={{ background: "var(--vyne-purple)" }}
                >
                  {getInitials(project.lead.name)}
                </div>
              )}
              <span
                className="text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                {project.lead.name}
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

        {/* Date */}
        <span className="text-xs" style={{ color: "#D1D1E0" }}>
          {formatDate(project.createdAt)}
        </span>
      </div>
    </motion.div>
  );
}
