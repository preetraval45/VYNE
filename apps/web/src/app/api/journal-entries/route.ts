import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "journalEntry",
  resource: "journalEntries",
  events: {
    created: "journal:created",
    updated: "journal:updated",
    deleted: "journal:deleted",
  },
  withDefaults: (b) => ({
    entryNumber: typeof b.entryNumber === "string" ? b.entryNumber : "",
    description: typeof b.description === "string" ? b.description : "",
    postingDate:
      typeof b.postingDate === "string"
        ? new Date(b.postingDate)
        : new Date(),
    status: typeof b.status === "string" ? b.status : "draft",
    totalDebits: typeof b.totalDebits === "number" ? b.totalDebits : 0,
    memo: typeof b.memo === "string" ? b.memo : "",
    lines: Array.isArray(b.lines) ? b.lines : [],
  }),
});

export const GET = handlers.list;
export const POST = handlers.create;
