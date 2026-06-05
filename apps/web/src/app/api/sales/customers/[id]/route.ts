import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "salesCustomer",
  resource: "customers",
  events: {
    created: "sales-customer:created",
    updated: "sales-customer:updated",
    deleted: "sales-customer:deleted",
  },
});

export const PATCH = handlers.update;
export const DELETE = handlers.remove;
