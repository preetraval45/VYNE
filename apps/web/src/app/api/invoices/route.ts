import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "invoice",
  resource: "invoices",
  events: {
    created: "invoice:created",
    updated: "invoice:updated",
    deleted: "invoice:deleted",
  },
  withDefaults: (b) => ({
    number: typeof b.number === "string" ? b.number : "",
    customer: typeof b.customer === "string" ? b.customer : "",
    date: typeof b.date === "string" ? b.date : "",
    dueDate: typeof b.dueDate === "string" ? b.dueDate : "",
    amount: typeof b.amount === "number" ? b.amount : 0,
    items: Array.isArray(b.items) ? b.items : [],
    notes: typeof b.notes === "string" ? b.notes : "",
    status: typeof b.status === "string" ? b.status : "Draft",
  }),
});

export const GET = handlers.list;
export const POST = handlers.create;
