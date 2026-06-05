import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "fieldTechnician",
  resource: "technicians",
  events: {
    created: "field-tech:created",
    updated: "field-tech:updated",
    deleted: "field-tech:deleted",
  },
});

export const PATCH = handlers.update;
export const DELETE = handlers.remove;
