import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "taskDependency",
  resource: "taskDependencies",
  events: {
    created: "task-dependency:created",
    updated: "task-dependency:updated",
    deleted: "task-dependency:deleted",
  },
});

export const PATCH = handlers.update;
export const DELETE = handlers.remove;
