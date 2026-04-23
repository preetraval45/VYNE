export const IS_DEMO_MODE = !process.env.NEXT_PUBLIC_API_URL;

// ── Types ────────────────────────────────────────────────────────
export type Department =
  | "Engineering"
  | "Product"
  | "Sales"
  | "Finance"
  | "Operations";
export type EmployeeStatus = "Active" | "Remote" | "On Leave";
export type LeaveRequestStatus = "Pending" | "Approved" | "Rejected";

export interface Employee {
  id: string;
  name: string;
  initials: string;
  title: string;
  department: Department;
  status: EmployeeStatus;
  leaveNote?: string;
  joined: string;
  email: string;
  phone: string;
  slack: string;
  reportsTo: string;
  avatarGradient: string;
  baseSalary: number;
  hoursThisMonth: number;
  deductions: number;
  bonus: number;
  vacationBalance: number;
  sickBalance: number;
  personalBalance: number;
  usedLeaveThisYear: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: string;
  dates: string;
  status: LeaveRequestStatus;
  reason: string;
}

// ── Mock employees ───────────────────────────────────────────────
export const EMPLOYEES: Employee[] = [
  {
    id: "e1",
    name: "Preet Raval",
    initials: "PR",
    title: "CEO",
    department: "Engineering",
    status: "Active",
    joined: "Jan 2024",
    email: "preet@vyne.io",
    phone: "+1 (416) 555-0101",
    slack: "@preet",
    reportsTo: "\u2014",
    avatarGradient: "linear-gradient(135deg,#06B6D4,#9B59B6)",
    baseSalary: 180000,
    hoursThisMonth: 160,
    deductions: 4200,
    bonus: 5000,
    vacationBalance: 15,
    sickBalance: 5,
    personalBalance: 3,
    usedLeaveThisYear: 2,
  },
  {
    id: "e2",
    name: "Sarah Kim",
    initials: "SK",
    title: "Head of Product",
    department: "Product",
    status: "Active",
    joined: "Feb 2024",
    email: "sarah@vyne.io",
    phone: "+1 (416) 555-0102",
    slack: "@sarah.kim",
    reportsTo: "Preet Raval",
    avatarGradient: "linear-gradient(135deg,#9B59B6,#8E44AD)",
    baseSalary: 145000,
    hoursThisMonth: 160,
    deductions: 3400,
    bonus: 3000,
    vacationBalance: 14,
    sickBalance: 5,
    personalBalance: 3,
    usedLeaveThisYear: 3,
  },
  {
    id: "e3",
    name: "Tony Martinez",
    initials: "TM",
    title: "DevOps Lead",
    department: "Engineering",
    status: "Active",
    joined: "Feb 2024",
    email: "tony@vyne.io",
    phone: "+1 (416) 555-0103",
    slack: "@tony.m",
    reportsTo: "Preet Raval",
    avatarGradient: "linear-gradient(135deg,#E67E22,#F39C12)",
    baseSalary: 138000,
    hoursThisMonth: 164,
    deductions: 3200,
    bonus: 2500,
    vacationBalance: 13,
    sickBalance: 4,
    personalBalance: 3,
    usedLeaveThisYear: 4,
  },
  {
    id: "e4",
    name: "Alex Rhodes",
    initials: "AR",
    title: "Sales Lead",
    department: "Sales",
    status: "Active",
    joined: "Mar 2024",
    email: "alex@vyne.io",
    phone: "+1 (416) 555-0104",
    slack: "@alex.r",
    reportsTo: "Preet Raval",
    avatarGradient: "linear-gradient(135deg,#E24B4A,#C0392B)",
    baseSalary: 120000,
    hoursThisMonth: 158,
    deductions: 2900,
    bonus: 4000,
    vacationBalance: 12,
    sickBalance: 5,
    personalBalance: 2,
    usedLeaveThisYear: 5,
  },
  {
    id: "e5",
    name: "Emma Wilson",
    initials: "EW",
    title: "Finance Manager",
    department: "Finance",
    status: "Remote",
    joined: "Apr 2024",
    email: "emma@vyne.io",
    phone: "+1 (416) 555-0105",
    slack: "@emma.w",
    reportsTo: "Preet Raval",
    avatarGradient: "linear-gradient(135deg,#3B82F6,#1D4ED8)",
    baseSalary: 125000,
    hoursThisMonth: 160,
    deductions: 2950,
    bonus: 2000,
    vacationBalance: 11,
    sickBalance: 5,
    personalBalance: 3,
    usedLeaveThisYear: 6,
  },
  {
    id: "e6",
    name: "James Chen",
    initials: "JC",
    title: "Backend Engineer",
    department: "Engineering",
    status: "Active",
    joined: "May 2024",
    email: "james@vyne.io",
    phone: "+1 (416) 555-0106",
    slack: "@james.c",
    reportsTo: "Tony Martinez",
    avatarGradient: "linear-gradient(135deg,#10B981,#059669)",
    baseSalary: 115000,
    hoursThisMonth: 162,
    deductions: 2700,
    bonus: 1500,
    vacationBalance: 10,
    sickBalance: 4,
    personalBalance: 3,
    usedLeaveThisYear: 2,
  },
  {
    id: "e7",
    name: "Lisa Park",
    initials: "LP",
    title: "Customer Success",
    department: "Operations",
    status: "On Leave",
    leaveNote: "back Jun 1",
    joined: "Jun 2024",
    email: "lisa@vyne.io",
    phone: "+1 (416) 555-0107",
    slack: "@lisa.p",
    reportsTo: "Preet Raval",
    avatarGradient: "linear-gradient(135deg,#F59E0B,#D97706)",
    baseSalary: 105000,
    hoursThisMonth: 80,
    deductions: 2400,
    bonus: 0,
    vacationBalance: 8,
    sickBalance: 3,
    personalBalance: 2,
    usedLeaveThisYear: 12,
  },
  {
    id: "e8",
    name: "Raj Patel",
    initials: "RP",
    title: "Data Engineer",
    department: "Engineering",
    status: "Active",
    joined: "Aug 2024",
    email: "raj@vyne.io",
    phone: "+1 (416) 555-0108",
    slack: "@raj.p",
    reportsTo: "Tony Martinez",
    avatarGradient: "linear-gradient(135deg,#8B5CF6,#7C3AED)",
    baseSalary: 118000,
    hoursThisMonth: 160,
    deductions: 2750,
    bonus: 1000,
    vacationBalance: 7,
    sickBalance: 5,
    personalBalance: 3,
    usedLeaveThisYear: 1,
  },
];

// ── Mock leave requests ──────────────────────────────────────────
export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: "lr1",
    employeeId: "e7",
    employeeName: "Lisa Park",
    type: "Vacation",
    dates: "Jun 1 \u2013 Jun 14",
    status: "Pending",
    reason: "Family vacation \u2014 pre-approved verbally",
  },
  {
    id: "lr2",
    employeeId: "e6",
    employeeName: "James Chen",
    type: "Sick",
    dates: "May 28",
    status: "Pending",
    reason: "Medical appointment",
  },
  {
    id: "lr3",
    employeeId: "e4",
    employeeName: "Alex Rhodes",
    type: "Personal",
    dates: "May 30",
    status: "Pending",
    reason: "Personal errand",
  },
];

// ── Employee modal mock docs ─────────────────────────────────────
export const MOCK_DOCS = [
  "Offer Letter \u2014 Jan 2024",
  "NDA Agreement \u2014 Jan 2024",
  "Performance Review Q1 2026",
];
