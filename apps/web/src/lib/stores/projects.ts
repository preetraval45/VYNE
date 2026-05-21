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
  type TaskDependency,
  type TaskDependencyType,
  type TaskStatus,
  type TaskPriority,
  type TeamMember,
} from "@/lib/fixtures/projects";
import { seedOrEmpty, shouldSeedFixtures } from "@/lib/stores/seedMode";
import { subscribe as rtSubscribe, isRealtimeEnabled } from "@/lib/realtime";

// ─── Remote mirror helpers ─────────────────────────────────────────
// The wire shape doesn't carry rich nested fields (activity[], attachments[],
// comments[]) — those stay client-side until each grows its own table.
// Tasks send `taskKey`/`taskOrder`/`subtasks` which mirror the schema fields.

function mirrorProjectCreate(p: ProjectDetail) {
  void fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  }).catch(() => {});
}
function mirrorProjectUpdate(id: string, patch: Partial<ProjectDetail>) {
  void fetch(`/api/projects/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  }).catch(() => {});
}
function mirrorProjectDelete(id: string) {
  void fetch(`/api/projects/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }).catch(() => {});
}

interface TaskWire {
  id: string;
  projectId: string;
  taskKey: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeId: string | null;
  startDate: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
  timeSpent: number | null;
  tags: string[];
  taskOrder: number;
  subtasks: Subtask[];
}
function taskToWire(t: Task): TaskWire {
  return {
    id: t.id,
    projectId: t.projectId,
    taskKey: t.key,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    assigneeId: t.assigneeId,
    startDate: t.startDate,
    dueDate: t.dueDate,
    estimatedHours: t.estimatedHours,
    timeSpent: t.timeSpent,
    tags: t.tags,
    taskOrder: t.order,
    subtasks: t.subtasks,
  };
}
function mirrorTaskCreate(t: Task) {
  void fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(taskToWire(t)),
  }).catch(() => {});
}
function mirrorTaskUpdate(id: string, patch: Partial<Task>) {
  // Map the local field names that differ from the wire shape.
  const wire: Record<string, unknown> = { ...patch };
  if (patch.key !== undefined) {
    wire.taskKey = patch.key;
    delete wire.key;
  }
  if (patch.order !== undefined) {
    wire.taskOrder = patch.order;
    delete wire.order;
  }
  void fetch(`/api/tasks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(wire),
  }).catch(() => {});
}
function mirrorTaskDelete(id: string) {
  void fetch(`/api/tasks/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }).catch(() => {});
}

