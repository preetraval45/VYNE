import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "salesQuote",
  resource: "quotes",
  events: {
    created: "sales-quote:created",
    updated: "sales-quote:updated",
    deleted: "sales-quote:deleted",
  },
});

export const PATCH = handlers.update;
export const DELETE = handlers.remove;
