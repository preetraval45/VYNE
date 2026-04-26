// IS_DEMO_MODE is re-exported from ./home to avoid duplicate exports

// ── Types ────────────────────────────────────────────────────────
export type Stage =
  | "Lead"
  | "Qualified"
  | "Proposal"
  | "Negotiation"
  | "Won"
  | "Lost";
export type Source = "website" | "referral" | "outbound" | "inbound";

export interface Deal {
  id: string;
  company: string;
  contactName: string;
  email: string;
  stage: Stage;
  value: number;
  probability: number;
  assignee: string;
  lastActivity: string;
  nextAction: string;
  source: Source;
  notes: string;
  /**
   * Per-deal values for admin-defined custom fields (configured via the
   * top-bar wrench → Customize → CRM module). Keyed by the field id from
   * useCustomFieldsStore.schemas.crm.fields. Stays optional so existing
   * mock data without it remains valid.
   */
  customFields?: Record<string, string>;
}

// ── Mock Data ────────────────────────────────────────────────────
const NOW = Date.now();
const daysAgo = (d: number) => new Date(NOW - d * 86400000).toISOString();

export const INITIAL_DEALS: Deal[] = [
  {
    id: "d1",
    company: "Acme Corp",
    contactName: "Sarah Johnson",
    email: "sarah@acme.com",
    stage: "Lead",
    value: 45000,
    probability: 15,
    assignee: "Alex",
    lastActivity: daysAgo(2),
    nextAction: "Send intro email",
    source: "website",
    notes: "Found us via blog post. Interested in enterprise plan.",
  },
  {
    id: "d2",
    company: "TechStart Inc",
    contactName: "Marcus Chen",
    email: "marcus@techstart.io",
    stage: "Qualified",
    value: 120000,
    probability: 35,
    assignee: "Priya",
    lastActivity: daysAgo(5),
    nextAction: "Discovery call scheduled",
    source: "referral",
    notes: "Referred by CloudOps team. Strong budget signal.",
  },
  {
    id: "d3",
    company: "Global Retail",
    contactName: "Emma Davis",
    email: "emma@globalretail.com",
    stage: "Proposal",
    value: 28000,
    probability: 55,
    assignee: "Alex",
    lastActivity: daysAgo(1),
    nextAction: "Follow up on proposal doc",
    source: "inbound",
    notes: "Sent proposal v2 last week. Awaiting procurement review.",
  },
  {
    id: "d4",
    company: "DataFlow Ltd",
    contactName: "James Wilson",
    email: "james@dataflow.co",
    stage: "Negotiation",
    value: 89000,
    probability: 75,
    assignee: "Sam",
    lastActivity: daysAgo(10),
    nextAction: "Counter-proposal on pricing",
    source: "outbound",
    notes: "Pushing back on contract length. Flexible on price.",
  },
  {
    id: "d5",
    company: "ManuCo",
    contactName: "Olivia Park",
    email: "olivia@manuco.com",
    stage: "Won",
    value: 156000,
    probability: 100,
    assignee: "Priya",
    lastActivity: daysAgo(3),
    nextAction: "Kick off onboarding",
    source: "referral",
    notes: "Signed 2-year contract. Champion is VP of Ops.",
  },
  {
    id: "d6",
    company: "RetailPlus",
    contactName: "Dan Nguyen",
    email: "dan@retailplus.com",
    stage: "Lost",
    value: 34000,
    probability: 0,
    assignee: "Alex",
    lastActivity: daysAgo(14),
    nextAction: "Re-engage in Q3",
    source: "outbound",
    notes: "Went with competitor. Price was the main objection.",
  },
  {
    id: "d7",
    company: "FinServe",
    contactName: "Clara Osei",
    email: "clara@finserve.com",
    stage: "Proposal",
    value: 67000,
    probability: 60,
    assignee: "Sam",
    lastActivity: daysAgo(4),
    nextAction: "Legal review of MSA",
    source: "inbound",
    notes: "Compliance team involved. Slow moving but committed.",
  },
  {
    id: "d8",
    company: "CloudOps",
    contactName: "Ryan Torres",
    email: "ryan@cloudops.dev",
    stage: "Negotiation",
    value: 200000,
    probability: 80,
    assignee: "Priya",
    lastActivity: daysAgo(8),
    nextAction: "Final pricing call",
    source: "referral",
    notes: "Largest deal in pipeline. Executive sponsor confirmed.",
  },
];

export const STAGES: Stage[] = [
  "Lead",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
];
export const ASSIGNEES = ["Alex", "Priya", "Sam"];
export const SOURCES: Source[] = ["website", "referral", "outbound", "inbound"];

// ── Deal detail mock activities ───────────────────────────────────
export interface MockActivity {
  time: string;
  text: string;
}

export const MOCK_ACTIVITIES: MockActivity[] = [
  {
    time: daysAgo(1),
    text: "Discovery call completed \u2014 strong interest in analytics features",
  },
  { time: daysAgo(4), text: "Proposal document sent via email" },
  { time: daysAgo(9), text: "Initial outreach \u2014 left voicemail" },
  { time: daysAgo(12), text: "Lead created from website form submission" },
];
