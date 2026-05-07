import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "supplier",
  resource: "suppliers",
  events: {
    created: "supplier:created",
    updated: "supplier:updated",
    deleted: "supplier:deleted",
  },
});

export const PATCH = handlers.update;
export const DELETE = handlers.remove;
