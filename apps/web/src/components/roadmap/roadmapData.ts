// ── Types ────────────────────────────────────────────────────────
export type RoadmapStatus =
  | "shipped"
  | "in-progress"
  | "planned"
  | "under-consideration";
export type Quarter = "Q1 2026" | "Q2 2026" | "Q3 2026" | "Q4 2026";
export type Module =
  | "Chat"
  | "Projects"
  | "Docs"
  | "ERP"
  | "AI"
  | "DevOps"
  | "Mobile"
  | "Platform";
export type Priority = "critical" | "high" | "medium" | "low";
export type ViewMode = "timeline" | "kanban" | "list";

export interface RoadmapFeature {
  id: string;
  title: string;
  description: string;
  fullDescription: string;
  module: Module;
  status: RoadmapStatus;
  priority: Priority;
  quarter: Quarter;
  votes: number;
  linkedIssues?: string[];
}

// ── Status config ────────────────────────────────────────────────
export const STATUS_CONFIG: Record<
  RoadmapStatus,
  { label: string; bg: string; color: string; dot: string; borderColor: string }
> = {
  shipped: {
    label: "Shipped",
    bg: "#F0FDF4",
    color: "#166534",
    dot: "#22C55E",
    borderColor: "#BBF7D0",
  },
  "in-progress": {
    label: "In Progress",
    bg: "#F0F0FF",
    color: "#5B21B6",
    dot: "#8B5CF6",
    borderColor: "#DDD6FE",
  },
  planned: {
    label: "Planned",
    bg: "var(--content-bg-secondary)",
    color: "#6B6B8A",
    dot: "#A0A0B8",
    borderColor: "var(--content-border)",
  },
  "under-consideration": {
    label: "Under Consideration",
    bg: "#FFFBEB",
    color: "#92400E",
    dot: "#F59E0B",
    borderColor: "#FDE68A",
  },
};

export const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; color: string }
> = {
  critical: { label: "Critical", color: "#EF4444" },
  high: { label: "High", color: "#F59E0B" },
  medium: { label: "Medium", color: "#3B82F6" },
  low: { label: "Low", color: "#A0A0B8" },
};

export const MODULE_COLORS: Record<Module, string> = {
  Chat: "#3B82F6",
  Projects: "var(--vyne-accent, #06B6D4)",
  Docs: "#EC4899",
  ERP: "#10B981",
  AI: "#F59E0B",
  DevOps: "#EF4444",
  Mobile: "var(--vyne-accent, #06B6D4)",
  Platform: "#8B5CF6",
};

export const ALL_MODULES: Module[] = [
  "Chat",
  "Projects",
  "Docs",
  "ERP",
  "AI",
  "DevOps",
  "Mobile",
  "Platform",
];
export const ALL_STATUSES: RoadmapStatus[] = [
  "shipped",
  "in-progress",
  "planned",
  "under-consideration",
];
export const ALL_QUARTERS: Quarter[] = [
  "Q1 2026",
  "Q2 2026",
  "Q3 2026",
  "Q4 2026",
];

