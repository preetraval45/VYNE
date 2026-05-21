import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "taskDependency",
  resource: "taskDependencies",
  events: {
    created: "task-dependency:created",
    updated: "task-dependency:updated",
    deleted: "task-dependency:deleted",
  },
  withDefaults: (b) => ({
    fromTaskId: typeof b.fromTaskId === "string" ? b.fromTaskId : "",
    toTaskId: typeof b.toTaskId === "string" ? b.toTaskId : "",
    type: typeof b.type === "string" ? b.type : "FS",
    lagDays: typeof b.lagDays === "number" ? b.lagDays : 0,
  }),
});

export const GET = handlers.list;
export const POST = handlers.create;
