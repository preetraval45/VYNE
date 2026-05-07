import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "product",
  resource: "products",
  events: {
    created: "product:created",
    updated: "product:updated",
    deleted: "product:deleted",
  },
});

export const PATCH = handlers.update;
export const DELETE = handlers.remove;