// ── Roadmap, built in public ────────────────────────────────────
//
// This list mirrors what is actually running in the app today, what is
// being built, and what the team has committed to next. Everything is
// demo data until a "shipped" item is explicitly marked backed by a
// real backend. Early-beta interest counts, not marketing numbers.
export const FEATURES: RoadmapFeature[] = [
  // ── Q1 2026 — SHIPPED in this build ─────────────────────────
  {
    id: "rf-01",
    title: "Projects — Kanban, Tasks, Sub-tasks, Teams",
    module: "Projects",
    status: "shipped",
    priority: "critical",
    quarter: "Q1 2026",
    votes: 14,
    description:
      "Drag-and-drop board, custom statuses, custom fields, per-project boards.",
    fullDescription:
      "Full project workspace with an Odoo-style sub-nav (Projects / Tasks / Sub Tasks / Teams), drag-and-drop kanban with custom status columns you define yourself, per-task custom fields, sub-tasks, and a team directory. Data lives in browser localStorage today — the Supabase-backed version is on the next milestone.",
    linkedIssues: ["PROJ-kanban", "PROJ-custom-fields"],
  },
  {
    id: "rf-02",
    title: "Vyne AI — workspace-grounded chat",
    module: "AI",
    status: "shipped",
    priority: "critical",
    quarter: "Q1 2026",
    votes: 22,
    description:
      "Claude-powered chat grounded on your projects, tasks, CRM, ops, and invoices with citations.",
    fullDescription:
      "A chat surface branded as Vyne AI (not ChatGPT). Each answer is grounded on the workspace you actually have loaded: projects, tasks, CRM deals, ops products, invoices. Responses include [kind:id] citations that render as clickable teal pills linking directly to the underlying record. Falls back to deterministic local answers when ANTHROPIC_API_KEY is unset.",
    linkedIssues: ["AI-chat", "AI-citations"],
  },
  {
    id: "rf-03",
    title: "AI memory — brief, compass, streak, archive",
    module: "AI",
    status: "shipped",
    priority: "high",
    quarter: "Q1 2026",
    votes: 9,
    description:
      "Persistent AI memory with morning brief, weekly intention, streak-with-grace, ask-the-archive.",
    fullDescription:
      "Compound memory: every session and morning brief persists locally so the product becomes more valuable the longer you use it. Includes the Compass (weekly intention), a streak counter with a one-day grace per 7 days, and the Archive panel for searching past Q&A. Home page surfaces today's brief and any overdue tasks.",
    linkedIssues: ["AI-memory", "AI-archive"],
  },
  {
    id: "rf-04",
    title: "Block-based document editor",
    module: "Docs",
    status: "shipped",
    priority: "high",
    quarter: "Q1 2026",
    votes: 8,
    description:
      "Notion-style block editor with slash commands and nested pages.",
    fullDescription:
      "Rich block editor supporting text, headings, lists, code blocks, tables, images, and callouts. Slash command menu for quick block insertion and nested page hierarchy with breadcrumb navigation. Single-user today; real-time collaboration is in progress.",
    linkedIssues: ["DOCS-editor"],
  },
  {
    id: "rf-05",
    title: "Per-record activity feed",
    module: "Platform",
    status: "shipped",
    priority: "medium",
    quarter: "Q1 2026",
    votes: 6,
    description:
      "Every status change, assignment, and update appears in the record's own activity log.",
    fullDescription:
      "Scoped by (recordType, recordId) so a task, project, deal, contact, or invoice can subscribe to its own history without pulling the whole log. Renders rows like 'You moved VYNE-42 from Todo → In Progress · 3m ago'. Persisted to localStorage; server sync arrives with the backend.",
    linkedIssues: ["PLAT-activity"],
  },
  {
    id: "rf-06",
    title: "Roadmap, published",
    module: "Platform",
    status: "shipped",
    priority: "medium",
    quarter: "Q1 2026",
    votes: 4,
    description:
      "This page — built in public so customers can see exactly where VYNE is.",
    fullDescription:
      "Rather than hiding the roadmap behind a pitch deck, it's a first-class page in the product. Statuses are honest: 'shipped' means running right now in the build you're using, not announced-but-unbuilt. Feature requests land in /roadmap/request.",
  },

  // ── Q2 2026 — IN PROGRESS ───────────────────────────────────
  {
    id: "rf-07",
    title: "Supabase backend + real auth",
    module: "Platform",
    status: "in-progress",
    priority: "critical",
    quarter: "Q2 2026",
    votes: 18,
    description:
      "Move projects, tasks, CRM, and AI memory off localStorage to a real Postgres backend.",
    fullDescription:
      "Supabase-hosted Postgres with RLS, email/password auth, and server-side persistence for every store that is currently localStorage-only. This is the line between demo and real product — once it's live, teams can actually share a workspace.",
    linkedIssues: ["PLAT-supabase", "AUTH-real"],
  },
  {
    id: "rf-08",
    title: "Real-time chat (channels + DMs)",
    module: "Chat",
    status: "in-progress",
    priority: "critical",
    quarter: "Q2 2026",
    votes: 15,
    description:
      "Realtime channel messages, DMs, typing indicators, and unread counts.",
    fullDescription:
      "The /chat surface is currently a UI shell over fixtures. This ships the websocket-backed message bus, presence, typing indicators, unread counts, and @-mentions. Threaded replies and reactions ship alongside.",
    linkedIssues: ["CHAT-realtime"],
  },
  {
    id: "rf-09",
    title: "Real-time collaborative docs",
    module: "Docs",
    status: "in-progress",
    priority: "high",
    quarter: "Q2 2026",
    votes: 11,
    description: "Multiplayer editing with live cursors and offline-safe merge.",
    fullDescription:
      "CRDT-based collaboration (Yjs) so multiple people can edit the same doc without stepping on each other. Live cursor positions, awareness indicators, and conflict-free merging even with spotty connectivity.",
    linkedIssues: ["DOCS-multiplayer"],
  },
  {
    id: "rf-10",
    title: "Demo-data banners on every module",
    module: "Platform",
    status: "in-progress",
    priority: "medium",
    quarter: "Q2 2026",
    votes: 7,
    description:
      "Clear 'This is sample data — import yours' banners on CRM, Ops, Finance, HR.",
    fullDescription:
      "Every module that ships with seed fixtures gets a banner that says so explicitly, with a one-click path to import your own data or connect a source. Trust comes from being honest about what's real and what's demo.",
    linkedIssues: ["PLAT-demo-banner"],
  },

  // ── Q3 2026 — PLANNED ───────────────────────────────────────
  {
    id: "rf-11",
    title: "Real CRM pipeline",
    module: "ERP",
    status: "planned",
    priority: "critical",
    quarter: "Q3 2026",
    votes: 12,
    description:
      "Backed deal pipeline with stages, activities, and live forecasting.",
    fullDescription:
      "Promote the CRM shell to a real module: customizable pipeline stages, activity timeline per deal, probability-weighted forecasting, and email/call logging. Integrates with Vyne AI for instant 'what's at risk this quarter?' answers grounded on live deals.",
    linkedIssues: ["CRM-pipeline"],
  },
  {
    id: "rf-12",
    title: "Invoicing — send, track, get paid",
    module: "ERP",
    status: "planned",
    priority: "high",
    quarter: "Q3 2026",
    votes: 9,
    description:
      "Real invoice creation, PDF generation, email delivery, Stripe payment links.",
    fullDescription:
      "The current /invoicing page is a UI shell. This ships the full flow: create invoice from a deal or task, generate a PDF, send by email, accept payment via Stripe, and track status with reminders on overdue invoices.",
    linkedIssues: ["INV-real"],
  },
  {
    id: "rf-13",
    title: "ERP — inventory, POs, and receiving",
    module: "ERP",
    status: "planned",
    priority: "high",
    quarter: "Q3 2026",
    votes: 10,
    description:
      "Actual inventory tracking with purchase orders, stock movements, and supplier records.",
    fullDescription:
      "Products, stock levels, purchase orders, receiving, and stock movements — the operational core of the ERP surface. Vyne AI picks up this data automatically for 'what's low-stock?' and 'which supplier is slowest?' questions.",
    linkedIssues: ["ERP-core"],
  },
  {
    id: "rf-14",
    title: "HR — people, time off, onboarding",
    module: "ERP",
    status: "planned",
    priority: "medium",
    quarter: "Q3 2026",
    votes: 6,
    description:
      "Employee directory, time-off requests, onboarding checklists.",
    fullDescription:
      "HR module with employee profiles, org chart, leave request and approval workflows, and onboarding task templates. Self-service portal for employees to submit requests and view their own records.",
    linkedIssues: ["HR-core"],
  },
  {
    id: "rf-15",
    title: "Workflow automations from chat",
    module: "Chat",
    status: "planned",
    priority: "medium",
    quarter: "Q3 2026",
    votes: 8,
    description:
      "Slash commands like /approve-invoice or /assign @alex PROJ-42 run the action.",
    fullDescription:
      "Type /approve-invoice INV-123, /restock SKU-456, or /assign @alex PROJ-42 directly in chat. Vyne parses the command, executes it in the relevant module, and posts a rich card with the result. No context-switch needed.",
    linkedIssues: ["CHAT-commands"],
  },

  // ── Q4 2026 — UNDER CONSIDERATION ───────────────────────────
  {
    id: "rf-16",
    title: "Mobile app (iOS + Android)",
    module: "Mobile",
    status: "under-consideration",
    priority: "high",
    quarter: "Q4 2026",
    votes: 13,
    description: "Native-feeling app for chat, projects, and AI on the go.",
    fullDescription:
      "React Native app with offline message queue, push notifications, biometric sign-in, and deep-linking into any record. Prioritizing chat + projects + AI brief for v1 — ERP comes later.",
  },
  {
    id: "rf-17",
    title: "Multi-warehouse inventory",
    module: "ERP",
    status: "under-consideration",
    priority: "medium",
    quarter: "Q4 2026",
    votes: 5,
    description:
      "Location-aware stock, inter-warehouse transfers, barcode scanning.",
    fullDescription:
      "Warehouse-specific stock levels with transfer orders between locations, barcode-friendly pick flows, and consolidated cross-site reporting. Depends on the ERP core shipping first.",
  },
  {
    id: "rf-18",
    title: "AI meeting notes + action items",
    module: "AI",
    status: "under-consideration",
    priority: "medium",
    quarter: "Q4 2026",
    votes: 11,
    description:
      "Transcribe a call, generate a summary, and auto-create tasks.",
    fullDescription:
      "Join voice or video calls as a participant, transcribe in real time, summarize decisions, and create follow-up tasks in the right project with the right assignee. Ties into the memory store so 'what did we decide last Tuesday?' just works.",
  },
  {
    id: "rf-19",
    title: "Marketplace / integrations",
    module: "Platform",
    status: "under-consideration",
    priority: "medium",
    quarter: "Q4 2026",
    votes: 9,
    description: "Stripe, Shopify, QuickBooks, Google Calendar, Gmail, Slack.",
    fullDescription:
      "A curated set of integrations for the workflows that actually matter to SMBs: Stripe for payments, Shopify for e-commerce orders, QuickBooks for accounting sync, Gmail + Google Calendar for comms, and Slack for teams already living there.",
  },
  {
    id: "rf-20",
    title: "Field-level RBAC + audit log",
    module: "Platform",
    status: "under-consideration",
    priority: "medium",
    quarter: "Q4 2026",
    votes: 6,
    description:
      "Role-based access at the field level with a full audit log of who saw what.",
    fullDescription:
      "For teams that need it: permission rules per role, per team, and per field (hide salaries from non-HR, mask customer PII from engineering, etc). Every read and write is logged to an audit stream you can export.",
  },
  {
    id: "rf-21",
    title: "Custom branding / white-label",
    module: "Platform",
    status: "under-consideration",
    priority: "low",
    quarter: "Q4 2026",
    votes: 4,
    description:
      "Your logo, your colors, your domain — useful for agencies and resellers.",
    fullDescription:
      "Configure logo, color palette, custom domain, and branded email templates per workspace. Enables agencies and resellers to deliver a branded VYNE to their own clients.",
  },
];

