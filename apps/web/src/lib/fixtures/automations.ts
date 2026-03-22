export const IS_DEMO_MODE = !process.env.NEXT_PUBLIC_API_URL;

// ── Types ────────────────────────────────────────────────────────
export type AutomationStatus = "active" | "paused" | "draft";
export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "greater_than"
  | "less_than";
export type LogicOp = "AND" | "OR";

export interface RunHistoryEntry {
  id: string;
  timestamp: string;
  status: "success" | "failed" | "skipped";
  duration: string;
  recordsAffected: number;
}

export interface Condition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: string;
}

export interface ActionConfig {
  field1Label: string;
  field1Value: string;
  field2Label?: string;
  field2Value?: string;
}

export interface AutomationAction {
  id: string;
  type: string;
  config: ActionConfig;
}

export interface Automation {
  id: string;
  name: string;
  status: AutomationStatus;
  triggerType: string;
  triggerSummary: string;
  triggerConfig: Record<string, string>;
  conditions: Condition[];
  conditionLogic: LogicOp;
  actions: AutomationAction[];
  runCount: number;
  lastRun: string;
  history: RunHistoryEntry[];
}

// ── Helpers ──────────────────────────────────────────────────────
const NOW = Date.now();
const minsAgo = (m: number) => new Date(NOW - m * 60000).toISOString();
const hoursAgo = (h: number) => new Date(NOW - h * 3600000).toISOString();
const daysAgo = (d: number) => new Date(NOW - d * 86400000).toISOString();

function makeHistory(count: number, baseOffset: number): RunHistoryEntry[] {
  const statuses: Array<"success" | "failed" | "skipped"> = [
    "success",
    "success",
    "success",
    "success",
    "failed",
    "skipped",
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: `h-${baseOffset}-${i}`,
    timestamp: hoursAgo(baseOffset + i * 3),
    status: statuses[i % statuses.length],
    duration: `${Math.floor(Math.random() * 900 + 100)}ms`,
    recordsAffected: Math.floor(Math.random() * 5 + 1),
  }));
}

