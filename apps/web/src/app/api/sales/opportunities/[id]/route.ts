import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "salesOpportunity",
  resource: "opportunities",
  events: {
    created: "sales-opportunity:created",
    updated: "sales-opportunity:updated",
    deleted: "sales-opportunity:deleted",
  },
});

export const PATCH = handlers.update;
export const DELETE = handlers.remove;
