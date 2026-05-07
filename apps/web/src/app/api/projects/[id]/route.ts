import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "project",
  resource: "projects",
  events: {
    created: "project:created",
    updated: "project:updated",
    deleted: "project:deleted",
  },
});

export const PATCH = handlers.update;
export const DELETE = handlers.remove;
