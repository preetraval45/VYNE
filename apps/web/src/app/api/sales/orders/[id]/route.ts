import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "salesOrder",
  resource: "orders",
  events: {
    created: "sales-order:created",
    updated: "sales-order:updated",
    deleted: "sales-order:deleted",
  },
});

export const PATCH = handlers.update;
export const DELETE = handlers.remove;
