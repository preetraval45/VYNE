import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "contact",
  resource: "contacts",
  events: {
    created: "contact:created",
    updated: "contact:updated",
    deleted: "contact:deleted",
  },
});

export const PATCH = handlers.update;
export const DELETE = handlers.remove;