function mirrorDependencyCreate(d: TaskDependency) {
  void fetch("/api/task-dependencies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(d),
  }).catch(() => {});
}
function mirrorDependencyDelete(id: string) {
  void fetch(`/api/task-dependencies/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }).catch(() => {});
}

// Re-export types the pages need
export type {
  ProjectDetail,
  Task,
  Subtask,
  TaskComment,
  TaskDependency,
  TaskDependencyType,
  TaskStatus,
  TaskPriority,
  TeamMember,
};

// ─── Store Shape ───────────────────────────────────────────────────

interface ProjectsState {
  projects: ProjectDetail[];
  tasks: Task[];
  teamMembers: TeamMember[];
  taskDependencies: TaskDependency[];
  projectsHydrated: boolean;
  tasksHydrated: boolean;

  // ── Project CRUD ──────────────────────────────────────────────
  addProject: (project: Omit<ProjectDetail, "createdAt" | "updatedAt">) => void;
  updateProject: (id: string, data: Partial<ProjectDetail>) => void;
  deleteProject: (id: string) => void;
  hydrateProjectsFromServer: () => Promise<void>;
  hydrateTasksFromServer: () => Promise<void>;

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

  // ── Dependency ops (Gantt Phase 2) ────────────────────────────
  addDependency: (
    fromTaskId: string,
    toTaskId: string,
    type?: TaskDependencyType,
  ) => TaskDependency | null;
  removeDependency: (id: string) => void;
  hydrateDependenciesFromServer: () => Promise<void>;
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
      taskDependencies: [],
      projectsHydrated: false,
      tasksHydrated: false,

      // ── Project CRUD ──────────────────────────────────────────
      addProject: (project) => {
        const row: ProjectDetail = {
          ...project,
          createdAt: now(),
          updatedAt: now(),
        };
        set((state) => ({ projects: [...state.projects, row] }));
        mirrorProjectCreate(row);
      },

      updateProject: (id, data) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...data, updatedAt: now() } : p,
          ),
        }));
        mirrorProjectUpdate(id, data);
      },

      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          tasks: state.tasks.filter((t) => t.projectId !== id),
        }));
        mirrorProjectDelete(id);
      },

      hydrateProjectsFromServer: async () => {
        try {
          const res = await fetch("/api/projects", { cache: "no-store" });
          if (!res.ok) return;
          const body = (await res.json()) as { projects?: ProjectDetail[] };
          if (Array.isArray(body.projects) && body.projects.length > 0) {
            set({ projects: body.projects, projectsHydrated: true });
          } else if (Array.isArray(body.projects)) {
            if (shouldSeedFixtures()) {
              set({
                projects: DEMO_PROJECT_DETAILS,
                projectsHydrated: true,
              });
            } else {
              set({ projects: [], projectsHydrated: true });
            }
          }
        } catch {
          if (!get().projectsHydrated) set({ projectsHydrated: false });
        }
      },

      hydrateTasksFromServer: async () => {
        try {
          const res = await fetch("/api/tasks", { cache: "no-store" });
          if (!res.ok) return;
          const body = (await res.json()) as { tasks?: TaskWire[] };
          if (Array.isArray(body.tasks) && body.tasks.length > 0) {
            // Wire shape → local Task shape (rename taskKey→key, taskOrder→order,
            // hydrate activity/attachments/comments as empty arrays).
            const local: Task[] = body.tasks.map((w) => ({
              id: w.id,
              projectId: w.projectId,
              key: w.taskKey,
              title: w.title,
              description: w.description,
              status: w.status as TaskStatus,
              priority: w.priority as TaskPriority,
              assigneeId: w.assigneeId,
              startDate: w.startDate,
              dueDate: w.dueDate,
              estimatedHours: w.estimatedHours,
              timeSpent: w.timeSpent,
              tags: w.tags ?? [],
              subtasks: w.subtasks ?? [],
              comments: [],
              activity: [],
              attachments: [],
              order: w.taskOrder,
              createdAt: now(),
              updatedAt: now(),
            }));
            set({ tasks: local, tasksHydrated: true });
          } else if (Array.isArray(body.tasks)) {
            if (shouldSeedFixtures()) {
              set({ tasks: DEMO_TASKS, tasksHydrated: true });
            } else {
              set({ tasks: [], tasksHydrated: true });
            }
          }
        } catch {
          if (!get().tasksHydrated) set({ tasksHydrated: false });
        }
      },

      // ── Task CRUD ─────────────────────────────────────────────
      addTask: (projectId, taskData) => {
        const state = get();
        const projectTasks = state.tasks.filter(
          (t) => t.projectId === projectId,
        );
        const project = state.projects.find((p) => p.id === projectId);
        const nextOrder =
          projectTasks.length > 0
            ? Math.max(...projectTasks.map((t) => t.order)) + 1
            : 0;
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
        set((s) => ({ tasks: [...s.tasks, newTask] }));
        mirrorTaskCreate(newTask);
      },

      updateTask: (taskId, data) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, ...data, updatedAt: now() } : t,
          ),
        }));
        mirrorTaskUpdate(taskId, data);
      },

      deleteTask: (taskId) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== taskId),
        }));
        mirrorTaskDelete(taskId);
      },

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

      // ── Dependency ops (Gantt Phase 2) ────────────────────────
      addDependency: (fromTaskId, toTaskId, type = "FS") => {
        if (fromTaskId === toTaskId) return null;
        const exists = get().taskDependencies.some(
          (d) => d.fromTaskId === fromTaskId && d.toTaskId === toTaskId,
        );
        if (exists) return null;
        const row: TaskDependency = {
          id: uid(),
          fromTaskId,
          toTaskId,
          type,
          createdAt: now(),
        };
        set((state) => ({
          taskDependencies: [...state.taskDependencies, row],
        }));
        mirrorDependencyCreate(row);
        return row;
      },

      removeDependency: (id) => {
        set((state) => ({
          taskDependencies: state.taskDependencies.filter((d) => d.id !== id),
        }));
        mirrorDependencyDelete(id);
      },

      hydrateDependenciesFromServer: async () => {
        try {
          const res = await fetch("/api/task-dependencies", { cache: "no-store" });
          if (!res.ok) return;
          const body = (await res.json()) as { taskDependencies?: TaskDependency[] };
          if (Array.isArray(body.taskDependencies)) {
            set({ taskDependencies: body.taskDependencies });
          }
        } catch {
          // Silent — store stays on its persisted copy.
        }
      },

      // ── Kanban reorder ────────────────────────────────────────
      reorderTasks: (_projectId, updates) => {
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
        }));
        // Mirror each kanban-drop independently. Failures roll back via
        // hydrate on next pull-refresh.
        for (const u of updates) {
          mirrorTaskUpdate(u.id, {
            status: u.status,
            order: u.order,
          } as Partial<Task>);
        }
      },
    }),
    {
      name: "vyne-projects",
      partialize: (state) => ({
        projects: state.projects,
        tasks: state.tasks,
        taskDependencies: state.taskDependencies,
      }),
    },
  ),
);

// ── Realtime subscription ──────────────────────────────────────────
let _projectsRtBound = false;
export function bindProjectsRealtime(orgId = "demo") {
  if (_projectsRtBound || !isRealtimeEnabled()) return;
  _projectsRtBound = true;

  rtSubscribe<ProjectDetail>(`org-${orgId}`, "project:created", (p) => {
    useProjectsStore.setState((s) => {
      if (s.projects.some((x) => x.id === p.id)) return s;
      return { projects: [...s.projects, p] };
    });
  });
  rtSubscribe<ProjectDetail>(`org-${orgId}`, "project:updated", (p) => {
    useProjectsStore.setState((s) => ({
      projects: s.projects.map((x) => (x.id === p.id ? { ...x, ...p } : x)),
    }));
  });
  rtSubscribe<{ id: string }>(`org-${orgId}`, "project:deleted", ({ id }) => {
    useProjectsStore.setState((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      tasks: s.tasks.filter((t) => t.projectId !== id),
    }));
  });

  rtSubscribe<TaskWire>(`org-${orgId}`, "task:created", (w) => {
    useProjectsStore.setState((s) => {
      if (s.tasks.some((x) => x.id === w.id)) return s;
      const t: Task = {
        id: w.id,
        projectId: w.projectId,
        key: w.taskKey,
        title: w.title,
        description: w.description,
        status: w.status as TaskStatus,
        priority: w.priority as TaskPriority,
        assigneeId: w.assigneeId,
        startDate: w.startDate,
        dueDate: w.dueDate,
        estimatedHours: w.estimatedHours,
        timeSpent: w.timeSpent,
        tags: w.tags ?? [],
        subtasks: w.subtasks ?? [],
        comments: [],
        activity: [],
        attachments: [],
        order: w.taskOrder,
        createdAt: now(),
        updatedAt: now(),
      };
      return { tasks: [...s.tasks, t] };
    });
  });
  rtSubscribe<TaskWire>(`org-${orgId}`, "task:updated", (w) => {
    useProjectsStore.setState((s) => ({
      tasks: s.tasks.map((x) =>
        x.id === w.id
          ? {
              ...x,
              title: w.title ?? x.title,
              description: w.description ?? x.description,
              status: (w.status as TaskStatus) ?? x.status,
              priority: (w.priority as TaskPriority) ?? x.priority,
              assigneeId: w.assigneeId ?? x.assigneeId,
              dueDate: w.dueDate ?? x.dueDate,
              order: w.taskOrder ?? x.order,
            }
          : x,
      ),
    }));
  });
  rtSubscribe<{ id: string }>(`org-${orgId}`, "task:deleted", ({ id }) => {
    useProjectsStore.setState((s) => ({
      tasks: s.tasks.filter((t) => t.id !== id),
    }));
  });
}

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
