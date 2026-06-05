import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "fieldJob",
  resource: "jobs",
  events: {
    created: "field-job:created",
    updated: "field-job:updated",
    deleted: "field-job:deleted",
  },
});

export const PATCH = handlers.update;
export const DELETE = handlers.remove;
