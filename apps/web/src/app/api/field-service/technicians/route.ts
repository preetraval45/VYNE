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
  withDefaults: (b) => ({
    name: typeof b.name === "string" ? b.name : "Untitled tech",
    initials: typeof b.initials === "string" ? b.initials : "",
    region: typeof b.region === "string" ? b.region : "north",
    skills: Array.isArray(b.skills) ? b.skills : [],
    color: typeof b.color === "string" ? b.color : "#06B6D4",
    weeklyCapacityHours:
      typeof b.weeklyCapacityHours === "number" ? b.weeklyCapacityHours : 40,
  }),
});

export const GET = handlers.list;
export const POST = handlers.create;
