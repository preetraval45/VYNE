"use client";
import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  LayoutGrid,
  List,
  Search,
  Pencil,
  Trash2,
  Users,
  ArrowRight,
  Clock,
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
import {
  DetailPanel,
  DetailSection,
  DetailRow,
  useDetailParam,
} from "@/components/shared/DetailPanel";
import { EditableCell } from "@/components/shared/EditableCell";
import {
  Board,
  BoardColumn,
  BoardCard,
  PageHeader,
  PrimaryLink,
  ViewToggle,
  EmptyState,
  type Tone,
} from "@/components/shared/Kit";
import toast from "react-hot-toast";

// ─── Main Page ────────────────────────────────────────────────────

// Status column definitions — Odoo-style board stages.
const PROJECT_STAGES = [
  { id: "active" as const, label: "Active", tone: "info" as Tone },
  { id: "paused" as const, label: "On Hold", tone: "warn" as Tone },
  { id: "completed" as const, label: "Completed", tone: "success" as Tone },
];

function formatShortDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = d.getFullYear();
  return `${mm}/${dd}/${yy}`;
}

function ProjectsPageInner() {
  const router = useRouter();
  const projects = useProjects();
  const allTasks = useProjectsStore((s) => s.tasks);
  // DetailPanel is kept around for the List view's existing behavior,
  // but primary Board clicks now navigate directly to the full page.
  const detail = useDetailParam();
  const selectedProject = detail.id
    ? projects.find((p) => p.id === detail.id)
    : undefined;
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"board" | "list">("board");
  const debouncedSearch = useDebounce(search, 300);

  const filtered = useMemo(
    () =>
      projects.filter((p) =>
        p.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
      ),
    [projects, debouncedSearch],
  );

  const projectsByStage = useMemo(() => {
    const map = new Map<string, ProjectDetail[]>();
    for (const stage of PROJECT_STAGES) map.set(stage.id, []);
    for (const p of filtered) {
      const bucket = map.get(p.status) ?? map.get("active");
      bucket?.push(p);
    }
    return map;
  }, [filtered]);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={<LayoutGrid size={16} />}
        title="Projects"
        subtitle={`${projects.length} project${projects.length !== 1 ? "s" : ""}`}
        actions={
          <>
            <ViewToggle
              value={view}
              onChange={setView}
              options={[
                { value: "board", label: "Board", icon: <LayoutGrid size={14} /> },
                { value: "list", label: "List", icon: <List size={14} /> },
              ]}
            />
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{
                background: "var(--content-secondary)",
                border: "1px solid var(--content-border)",
                width: 220,
              }}
            >
              <Search size={14} style={{ color: "var(--text-tertiary)" }} />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                aria-label="Search projects"
                className="flex-1 bg-transparent text-sm focus:outline-none"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
            <PrimaryLink href="/projects/new">
              <Plus size={14} /> New
            </PrimaryLink>
          </>
        }
      />

      <div
        className="flex-1 overflow-auto content-scroll"
        style={{ padding: "18px 20px 24px", background: "var(--content-bg-secondary)" }}
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={<LayoutGrid size={24} />}
            title={search ? "No projects found" : "No projects yet"}
            body={
              search
                ? `No projects match "${search}" — try a different keyword.`
                : "Projects are where your team tracks work. Create one and start assigning tasks."
            }
            action={
              !search && (
                <PrimaryLink href="/projects/new">
                  <Plus size={14} /> Create first project
                </PrimaryLink>
              )
            }
          />
        ) : view === "board" ? (
          <Board>
            {PROJECT_STAGES.map((stage) => {
              const stageProjects = projectsByStage.get(stage.id) ?? [];
              return (
                <BoardColumn
                  key={stage.id}
                  title={stage.label}
                  count={stageProjects.length}
                  accent={stage.tone}
                  addHref="/projects/new"
                  onDropItem={(projectId) => {
                    const current = projects.find((p) => p.id === projectId);
                    if (current && current.status !== stage.id) {
                      useProjectsStore.getState().updateProject(projectId, { status: stage.id });
                      toast.success(`Moved to ${stage.label}`);
                    }
                  }}
                >
                  {stageProjects.map((project) => {
                    const pTasks = allTasks.filter((t) => t.projectId === project.id);
                    const done = pTasks.filter((t) => t.status === "done").length;
                    const dueDates = pTasks
                      .map((t) => t.dueDate)
                      .filter((d): d is string => !!d)
                      .sort();
                    const range =
                      dueDates.length > 0
                        ? {
                            from: formatShortDate(project.createdAt),
                            to: formatShortDate(dueDates[dueDates.length - 1]),
                          }
                        : undefined;
                    return (
                      <BoardCard
                        key={project.id}
                        dragId={project.id}
                        title={project.name}
                        href={`/projects/${project.id}`}
                        dateRange={range}
                        tag={{
                          label: project.identifier ?? "Project",
                          tone: stage.tone,
                        }}
                        footer={
                          <>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                fontSize: 12,
                                color: "var(--text-tertiary)",
                              }}
                            >
                              <Clock size={12} />
                              {pTasks.length > 0
                                ? `${done}/${pTasks.length} tasks`
                                : "No tasks"}
                            </span>
                            <AssigneeDot project={project} />
                          </>
                        }
                      />
                    );
                  })}
                </BoardColumn>
              );
            })}
          </Board>
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

      {/* Slide-in detail panel */}
      <ProjectDetailPanel project={selectedProject} onClose={detail.close} />
    </div>
  );
}