// ── Mock Data ────────────────────────────────────────────────────
export const INITIAL_AUTOMATIONS: Automation[] = [
  {
    id: "auto-1",
    name: "Deal Won \u2192 Create Sales Order",
    status: "active",
    triggerType: "crm_deal_won_lost",
    triggerSummary: "CRM: Deal Won/Lost",
    triggerConfig: { outcome: "Won", pipeline: "Main Pipeline" },
    conditions: [
      {
        id: "c1a",
        field: "deal.value",
        operator: "greater_than",
        value: "5000",
      },
    ],
    conditionLogic: "AND",
    actions: [
      {
        id: "a1a",
        type: "erp_create_sales_order",
        config: {
          field1Label: "Order Template",
          field1Value: "Standard B2B",
          field2Label: "Priority",
          field2Value: "High",
        },
      },
      {
        id: "a1b",
        type: "chat_post_channel",
        config: {
          field1Label: "Channel",
          field1Value: "#sales-wins",
          field2Label: "Message",
          field2Value: "New deal closed: {{deal.name}} for {{deal.value}}",
        },
      },
    ],
    runCount: 47,
    lastRun: minsAgo(38),
    history: makeHistory(10, 1),
  },
  {
    id: "auto-2",
    name: "Low Stock Alert \u2192 Slack Notify",
    status: "active",
    triggerType: "erp_low_stock",
    triggerSummary: "ERP: Low Stock",
    triggerConfig: { threshold: "20", warehouseFilter: "All Warehouses" },
    conditions: [
      {
        id: "c2a",
        field: "product.category",
        operator: "not_equals",
        value: "archived",
      },
    ],
    conditionLogic: "AND",
    actions: [
      {
        id: "a2a",
        type: "chat_post_channel",
        config: {
          field1Label: "Channel",
          field1Value: "#inventory-alerts",
          field2Label: "Message",
          field2Value:
            "Low stock: {{product.name}} \u2014 {{product.stock}} units left",
        },
      },
    ],
    runCount: 203,
    lastRun: minsAgo(12),
    history: makeHistory(10, 2),
  },
  {
    id: "auto-3",
    name: "New Lead \u2192 Assign to Sales Team",
    status: "active",
    triggerType: "crm_lead_created",
    triggerSummary: "CRM: Lead Created",
    triggerConfig: { source: "Any", assignmentRule: "Round Robin" },
    conditions: [],
    conditionLogic: "AND",
    actions: [
      {
        id: "a3a",
        type: "crm_assign_lead",
        config: {
          field1Label: "Team",
          field1Value: "Sales Team",
          field2Label: "Rule",
          field2Value: "Round Robin",
        },
      },
      {
        id: "a3b",
        type: "chat_send_dm",
        config: {
          field1Label: "Recipient",
          field1Value: "{{assigned_user}}",
          field2Label: "Message",
          field2Value: "New lead assigned: {{lead.name}} from {{lead.company}}",
        },
      },
    ],
    runCount: 89,
    lastRun: hoursAgo(2),
    history: makeHistory(10, 3),
  },
  {
    id: "auto-4",
    name: "Invoice Overdue \u2192 Send Reminder",
    status: "active",
    triggerType: "erp_invoice_overdue",
    triggerSummary: "ERP: Invoice Overdue",
    triggerConfig: { daysOverdue: "7", reminderTemplate: "Friendly Reminder" },
    conditions: [
      {
        id: "c4a",
        field: "invoice.amount",
        operator: "greater_than",
        value: "500",
      },
    ],
    conditionLogic: "AND",
    actions: [
      {
        id: "a4a",
        type: "email_send",
        config: {
          field1Label: "Template",
          field1Value: "Invoice Overdue Reminder",
          field2Label: "CC",
          field2Value: "finance@company.com",
        },
      },
    ],
    runCount: 15,
    lastRun: hoursAgo(6),
    history: makeHistory(10, 4),
  },
  {
    id: "auto-5",
    name: "PR Merged \u2192 Update Ticket Status",
    status: "paused",
    triggerType: "projects_pr_merged",
    triggerSummary: "Projects: PR Merged",
    triggerConfig: { branch: "main", requireLinkedTicket: "true" },
    conditions: [
      { id: "c5a", field: "pr.title", operator: "contains", value: "ENG-" },
    ],
    conditionLogic: "AND",
    actions: [
      {
        id: "a5a",
        type: "projects_update_issue_status",
        config: {
          field1Label: "New Status",
          field1Value: "Done",
          field2Label: "Comment",
          field2Value: "Resolved via PR #{{pr.number}}",
        },
      },
    ],
    runCount: 34,
    lastRun: daysAgo(3),
    history: makeHistory(10, 5),
  },
  {
    id: "auto-6",
    name: "Expense Approved \u2192 Sync to Finance",
    status: "active",
    triggerType: "erp_po_approved",
    triggerSummary: "ERP: PO Approved",
    triggerConfig: { approvalLevel: "Manager", category: "All" },
    conditions: [
      {
        id: "c6a",
        field: "expense.amount",
        operator: "greater_than",
        value: "100",
      },
    ],
    conditionLogic: "AND",
    actions: [
      {
        id: "a6a",
        type: "erp_create_invoice",
        config: {
          field1Label: "Ledger",
          field1Value: "Expenses",
          field2Label: "Auto-reconcile",
          field2Value: "true",
        },
      },
      {
        id: "a6b",
        type: "hr_send_notification",
        config: {
          field1Label: "Notify",
          field1Value: "{{submitter}}",
          field2Label: "Message",
          field2Value: "Your expense has been synced to finance",
        },
      },
    ],
    runCount: 28,
    lastRun: hoursAgo(14),
    history: makeHistory(10, 6),
  },
  {
    id: "auto-7",
    name: "Employee Onboarded \u2192 Create Accounts",
    status: "draft",
    triggerType: "hr_employee_onboarded",
    triggerSummary: "HR: Employee Onboarded",
    triggerConfig: { department: "Any", startDateOffset: "0" },
    conditions: [],
    conditionLogic: "AND",
    actions: [
      {
        id: "a7a",
        type: "hr_create_onboarding_task",
        config: {
          field1Label: "Template",
          field1Value: "Standard Onboarding",
          field2Label: "Assign To",
          field2Value: "HR Team",
        },
      },
      {
        id: "a7b",
        type: "chat_post_channel",
        config: {
          field1Label: "Channel",
          field1Value: "#general",
          field2Label: "Message",
          field2Value: "Welcome {{employee.name}} to the team!",
        },
      },
    ],
    runCount: 0,
    lastRun: "",
    history: [],
  },
  {
    id: "auto-8",
    name: "Support Ticket \u2192 Create Issue",
    status: "active",
    triggerType: "chat_message_in_channel",
    triggerSummary: "Chat: Message in Channel",
    triggerConfig: { channel: "#support", keyword: "/ticket" },
    conditions: [
      {
        id: "c8a",
        field: "message.priority",
        operator: "equals",
        value: "urgent",
      },
    ],
    conditionLogic: "OR",
    actions: [
      {
        id: "a8a",
        type: "projects_create_issue",
        config: {
          field1Label: "Project",
          field1Value: "Support Board",
          field2Label: "Priority",
          field2Value: "{{message.priority}}",
        },
      },
      {
        id: "a8b",
        type: "chat_post_channel",
        config: {
          field1Label: "Channel",
          field1Value: "#engineering",
          field2Label: "Message",
          field2Value: "New support ticket escalated: {{issue.title}}",
        },
      },
    ],
    runCount: 112,
    lastRun: minsAgo(5),
    history: makeHistory(10, 8),
  },
];

