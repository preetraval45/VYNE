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
});

export const PATCH = handlers.update;
export const DELETE = handlers.remove;
