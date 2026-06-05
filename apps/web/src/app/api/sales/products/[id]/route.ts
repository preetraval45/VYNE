import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "salesProduct",
  resource: "products",
  events: {
    created: "sales-product:created",
    updated: "sales-product:updated",
    deleted: "sales-product:deleted",
  },
});

export const PATCH = handlers.update;
export const DELETE = handlers.remove;
