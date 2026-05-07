import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "task",
  resource: "tasks",
  events: {
    created: "task:created",
    updated: "task:updated",
    deleted: "task:deleted",
  },
  withDefaults: (b) => ({
    projectId: typeof b.projectId === "string" ? b.projectId : "",
    taskKey: typeof b.taskKey === "string" ? b.taskKey : "",
    title: typeof b.title === "string" ? b.title : "Untitled Task",
    description: typeof b.description === "string" ? b.description : "",
    status: typeof b.status === "string" ? b.status : "todo",
    priority: typeof b.priority === "string" ? b.priority : "medium",
    assigneeId: typeof b.assigneeId === "string" ? b.assigneeId : null,
    startDate: typeof b.startDate === "string" ? b.startDate : null,
    dueDate: typeof b.dueDate === "string" ? b.dueDate : null,
    estimatedHours:
      typeof b.estimatedHours === "number" ? b.estimatedHours : null,
    timeSpent: typeof b.timeSpent === "number" ? b.timeSpent : null,
    tags: Array.isArray(b.tags) ? b.tags : [],
    taskOrder: typeof b.taskOrder === "number" ? b.taskOrder : 0,
    subtasks: Array.isArray(b.subtasks) ? b.subtasks : [],
  }),
});

export const GET = handlers.list;
export const POST = handlers.create;