// ── Competitor comparison data ──────────────────────────────────
export interface ComparisonFeature {
  feature: string;
  vyneUnique: boolean;
  vyne: boolean;
  slack: boolean;
  jira: boolean;
  notion: boolean;
  odoo: boolean;
  datadog: boolean;
}

export const COMPETITOR_DATA: ComparisonFeature[] = [
  {
    feature: "Real-time Team Chat",
    vyneUnique: false,
    vyne: true,
    slack: true,
    jira: false,
    notion: false,
    odoo: false,
    datadog: false,
  },
  {
    feature: "Project Management / Kanban",
    vyneUnique: false,
    vyne: true,
    slack: false,
    jira: true,
    notion: true,
    odoo: true,
    datadog: false,
  },
  {
    feature: "Collaborative Documents",
    vyneUnique: false,
    vyne: true,
    slack: false,
    jira: false,
    notion: true,
    odoo: false,
    datadog: false,
  },
  {
    feature: "ERP (Inventory, Orders, Finance)",
    vyneUnique: false,
    vyne: true,
    slack: false,
    jira: false,
    notion: false,
    odoo: true,
    datadog: false,
  },
  {
    feature: "Observability & Monitoring",
    vyneUnique: false,
    vyne: true,
    slack: false,
    jira: false,
    notion: false,
    odoo: false,
    datadog: true,
  },
  {
    feature: "CI/CD & Deployment Tracking",
    vyneUnique: false,
    vyne: true,
    slack: false,
    jira: false,
    notion: false,
    odoo: false,
    datadog: true,
  },
  {
    feature: "AI Thread Summaries (included)",
    vyneUnique: true,
    vyne: true,
    slack: false,
    jira: false,
    notion: true,
    odoo: false,
    datadog: false,
  },
  {
    feature: "AI Demand Forecasting",
    vyneUnique: true,
    vyne: true,
    slack: false,
    jira: false,
    notion: false,
    odoo: false,
    datadog: false,
  },
  {
    feature: "Cross-Module AI Correlation",
    vyneUnique: true,
    vyne: true,
    slack: false,
    jira: false,
    notion: false,
    odoo: false,
    datadog: false,
  },
  {
    feature: "Chat-to-ERP Slash Commands",
    vyneUnique: true,
    vyne: true,
    slack: false,
    jira: false,
    notion: false,
    odoo: false,
    datadog: false,
  },
  {
    feature: "Unified Search Across All Modules",
    vyneUnique: true,
    vyne: true,
    slack: true,
    jira: false,
    notion: true,
    odoo: false,
    datadog: false,
  },
  {
    feature: "Single Platform (No Integration Tax)",
    vyneUnique: true,
    vyne: true,
    slack: false,
    jira: false,
    notion: false,
    odoo: false,
    datadog: false,
  },
  {
    feature: "Mobile App (Chat + ERP + Projects)",
    vyneUnique: true,
    vyne: true,
    slack: true,
    jira: true,
    notion: true,
    odoo: true,
    datadog: true,
  },
  {
    feature: "White-Label / Custom Branding",
    vyneUnique: false,
    vyne: true,
    slack: false,
    jira: false,
    notion: false,
    odoo: true,
    datadog: false,
  },
];
