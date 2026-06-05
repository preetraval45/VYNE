import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "fieldJob",
  resource: "jobs",
  events: {
    created: "field-job:created",
    updated: "field-job:updated",
    deleted: "field-job:deleted",
  },
  withDefaults: (b) => ({
    jobNumber:
      typeof b.jobNumber === "string" ? b.jobNumber : `FJ-${Date.now()}`,
    title: typeof b.title === "string" ? b.title : "Untitled job",
    customerName: typeof b.customerName === "string" ? b.customerName : "",
    address: typeof b.address === "string" ? b.address : "",
    region: typeof b.region === "string" ? b.region : "north",
    skill: typeof b.skill === "string" ? b.skill : "hvac",
    priority: typeof b.priority === "string" ? b.priority : "medium",
    status: typeof b.status === "string" ? b.status : "scheduled",
    technicianId: typeof b.technicianId === "string" ? b.technicianId : null,
    scheduledStart:
      typeof b.scheduledStart === "string" ? b.scheduledStart : "",
    scheduledEnd: typeof b.scheduledEnd === "string" ? b.scheduledEnd : "",
    estimatedHours: typeof b.estimatedHours === "number" ? b.estimatedHours : 1,
    notes: typeof b.notes === "string" ? b.notes : null,
  }),
});

export const GET = handlers.list;
export const POST = handlers.create;
