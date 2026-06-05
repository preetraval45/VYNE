import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "leaveRequest",
  resource: "leave-requests",
  events: {
    created: "hr-leave:created",
    updated: "hr-leave:updated",
    deleted: "hr-leave:deleted",
  },
  withDefaults: (b) => ({
    employeeId: typeof b.employeeId === "string" ? b.employeeId : "",
    employeeName: typeof b.employeeName === "string" ? b.employeeName : "",
    type: typeof b.type === "string" ? b.type : "Vacation",
    dates: typeof b.dates === "string" ? b.dates : "",
    status: typeof b.status === "string" ? b.status : "Pending",
    reason: typeof b.reason === "string" ? b.reason : "",
  }),
});

export const GET = handlers.list;
export const POST = handlers.create;
