import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "customer",
  resource: "customers",
  events: {
    created: "customer:created",
    updated: "customer:updated",
    deleted: "customer:deleted",
  },
});

export const PATCH = handlers.update;
export const DELETE = handlers.remove;
