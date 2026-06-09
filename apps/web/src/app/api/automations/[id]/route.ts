import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "automationRule",
  resource: "automations",
  events: {
    created: "automation:created",
    updated: "automation:updated",
    deleted: "automation:deleted",
  },
});

export const PATCH = handlers.update;
export const DELETE = handlers.remove;