function AssigneeDot({ project }: { project: ProjectDetail }) {
  const members = useTeamMembers();
  const lead = members.find((m) => m.id === project.leadId);
  if (!lead) {
    return (
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "var(--content-secondary)",
          border: "1px solid var(--content-border)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-tertiary)",
        }}
      >
        <Users size={11} />
      </span>
    );
  }
  return (
    <span
      title={lead.name}
      style={{
        width: 22,
        height: 22,
        borderRadius: "50%",
        background: lead.color,
        color: "#fff",
        fontSize: 10,
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "2px solid var(--content-bg)",
        boxShadow: "0 0 0 1px var(--content-border)",
      }}
    >
      {lead.initials}
    </span>
  );
}

export default function ProjectsPage() {
  // Wrap in Suspense because useDetailParam() consumes useSearchParams()
  return (
    <Suspense fallback={null}>
      <ProjectsPageInner />
    </Suspense>
  );
}

// ─── Slide-in detail panel ────────────────────────────────────────

function ProjectDetailPanel({
  project,
  onClose,
}: {
  project: ProjectDetail | undefined;
  onClose: () => void;
}) {
  // Select stable references; derive filtered list with useMemo to keep
  // the snapshot stable across renders (otherwise React 19 + zustand
  // throws "Maximum update depth exceeded" — see useSyncExternalStore).
  const allTasks = useProjectsStore((s) => s.tasks);
  const tasks = useMemo(
    () => (project ? allTasks.filter((t) => t.projectId === project.id) : []),
    [allTasks, project],
  );
  const members = useTeamMembers();

  const lead = project && members.find((m) => m.id === project.leadId);
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
  const blockedTasks = tasks.filter((t) => t.status === "blocked").length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const recentTasks = [...tasks]
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, 5);

  return (
    <DetailPanel
      open={!!project}
      onClose={onClose}
      title={project?.name ?? ""}
      subtitle={
        project
          ? `${project.identifier ?? "PRJ"} · ${totalTasks} task${totalTasks === 1 ? "" : "s"}`
          : undefined
      }
      fullPageHref={project ? `/projects/${project.id}` : undefined}
      badge={
        project && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "3px 10px",
              borderRadius: 999,
              fontSize: 11.5,
              fontWeight: 600,
              background: `${project.color}1E`,
              color: project.color,
              border: `1px solid ${project.color}30`,
            }}
          >
            <span style={{ fontSize: 13 }}>{project.icon ?? "📋"}</span>
            {project.status === "completed" ? "Completed" : project.status === "paused" ? "On Hold" : "Active"}
          </span>
        )
      }
      headerActions={
        project && (
          <>
            <Link
              href={`/projects/${project.id}/edit`}
              title="Edit project"
              aria-label="Edit project"
              style={iconBtn}
            >
              <Pencil size={14} />
            </Link>
            <Link
              href={`/projects/${project.id}/delete`}
              title="Delete project"
              aria-label="Delete project"
              style={{
                ...iconBtn,
                color: "var(--status-danger)",
                borderColor: "rgba(239,68,68,0.25)",
              }}
            >
              <Trash2 size={14} />
            </Link>
          </>
        )
      }
    >
      {!project ? null : (
        <>
          {project.description && (
            <DetailSection title="About">
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: "var(--text-secondary)",
                  letterSpacing: "-0.005em",
                  margin: 0,
                }}
              >
                {project.description}
              </p>
            </DetailSection>
          )}

          <DetailSection title="Progress">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 12,
                color: "var(--text-tertiary)",
              }}
            >
              <span>
                {doneTasks} of {totalTasks} done
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  fontSize: 18,
                  letterSpacing: "-0.02em",
                }}
              >
                {progress}%
              </span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 4,
                background: "var(--content-secondary)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${project.color} 0%, ${project.color}CC 100%)`,
                  transition: "width 0.4s var(--ease-out-quart)",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              {inProgressTasks > 0 && (
                <Pill
                  label={`${inProgressTasks} in progress`}
                  color={STATUS_META.in_progress.color}
                  bg={STATUS_META.in_progress.bgColor}
                />
              )}
              {blockedTasks > 0 && (
                <Pill
                  label={`${blockedTasks} blocked`}
                  color="#EF4444"
                  bg="#FEF2F2"
                />
              )}
            </div>
          </DetailSection>

          <DetailSection title="Details">
            <DetailRow label="Identifier" value={project.identifier ?? "—"} mono />
            <DetailRow
              label="Lead"
              value={
                lead ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 6,
                        background: lead.color,
                        color: "#fff",
                        fontSize: 9,
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {lead.initials}
                    </span>
                    {lead.name}
                  </span>
                ) : (
                  <span style={{ color: "var(--text-tertiary)" }}>Unassigned</span>
                )
              }
            />
            <DetailRow
              label="Created"
              value={project.createdAt ? formatDate(project.createdAt) : "—"}
            />
          </DetailSection>

          {recentTasks.length > 0 && (
            <DetailSection title={`Recent tasks · ${recentTasks.length}`}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {recentTasks.map((t) => {
                  const meta = STATUS_META[t.status as keyof typeof STATUS_META];
                  return (
                    <div
                      key={t.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "6px 8px",
                        borderRadius: 8,
                        background: "var(--content-secondary)",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: meta?.color ?? "var(--text-tertiary)",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 12.5,
                          color: "var(--text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}
                      >
                        {t.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </DetailSection>
          )}

          <Link
            href={`/projects/${project.id}`}
            onClick={onClose}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "9px 14px",
              borderRadius: 10,
              background: "var(--content-secondary)",
              color: "var(--text-primary)",
              fontSize: 13,
              fontWeight: 500,
              border: "1px solid var(--content-border)",
              letterSpacing: "-0.005em",
            }}
          >
            Open full project page
            <ArrowRight size={13} />
          </Link>
        </>
      )}
    </DetailPanel>
  );
}

const iconBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 7,
  border: "1px solid var(--content-border)",
  background: "var(--content-bg)",
  color: "var(--text-secondary)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background 0.15s, color 0.15s",
};

function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 500,
        padding: "2px 8px",
        borderRadius: 999,
        background: bg,
        color,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
      {label}
    </span>
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
  const allTasks = useProjectsStore((s) => s.tasks);
  const tasks = useMemo(
    () => allTasks.filter((t) => t.projectId === project.id),
    [allTasks, project.id],
  );
  const updateProject = useProjectsStore((s) => s.updateProject);
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
              className="font-semibold truncate leading-tight group-hover:text-[#06B6D4] transition-colors"
              style={{ color: "var(--text-primary)", fontSize: "15px" }}
              title="Double-click to rename"
              onClick={(e) => e.stopPropagation()}
            >
              <EditableCell
                value={project.name}
                onSave={(v) => {
                  const next = String(v).trim();
                  if (!next) return;
                  updateProject(project.id, { name: next });
                  toast.success(`Renamed to "${next}"`);
                }}
                label="Project name"
                validate={(s) => (s.trim() ? null : "Name required")}
              />
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
              (e.currentTarget as HTMLElement).style.background = "#CFFAFE";
              (e.currentTarget as HTMLElement).style.color = "#06B6D4";
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
        {statusEntries.map((entry) => {
          if (entry.count === 0) return null;
          const color = "meta" in entry && entry.meta ? entry.meta.color : entry.color ?? "var(--text-secondary)";
          const bgColor = "meta" in entry && entry.meta ? entry.meta.bgColor : entry.bgColor ?? "var(--content-secondary)";
          const { count, label } = entry;
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
