import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

// CRM automation rules — tenant-scoped CRUD via the shared factory (Postgres,
// rate-limited, Pusher realtime). "When a deal enters {triggerStage} → {action}".
const handlers = createCrudHandlers({
  model: "automationRule",
  resource: "automations",
  events: {
    created: "automation:created",
    updated: "automation:updated",
    deleted: "automation:deleted",
  },
  withDefaults: (b) => ({
    name: typeof b.name === "string" ? b.name : "",
    module: typeof b.module === "string" ? b.module : "crm",
    triggerStage: typeof b.triggerStage === "string" ? b.triggerStage : "",
    actionType: typeof b.actionType === "string" ? b.actionType : "log_note",
    actionValue: typeof b.actionValue === "string" ? b.actionValue : "",
    enabled: typeof b.enabled === "boolean" ? b.enabled : true,
  }),
});

export const GET = handlers.list;
export const POST = handlers.create;
