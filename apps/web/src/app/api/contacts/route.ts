import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "contact",
  resource: "contacts",
  events: {
    created: "contact:created",
    updated: "contact:updated",
    deleted: "contact:deleted",
  },
  withDefaults: (b) => ({
    name: typeof b.name === "string" ? b.name : "Untitled",
    email: typeof b.email === "string" ? b.email : "",
    phone: typeof b.phone === "string" ? b.phone : "",
    company: typeof b.company === "string" ? b.company : "",
    accountId: typeof b.accountId === "string" ? b.accountId : "",
    title: typeof b.title === "string" ? b.title : "",
    department: typeof b.department === "string" ? b.department : "",
    lastContact: typeof b.lastContact === "string" ? b.lastContact : "",
    tags: Array.isArray(b.tags) ? b.tags : [],
  }),
});

export const GET = handlers.list;
export const POST = handlers.create;
