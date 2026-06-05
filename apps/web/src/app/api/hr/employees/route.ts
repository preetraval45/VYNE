import { createCrudHandlers } from "@/lib/api/crud";

export const dynamic = "force-dynamic";

const handlers = createCrudHandlers({
  model: "employee",
  resource: "employees",
  events: {
    created: "hr-employee:created",
    updated: "hr-employee:updated",
    deleted: "hr-employee:deleted",
  },
  withDefaults: (b) => ({
    name: typeof b.name === "string" ? b.name : "Untitled employee",
    initials: typeof b.initials === "string" ? b.initials : "",
    title: typeof b.title === "string" ? b.title : "",
    department: typeof b.department === "string" ? b.department : "Engineering",
    status: typeof b.status === "string" ? b.status : "Active",
    leaveNote: typeof b.leaveNote === "string" ? b.leaveNote : null,
    joined: typeof b.joined === "string" ? b.joined : "",
    email: typeof b.email === "string" ? b.email : "",
    phone: typeof b.phone === "string" ? b.phone : "",
    slack: typeof b.slack === "string" ? b.slack : "",
    reportsTo: typeof b.reportsTo === "string" ? b.reportsTo : "",
    avatarGradient:
      typeof b.avatarGradient === "string" ? b.avatarGradient : "",
    baseSalary: typeof b.baseSalary === "number" ? Math.round(b.baseSalary) : 0,
    hoursThisMonth: typeof b.hoursThisMonth === "number" ? b.hoursThisMonth : 0,
    deductions: typeof b.deductions === "number" ? b.deductions : 0,
    bonus: typeof b.bonus === "number" ? b.bonus : 0,
    vacationBalance:
      typeof b.vacationBalance === "number" ? b.vacationBalance : 0,
    sickBalance: typeof b.sickBalance === "number" ? b.sickBalance : 0,
    personalBalance:
      typeof b.personalBalance === "number" ? b.personalBalance : 0,
    usedLeaveThisYear:
      typeof b.usedLeaveThisYear === "number" ? b.usedLeaveThisYear : 0,
  }),
});

export const GET = handlers.list;
export const POST = handlers.create;
