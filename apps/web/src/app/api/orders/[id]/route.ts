import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "order",
  resource: "orders",
  events: {
    created: "order:created",
    updated: "order:updated",
    deleted: "order:deleted",
  },
});

export const PATCH = handlers.update;
export const DELETE = handlers.remove;
