import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "account",
  resource: "accounts",
  events: {
    created: "account:created",
    updated: "account:updated",
    deleted: "account:deleted",
  },
});

export const PATCH = handlers.update;
export const DELETE = handlers.remove;
