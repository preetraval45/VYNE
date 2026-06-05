import { createCrudHandlers } from "@/lib/api/crud";

// PATCH + DELETE for a single expense by id. Tenant-scoped via the
// shared factory.

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "expense",
  resource: "expenses",
  events: {
    created: "expense:created",
    updated: "expense:updated",
    deleted: "expense:deleted",
  },
});

export const PATCH = handlers.update;
export const DELETE = handlers.remove;