// ── Lookup tables ────────────────────────────────────────────────
export const TRIGGER_GROUPS: Array<{
  group: string;
  options: Array<{ value: string; label: string }>;
}> = [
  {
    group: "CRM",
    options: [
      { value: "crm_deal_stage_changed", label: "Deal Stage Changed" },
      { value: "crm_lead_created", label: "Lead Created" },
      { value: "crm_deal_won_lost", label: "Deal Won/Lost" },
    ],
  },
  {
    group: "ERP",
    options: [
      { value: "erp_low_stock", label: "Low Stock" },
      { value: "erp_order_created", label: "Order Created" },
      { value: "erp_invoice_overdue", label: "Invoice Overdue" },
      { value: "erp_po_approved", label: "PO Approved" },
    ],
  },
  {
    group: "Projects",
    options: [
      { value: "projects_issue_status_changed", label: "Issue Status Changed" },
      { value: "projects_pr_merged", label: "PR Merged" },
      { value: "projects_deployment_failed", label: "Deployment Failed" },
    ],
  },
  {
    group: "HR",
    options: [
      { value: "hr_employee_onboarded", label: "Employee Onboarded" },
      { value: "hr_leave_approved", label: "Leave Approved" },
      { value: "hr_payroll_run", label: "Payroll Run" },
    ],
  },
  {
    group: "Chat",
    options: [
      { value: "chat_message_in_channel", label: "Message in Channel" },
      { value: "chat_command_used", label: "Command Used" },
    ],
  },
  {
    group: "Schedule",
    options: [
      { value: "schedule_daily", label: "Daily at Time" },
      { value: "schedule_weekly", label: "Weekly" },
      { value: "schedule_monthly", label: "Monthly" },
    ],
  },
];

export const ACTION_GROUPS: Array<{
  group: string;
  options: Array<{ value: string; label: string }>;
}> = [
  {
    group: "Chat",
    options: [
      { value: "chat_post_channel", label: "Post to Channel" },
      { value: "chat_send_dm", label: "Send DM" },
      { value: "chat_post_command_result", label: "Post Command Result" },
    ],
  },
  {
    group: "ERP",
    options: [
      { value: "erp_create_sales_order", label: "Create Sales Order" },
      { value: "erp_update_stock", label: "Update Stock" },
      { value: "erp_create_invoice", label: "Create Invoice" },
    ],
  },
  {
    group: "CRM",
    options: [
      { value: "crm_update_stage", label: "Update Stage" },
      { value: "crm_assign_lead", label: "Assign Lead" },
      { value: "crm_create_deal", label: "Create Deal" },
    ],
  },
  {
    group: "Projects",
    options: [
      { value: "projects_create_issue", label: "Create Issue" },
      { value: "projects_update_issue_status", label: "Update Issue Status" },
      { value: "projects_assign_issue", label: "Assign Issue" },
    ],
  },
  {
    group: "HR",
    options: [
      { value: "hr_send_notification", label: "Send Notification" },
      { value: "hr_create_onboarding_task", label: "Create Onboarding Task" },
    ],
  },
  {
    group: "Email",
    options: [{ value: "email_send", label: "Send Email" }],
  },
];

