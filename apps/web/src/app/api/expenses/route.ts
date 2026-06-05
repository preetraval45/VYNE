import { createCrudHandlers } from "@/lib/api/crud";

// /api/expenses — PH-A R3. CRUD for the Expenses module backed by
// Postgres. The shared factory handles tenant scoping, rate limiting,
// RBAC, and Pusher fan-out — see `lib/api/crud.ts`.

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "expense",
  resource: "expenses",
  events: {
    created: "expense:created",
    updated: "expense:updated",
    deleted: "expense:deleted",
  },
  withDefaults: (b) => ({
    date:
      typeof b.date === "string"
        ? b.date
        : new Date().toISOString().slice(0, 10),
    category: typeof b.category === "string" ? b.category : "other",
    description: typeof b.description === "string" ? b.description : "",
    amount: typeof b.amount === "number" ? Math.round(b.amount) : 0,
    currency: typeof b.currency === "string" ? b.currency : "USD",
    submittedBy: typeof b.submittedBy === "string" ? b.submittedBy : "",
    status: typeof b.status === "string" ? b.status : "draft",
    receiptUrl: typeof b.receiptUrl === "string" ? b.receiptUrl : "",
    note: typeof b.note === "string" ? b.note : "",
  }),
});

export const GET = handlers.list;
export const POST = handlers.create;
