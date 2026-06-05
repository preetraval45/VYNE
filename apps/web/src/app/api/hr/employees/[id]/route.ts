import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "employee",
  resource: "employees",
  events: {
    created: "hr-employee:created",
    updated: "hr-employee:updated",
    deleted: "hr-employee:deleted",
  },
});

export const PATCH = handlers.update;
export const DELETE = handlers.remove;
