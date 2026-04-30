import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEMO_PROJECT_DETAILS,
  DEMO_TASKS,
  TEAM_MEMBERS,
  type ProjectDetail,
  type Task,
  type Subtask,
  type TaskComment,
  type TaskStatus,
  type TaskPriority,
  type TeamMember,
} from "@/lib/fixtures/projects";
import { seedOrEmpty } from "@/lib/stores/seedMode";

// Re-export types the pages need
export type {
  ProjectDetail,
  Task,
  Subtask,
  TaskComment,
  TaskStatus,
  TaskPriority,
  TeamMember,
};

// ─── Store Shape ───────────────────────────────────────────────────

interface ProjectsState {
  projects: ProjectDetail[];
  tasks: Task[];
  teamMembers: TeamMember[];

  // ── Project CRUD ──────────────────────────────────────────────
  addProject: (project: Omit<ProjectDetail, "createdAt" | "updatedAt">) => void;
  updateProject: (id: string, data: Partial<ProjectDetail>) => void;
  deleteProject: (id: string) => void;

  // ── Task CRUD ─────────────────────────────────────────────────
  addTask: (
    projectId: string,
    task: Omit<
      Task,
      | "id"
      | "projectId"
      | "key"
      | "order"
      | "createdAt"
      | "updatedAt"
      | "activity"
      | "attachments"
    >,
  ) => void;
  updateTask: (taskId: string, data: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;

  // ── Subtask ops ───────────────────────────────────────────────
  addSubtask: (taskId: string, subtask: Omit<Subtask, "id">) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;

  // ── Comment ops ───────────────────────────────────────────────
  addComment: (
    taskId: string,
    comment: Omit<TaskComment, "id" | "createdAt">,
  ) => void;

  // ── Kanban reorder ────────────────────────────────────────────
  reorderTasks: (
    projectId: string,
    updates: { id: string; status: TaskStatus; order: number }[],
  ) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function now(): string {
  return new Date().toISOString();
}

// ─── Store ──────────────────────────────────────────────────────────

export const useProjectsStore = create<ProjectsState>()(
  persist(
    (set, get) => ({
      projects: seedOrEmpty(DEMO_PROJECT_DETAILS),
      tasks: seedOrEmpty(DEMO_TASKS),
      teamMembers: seedOrEmpty(TEAM_MEMBERS),

      // ── Project CRUD ──────────────────────────────────────────
      addProject: (project) =>
        set((state) => ({
          projects: [
            ...state.projects,
            { ...project, createdAt: now(), updatedAt: now() },
          ],
        })),

      updateProject: (id, data) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...data, updatedAt: now() } : p,
          ),
        })),

      deleteProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          tasks: state.tasks.filter((t) => t.projectId !== id),
        })),

      // ── Task CRUD ─────────────────────────────────────────────
      addTask: (projectId, taskData) =>
        set((state) => {
          const projectTasks = state.tasks.filter(
            (t) => t.projectId === projectId,
          );
          const project = state.projects.find((p) => p.id === projectId);
          const nextOrder =
            projectTasks.length > 0
              ? Math.max(...projectTasks.map((t) => t.order)) + 1
              : 0;
          // Generate the task key from the project identifier
          const existingKeys = projectTasks.map((t) => {
            const num = parseInt(t.key.split("-").pop() ?? "0", 10);
            return isNaN(num) ? 0 : num;
          });
          const nextNum =
            existingKeys.length > 0 ? Math.max(...existingKeys) + 1 : 1;
          const identifier = project?.identifier ?? "TASK";

          const newTask: Task = {
            id: uid(),
            projectId,
            key: `${identifier}-${nextNum}`,
            order: nextOrder,
            activity: [],
            attachments: [],
            createdAt: now(),
            updatedAt: now(),
            ...taskData,
          };

          return { tasks: [...state.tasks, newTask] };
        }),

      updateTask: (taskId, data) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, ...data, updatedAt: now() } : t,
          ),
        })),

      deleteTask: (taskId) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== taskId),
        })),

      // ── Subtask ops ───────────────────────────────────────────
      addSubtask: (taskId, subtask) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  subtasks: [...t.subtasks, { ...subtask, id: uid() }],
                  updatedAt: now(),
                }
              : t,
          ),
        })),

      toggleSubtask: (taskId, subtaskId) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  subtasks: t.subtasks.map((s) =>
                    s.id === subtaskId ? { ...s, done: !s.done } : s,
                  ),
                  updatedAt: now(),
                }
              : t,
          ),
        })),

      deleteSubtask: (taskId, subtaskId) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  subtasks: t.subtasks.filter((s) => s.id !== subtaskId),
                  updatedAt: now(),
                }
              : t,
          ),
        })),

      // ── Comment ops ───────────────────────────────────────────
      addComment: (taskId, comment) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  comments: [
                    ...t.comments,
                    { ...comment, id: uid(), createdAt: now() },
                  ],
                  updatedAt: now(),
                }
              : t,
          ),
        })),

      // ── Kanban reorder ────────────────────────────────────────
      reorderTasks: (_projectId, updates) =>
        set((state) => ({
          tasks: state.tasks.map((t) => {
            const update = updates.find((u) => u.id === t.id);
            if (update) {
              return {
                ...t,
                status: update.status,
                order: update.order,
                updatedAt: now(),
              };
            }
            return t;
          }),
        })),
    }),
    {
      name: "vyne-projects",
      partialize: (state) => ({
        projects: state.projects,
        tasks: state.tasks,
      }),
    },
  ),
);

// ─── Selector hooks ────────────────────────────────────────────────

export const useProjects = () => useProjectsStore((s) => s.projects);

// Subscribe to the stable `projects` array, then derive with useMemo —
// future-proofs against any store change that rebuilds items on each set
// (e.g. immer in patches mode), which would otherwise trip React #185.
export const useProject = (id: string) => {
  const projects = useProjectsStore((s) => s.projects);
  return useMemo(() => projects.find((p) => p.id === id), [projects, id]);
};

// IMPORTANT: select the stable `tasks` array first, then derive with useMemo.
// Returning `s.tasks.filter(...)` directly produces a new array per call,
// which trips React 19's useSyncExternalStore consistency check
// (Minified React error #185 — Maximum update depth exceeded).
export const useProjectTasks = (projectId: string) => {
  const tasks = useProjectsStore((s) => s.tasks);
  return useMemo(() => tasks.filter((t) => t.projectId === projectId), [tasks, projectId]);
};

export const useTask = (taskId: string) => {
  const tasks = useProjectsStore((s) => s.tasks);
  return useMemo(() => tasks.find((t) => t.id === taskId), [tasks, taskId]);
};

export const useTeamMembers = () => useProjectsStore((s) => s.teamMembers);
