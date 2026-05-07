import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "project",
  resource: "projects",
  events: {
    created: "project:created",
    updated: "project:updated",
    deleted: "project:deleted",
  },
  withDefaults: (b) => ({
    name: typeof b.name === "string" ? b.name : "Untitled Project",
    identifier: typeof b.identifier === "string" ? b.identifier : "",
    description: typeof b.description === "string" ? b.description : "",
    color: typeof b.color === "string" ? b.color : "#6C47FF",
    icon: typeof b.icon === "string" ? b.icon : "",
    status: typeof b.status === "string" ? b.status : "active",
    memberIds: Array.isArray(b.memberIds) ? b.memberIds : [],
    leadId: typeof b.leadId === "string" ? b.leadId : "",
    startDate: typeof b.startDate === "string" ? b.startDate : null,
    endDate: typeof b.endDate === "string" ? b.endDate : null,
    priority: typeof b.priority === "string" ? b.priority : "medium",
    tags: Array.isArray(b.tags) ? b.tags : [],
    budget: typeof b.budget === "number" ? b.budget : null,
    spend: typeof b.spend === "number" ? b.spend : null,
  }),
});

export const GET = handlers.list;
export const POST = handlers.create;
