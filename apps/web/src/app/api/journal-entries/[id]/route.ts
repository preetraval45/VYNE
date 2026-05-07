import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "journalEntry",
  resource: "journalEntries",
  events: {
    created: "journal:created",
    updated: "journal:updated",
    deleted: "journal:deleted",
  },
});

export const PATCH = handlers.update;
export const DELETE = handlers.remove;
