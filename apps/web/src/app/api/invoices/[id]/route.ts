import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "invoice",
  resource: "invoices",
  events: {
    created: "invoice:created",
    updated: "invoice:updated",
    deleted: "invoice:deleted",
  },
});

export const PATCH = handlers.update;
export const DELETE = handlers.remove;