export const TRIGGER_CONFIG_FIELDS: Record<
  string,
  Array<{ key: string; label: string; placeholder: string }>
> = {
  crm_deal_stage_changed: [
    { key: "fromStage", label: "From Stage", placeholder: "Any Stage" },
    { key: "toStage", label: "To Stage", placeholder: "e.g. Negotiation" },
  ],
  crm_lead_created: [
    { key: "source", label: "Lead Source", placeholder: "Any" },
    {
      key: "assignmentRule",
      label: "Assignment Rule",
      placeholder: "Round Robin",
    },
  ],
  crm_deal_won_lost: [
    { key: "outcome", label: "Outcome", placeholder: "Won or Lost" },
    { key: "pipeline", label: "Pipeline", placeholder: "All Pipelines" },
  ],
  erp_low_stock: [
    { key: "threshold", label: "Stock Threshold", placeholder: "e.g. 20" },
    {
      key: "warehouseFilter",
      label: "Warehouse",
      placeholder: "All Warehouses",
    },
  ],
  erp_order_created: [
    { key: "orderType", label: "Order Type", placeholder: "Any" },
    { key: "minValue", label: "Min Order Value", placeholder: "e.g. 0" },
  ],
  erp_invoice_overdue: [
    { key: "daysOverdue", label: "Days Overdue", placeholder: "e.g. 7" },
    {
      key: "reminderTemplate",
      label: "Reminder Template",
      placeholder: "Default",
    },
  ],
  erp_po_approved: [
    { key: "approvalLevel", label: "Approval Level", placeholder: "Manager" },
    { key: "category", label: "Category", placeholder: "All" },
  ],
  projects_issue_status_changed: [
    { key: "fromStatus", label: "From Status", placeholder: "Any" },
    { key: "toStatus", label: "To Status", placeholder: "e.g. Done" },
  ],
  projects_pr_merged: [
    { key: "branch", label: "Target Branch", placeholder: "main" },
    {
      key: "requireLinkedTicket",
      label: "Require Linked Ticket",
      placeholder: "true",
    },
  ],
  projects_deployment_failed: [
    { key: "environment", label: "Environment", placeholder: "production" },
    { key: "service", label: "Service Filter", placeholder: "All Services" },
  ],
  hr_employee_onboarded: [
    { key: "department", label: "Department", placeholder: "Any" },
    { key: "startDateOffset", label: "Days Before Start", placeholder: "0" },
  ],
  hr_leave_approved: [
    { key: "leaveType", label: "Leave Type", placeholder: "Any" },
    { key: "minDays", label: "Min Days", placeholder: "1" },
  ],
  hr_payroll_run: [
    { key: "payPeriod", label: "Pay Period", placeholder: "Monthly" },
  ],
  chat_message_in_channel: [
    { key: "channel", label: "Channel", placeholder: "#general" },
    { key: "keyword", label: "Keyword / Command", placeholder: "/ticket" },
  ],
  chat_command_used: [
    { key: "command", label: "Command", placeholder: "/report" },
  ],
  schedule_daily: [
    { key: "time", label: "Time (UTC)", placeholder: "09:00" },
    { key: "timezone", label: "Timezone", placeholder: "UTC" },
  ],
  schedule_weekly: [
    { key: "dayOfWeek", label: "Day of Week", placeholder: "Monday" },
    { key: "time", label: "Time (UTC)", placeholder: "09:00" },
  ],
  schedule_monthly: [
    { key: "dayOfMonth", label: "Day of Month", placeholder: "1" },
    { key: "time", label: "Time (UTC)", placeholder: "09:00" },
  ],
};
