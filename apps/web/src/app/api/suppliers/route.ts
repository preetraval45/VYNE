import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "supplier",
  resource: "suppliers",
  events: {
    created: "supplier:created",
    updated: "supplier:updated",
    deleted: "supplier:deleted",
  },
  withDefaults: (b) => ({
    name: typeof b.name === "string" ? b.name : "Untitled",
    email: typeof b.email === "string" ? b.email : "",
    phone: typeof b.phone === "string" ? b.phone : "",
    contactName: typeof b.contactName === "string" ? b.contactName : "",
    category: typeof b.category === "string" ? b.category : "",
    status: typeof b.status === "string" ? b.status : "Active",
  }),
});

export const GET = handlers.list;
export const POST = handlers.create;
