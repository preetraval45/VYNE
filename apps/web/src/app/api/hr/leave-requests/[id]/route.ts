import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "leaveRequest",
  resource: "leave-requests",
  events: {
    created: "hr-leave:created",
    updated: "hr-leave:updated",
    deleted: "hr-leave:deleted",
  },
});

export const PATCH = handlers.update;
export const DELETE = handlers.remove;
