export const IS_DEMO_MODE = !process.env.NEXT_PUBLIC_API_URL;

// ── Types ────────────────────────────────────────────────────────
export type InsightSeverity = "red" | "yellow" | "green";

export interface Insight {
  id: string;
  icon: string;
  message: string;
  severity: InsightSeverity;
  href: string;
}

export interface AgentRun {
  id: string;
  type: string;
  trigger: string;
  status: "completed" | "running" | "failed";
  duration: string;
  startedAgo: string;
  summary: string;
}

export interface DelayedOrder {
  id: string;
  amount: number;
  daysLate: number;
}

export interface DataTableRow {
  [key: string]: string | number;
}

export interface DataTable {
  title: string;
  rows: DataTableRow[];
}

export interface TraceStep {
  step: string;
  note: string;
}

export interface QueryResult {
  query: string;
  answer: string;
  orders: DelayedOrder[];
  sources: string;
  followUps: string[];
  timestamp: string;
  data_tables?: DataTable[];
  trace?: TraceStep[];
  agent?: string;
}

// ── Mock data ────────────────────────────────────────────────────

export const INSIGHTS: Insight[] = [
  {
    id: "i1",
    icon: "\ud83d\udd34",
    message: "3 invoices overdue totaling $8,400 \u2014 oldest is 45 days",
    severity: "red",
    href: "/finance",
  },
  {
    id: "i2",
    icon: "\ud83d\udfe1",
    message:
      "PWR-003 (Power Adapter) will stock out in ~4 days at current sales rate",
    severity: "yellow",
    href: "/ops",
  },
  {
    id: "i3",
    icon: "\ud83d\udfe1",
    message:
      "api-service deployment success rate dropped to 60% this week (was 94%)",
    severity: "yellow",
    href: "/code",
  },
  {
    id: "i4",
    icon: "\ud83d\udfe2",
    message:
      "Revenue up 23% vs last month \u2014 driven by ManuCo deal ($156K)",
    severity: "green",
    href: "/finance",
  },
  {
    id: "i5",
    icon: "\ud83d\udd34",
    message: "47 orders stuck in processing since last deployment failure",
    severity: "red",
    href: "/ops",
  },
  {
    id: "i6",
    icon: "\ud83d\udfe1",
    message:
      "Sarah K. hasn't updated ENG-43 in 6 days \u2014 sprint deadline tomorrow",
    severity: "yellow",
    href: "/projects",
  },
  {
    id: "i7",
    icon: "\ud83d\udfe2",
    message: "Supplier response time improved: avg 1.2 days (was 3.4 days)",
    severity: "green",
    href: "/ops",
  },
];

export const AGENT_RUNS: AgentRun[] = [
  {
    id: "ar1",
    type: "Incident Investigation",
    trigger: "deployment-failed event",
    status: "completed",
    duration: "8.2s",
    startedAgo: "7min ago",
    summary:
      "IAM permission missing on api-service. 47 orders impacted. Rollback recommended.",
  },
  {
    id: "ar2",
    type: "Stock Reorder Check",
    trigger: "scheduled (daily)",
    status: "completed",
    duration: "3.1s",
    startedAgo: "2h ago",
    summary:
      "PWR-003 below threshold. Draft PO created for 500 units from Supplier #2.",
  },
  {
    id: "ar3",
    type: "Meeting Summary",
    trigger: "calendar event",
    status: "completed",
    duration: "4.7s",
    startedAgo: "5h ago",
    summary:
      "Sprint review: 27/35 points complete. 3 action items created in Projects.",
  },
  {
    id: "ar4",
    type: "Anomaly Detection",
    trigger: "metrics spike",
    status: "running",
    duration: "\u2014",
    startedAgo: "1min ago",
    summary: "Analyzing unusual traffic pattern on auth-service...",
  },
  {
    id: "ar5",
    type: "Demand Forecast",
    trigger: "scheduled (weekly)",
    status: "completed",
    duration: "12.3s",
    startedAgo: "1d ago",
    summary: "Q2 inventory needs updated. Top 3 items flagged for pre-order.",
  },
];

export const PRELOADED_RESULT: QueryResult = {
  query: "Which orders are delayed?",
  answer:
    "Found 3 delayed orders totaling $34,200. All delayed due to supplier fulfillment issues with PWR-003 component.",
  orders: [
    { id: "ORD-001", amount: 12400, daysLate: 3 },
    { id: "ORD-007", amount: 8900, daysLate: 1 },
    { id: "ORD-012", amount: 12900, daysLate: 5 },
  ],
  sources:
    "From: Orders module (3 records) \u00b7 Inventory module (1 product)",
  followUps: [
    "Why are these delayed?",
    "Contact suppliers",
    "View all open orders",
  ],
  timestamp: "just now",
};

export const SUGGESTED_QUERIES = [
  "Which invoices are overdue?",
  "Show low stock items",
  "What caused last week's incident?",
  "Top 5 deals by value",
  "Which orders are delayed?",
  "Team sprint velocity",
  "Revenue this month vs last",
  "Services with degraded health",
];
