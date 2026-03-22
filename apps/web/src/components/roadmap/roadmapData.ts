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
    bg: "#F8F8FC",
    color: "#6B6B8A",
    dot: "#A0A0B8",
    borderColor: "#E8E8F0",
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
  Projects: "#6C47FF",
  Docs: "#EC4899",
  ERP: "#10B981",
  AI: "#F59E0B",
  DevOps: "#EF4444",
  Mobile: "#06B6D4",
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

// ── Mock features (24 total) ────────────────────────────────────
export const FEATURES: RoadmapFeature[] = [
  // ── Q1 2026 ─────────────────────────────────────────────────
  {
    id: "rf-01",
    title: "AI Thread Summaries",
    module: "Chat",
    status: "shipped",
    priority: "critical",
    quarter: "Q1 2026",
    votes: 284,
    description: "Auto-summarize long chat threads with one click.",
    fullDescription:
      "AI-powered thread summarization that condenses long conversations into key points, decisions, and action items. Supports 20+ languages and works across channels and DMs. Summaries are cached and update as new messages arrive.",
    linkedIssues: ["CHAT-142", "CHAT-155", "AI-034"],
  },
  {
    id: "rf-02",
    title: "Kanban Board with Sprints",
    module: "Projects",
    status: "shipped",
    priority: "critical",
    quarter: "Q1 2026",
    votes: 312,
    description: "Full Kanban board with drag-and-drop and sprint management.",
    fullDescription:
      "Complete project management with Kanban boards, sprint planning, velocity tracking, and burndown charts. Supports custom columns, WIP limits, and swimlanes. Integrates with Git for auto-linking commits to issues.",
    linkedIssues: ["PROJ-089", "PROJ-102"],
  },
  {
    id: "rf-03",
    title: "Block-based Document Editor",
    module: "Docs",
    status: "shipped",
    priority: "critical",
    quarter: "Q1 2026",
    votes: 267,
    description:
      "Notion-style block editor with slash commands and nested pages.",
    fullDescription:
      "Rich block editor supporting text, headings, lists, code blocks, tables, images, embeds, and callouts. Slash command menu for quick block insertion. Nested page hierarchy with breadcrumb navigation. Auto-save with version history.",
    linkedIssues: ["DOCS-001", "DOCS-018"],
  },
  {
    id: "rf-04",
    title: "ERP-Connected Chat Alerts",
    module: "Chat",
    status: "shipped",
    priority: "high",
    quarter: "Q1 2026",
    votes: 198,
    description:
      "Low stock, overdue invoices, and delayed orders post to channels automatically.",
    fullDescription:
      "Smart notifications that bridge ERP events and chat. Configurable triggers for inventory thresholds, payment due dates, and shipment delays. Messages include actionable buttons for quick response directly from chat.",
    linkedIssues: ["CHAT-201", "ERP-067"],
  },
  {
    id: "rf-05",
    title: "Deployment Tracking Dashboard",
    module: "DevOps",
    status: "shipped",
    priority: "high",
    quarter: "Q1 2026",
    votes: 156,
    description: "Track deployments, rollbacks, and CI/CD pipeline status.",
    fullDescription:
      "Centralized view of all deployments across environments. Tracks build times, success rates, rollback frequency, and deployment frequency (DORA metrics). Integrates with GitHub Actions, GitLab CI, and Jenkins.",
    linkedIssues: ["DEV-044"],
  },
  {
    id: "rf-06",
    title: "Mobile App (iOS + Android)",
    module: "Mobile",
    status: "shipped",
    priority: "critical",
    quarter: "Q1 2026",
    votes: 341,
    description: "React Native app with Chat, Projects, and Home modules.",
    fullDescription:
      "Full-featured mobile app built with React Native and Expo. Supports push notifications, offline message queue, biometric authentication, and deep linking. Available on both iOS and Android app stores.",
    linkedIssues: ["MOB-001", "MOB-022", "MOB-035"],
  },

  // ── Q2 2026 ─────────────────────────────────────────────────
  {
    id: "rf-07",
    title: "Real-time Collaborative Docs",
    module: "Docs",
    status: "in-progress",
    priority: "critical",
    quarter: "Q2 2026",
    votes: 389,
    description: "Google Docs-style multiplayer editing with live cursors.",
    fullDescription:
      "CRDT-based real-time collaboration powered by Yjs. Multiple users can edit simultaneously with live cursor positions and awareness indicators. Conflict-free merging ensures no data loss even with poor connectivity.",
    linkedIssues: ["DOCS-045", "DOCS-048", "DOCS-052"],
  },
  {
    id: "rf-08",
    title: "AI Demand Forecasting",
    module: "AI",
    status: "in-progress",
    priority: "critical",
    quarter: "Q2 2026",
    votes: 274,
    description:
      "Predict inventory needs based on sales patterns and seasonality.",
    fullDescription:
      "Machine learning model trained on historical sales data, seasonal trends, and lead times to predict optimal reorder points. Generates automatic purchase order suggestions. Integrates with supplier lead time data for accuracy.",
    linkedIssues: ["AI-055", "ERP-112"],
  },
  {
    id: "rf-09",
    title: "LangGraph Multi-step AI Agents",
    module: "AI",
    status: "in-progress",
    priority: "critical",
    quarter: "Q2 2026",
    votes: 302,
    description:
      "Autonomous agents that investigate incidents and automate workflows.",
    fullDescription:
      "Agentic AI system built on LangGraph that can chain multiple tools: query databases, read logs, check inventory, send messages, and create issues. Agents can investigate production incidents end-to-end and suggest remediations.",
    linkedIssues: ["AI-060", "AI-062", "AI-065"],
  },
  {
    id: "rf-10",
    title: "Supplier Portal",
    module: "ERP",
    status: "in-progress",
    priority: "high",
    quarter: "Q2 2026",
    votes: 187,
    description:
      "External supplier login to confirm POs and update delivery status.",
    fullDescription:
      "White-labeled portal for suppliers to view and confirm purchase orders, update shipment tracking, upload invoices, and communicate with procurement teams. Reduces manual email-based coordination by 80%.",
    linkedIssues: ["ERP-134", "ERP-138"],
  },
  {
    id: "rf-11",
    title: "Huddles / Voice Calls",
    module: "Chat",
    status: "in-progress",
    priority: "critical",
    quarter: "Q2 2026",
    votes: 356,
    description: "One-click voice and video calls within channels and DMs.",
    fullDescription:
      "WebRTC-based voice and video calling built directly into chat. Supports huddles (always-on voice rooms), scheduled calls, screen sharing, and recording. No external meeting links needed.",
    linkedIssues: ["CHAT-220", "CHAT-225"],
  },

  // ── Q3 2026 ─────────────────────────────────────────────────
  {
    id: "rf-12",
    title: "Multi-warehouse Support",
    module: "ERP",
    status: "planned",
    priority: "high",
    quarter: "Q3 2026",
    votes: 223,
    description:
      "Track inventory across multiple locations with inter-warehouse transfers.",
    fullDescription:
      "Multi-location inventory management with warehouse-specific stock levels, inter-warehouse transfer orders, location-based picking, and consolidated reporting. Supports barcode scanning for warehouse operations.",
    linkedIssues: ["ERP-150"],
  },
  {
    id: "rf-13",
    title: "CRM Pipeline",
    module: "ERP",
    status: "planned",
    priority: "critical",
    quarter: "Q3 2026",
    votes: 298,
    description:
      "Sales pipeline with lead scoring, deal tracking, and forecasting.",
    fullDescription:
      "Full CRM module with customizable pipeline stages, lead scoring based on engagement signals, deal probability forecasting, and activity tracking. Integrates with chat for instant customer communication and with docs for proposal management.",
    linkedIssues: ["ERP-160", "ERP-162"],
  },
  {
    id: "rf-14",
    title: "AI Business Intelligence",
    module: "AI",
    status: "planned",
    priority: "critical",
    quarter: "Q3 2026",
    votes: 334,
    description: "Natural language queries across all business data.",
    fullDescription:
      'Ask questions like "Which customers are at churn risk?" or "What caused the Q2 revenue drop?" and get instant answers with visualizations. Queries span ERP, Projects, Chat, and DevOps data for truly cross-functional insights.',
    linkedIssues: ["AI-080"],
  },
  {
    id: "rf-15",
    title: "Workflow Automation from Chat",
    module: "Chat",
    status: "planned",
    priority: "high",
    quarter: "Q3 2026",
    votes: 245,
    description: "Slash commands in chat that trigger ERP actions directly.",
    fullDescription:
      "Type /approve-order ORD-123, /restock SKU-456, or /close-issue PROJ-89 directly in chat. VYNE parses the command, executes the action in the relevant module, and confirms with a rich card response. No context switching needed.",
    linkedIssues: ["CHAT-240", "ERP-170"],
  },
  {
    id: "rf-16",
    title: "HR Module",
    module: "ERP",
    status: "planned",
    priority: "high",
    quarter: "Q3 2026",
    votes: 178,
    description:
      "Employee directory, org chart, leave management, and onboarding.",
    fullDescription:
      "Complete HR management with employee profiles, department org charts, leave request and approval workflows, onboarding task checklists, and employee self-service portal. Integrates with payroll for seamless compensation management.",
    linkedIssues: ["ERP-180"],
  },
  {
    id: "rf-17",
    title: "Cross-Module AI Correlation Engine",
    module: "AI",
    status: "planned",
    priority: "critical",
    quarter: "Q3 2026",
    votes: 312,
    description:
      "Connect deployment failures to stuck orders and revenue impact.",
    fullDescription:
      'The crown jewel of VYNE AI. Correlates events across all modules: "Deployment v2.3.1 failed at 14:22 -> API gateway returned 503 -> 47 orders stuck in processing -> $12,400 estimated revenue at risk -> Auto-notified on-call engineer." No other platform does this.',
    linkedIssues: ["AI-090", "AI-092", "DEV-088"],
  },

  // ── Q4 2026 ─────────────────────────────────────────────────
  {
    id: "rf-18",
    title: "Customer Portal",
    module: "ERP",
    status: "under-consideration",
    priority: "high",
    quarter: "Q4 2026",
    votes: 167,
    description: "Branded portal for customers to track orders and invoices.",
    fullDescription:
      "White-labeled customer-facing portal where end customers can track order status, view and pay invoices, submit support tickets, and access product documentation. Fully customizable with company branding.",
  },
  {
    id: "rf-19",
    title: "White-Label / Custom Branding",
    module: "Platform",
    status: "under-consideration",
    priority: "critical",
    quarter: "Q4 2026",
    votes: 256,
    description:
      "Full white-label SaaS with custom logos, colors, and domains.",
    fullDescription:
      "Each customer org can configure their own logo, color palette, custom domain, and email templates. Enables VYNE resellers and agencies to offer branded versions. Includes custom login pages and onboarding flows.",
  },
  {
    id: "rf-20",
    title: "Marketplace / App Store",
    module: "Platform",
    status: "under-consideration",
    priority: "high",
    quarter: "Q4 2026",
    votes: 234,
    description:
      "Third-party integrations: Stripe, Shopify, Amazon, QuickBooks.",
    fullDescription:
      "Plugin marketplace for third-party integrations. Launch partners include Stripe (payments), Shopify (e-commerce sync), Amazon (FBA integration), QuickBooks (accounting sync), and WooCommerce (orders). SDK available for custom integrations.",
  },
  {
    id: "rf-21",
    title: "AI Meeting Notes + Action Items",
    module: "AI",
    status: "under-consideration",
    priority: "high",
    quarter: "Q4 2026",
    votes: 289,
    description:
      "Auto-transcribe calls, summarize, and create tasks from meetings.",
    fullDescription:
      "Joins voice/video calls as a bot, transcribes in real-time, generates meeting summaries, extracts action items, and auto-creates tasks in Projects. Supports follow-up reminders and meeting analytics dashboard.",
  },
  {
    id: "rf-22",
    title: "Subscription Billing",
    module: "ERP",
    status: "under-consideration",
    priority: "medium",
    quarter: "Q4 2026",
    votes: 145,
    description:
      "Recurring invoices, subscription plans, and dunning management.",
    fullDescription:
      "Manage subscription-based revenue with plan creation, trial periods, proration, dunning emails for failed payments, and revenue recognition reports. Integrates with Stripe for payment processing.",
  },
  {
    id: "rf-23",
    title: "External Guest Access",
    module: "Chat",
    status: "under-consideration",
    priority: "medium",
    quarter: "Q4 2026",
    votes: 198,
    description: "Invite external companies to shared channels.",
    fullDescription:
      "Slack Connect equivalent allowing organizations to create shared channels with suppliers, clients, and agencies. Includes granular permissions, message retention policies, and compliance controls for external communications.",
  },
  {
    id: "rf-24",
    title: "Granular RBAC + Field-Level Permissions",
    module: "Platform",
    status: "under-consideration",
    priority: "high",
    quarter: "Q4 2026",
    votes: 203,
    description: "Control who sees what fields, records, and modules per role.",
    fullDescription:
      "Enterprise-grade role-based access control with field-level visibility rules. Configure permissions per role, team, or individual. Supports data masking for sensitive fields like salary, pricing, and customer data.",
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
