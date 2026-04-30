// ─── Types ────────────────────────────────────────────────────────────────────

export type AutomationStatus = "active" | "paused" | "draft";
export type FilterTab = "all" | "active" | "paused" | "draft";
export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "greater_than"
  | "less_than";
export type LogicOp = "AND" | "OR";
export type DetailTab = "editor" | "history";

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

// ─── Lookup tables & mock data — re-exported from central fixtures ────────────
import {
  TRIGGER_GROUPS,
  ACTION_GROUPS,
  TRIGGER_CONFIG_FIELDS,
  INITIAL_AUTOMATIONS,
} from "@/lib/fixtures/automations";
export { TRIGGER_GROUPS, ACTION_GROUPS, TRIGGER_CONFIG_FIELDS, INITIAL_AUTOMATIONS };

export const ACTION_CONFIG_FIELDS: Record<
  string,
  Array<{ key: keyof ActionConfig; label: string; placeholder: string }>
> = {
  chat_post_channel: [
    { key: "field1Label", label: "Channel", placeholder: "#channel-name" },
    {
      key: "field2Label",
      label: "Message",
      placeholder: "Message text or template",
    },
  ],
  chat_send_dm: [
    {
      key: "field1Label",
      label: "Recipient",
      placeholder: "{{assigned_user}}",
    },
    {
      key: "field2Label",
      label: "Message",
      placeholder: "DM text or template",
    },
  ],
  chat_post_command_result: [
    { key: "field1Label", label: "Channel", placeholder: "#channel-name" },
    {
      key: "field2Label",
      label: "Command Output",
      placeholder: "{{command.output}}",
    },
  ],
  erp_create_sales_order: [
    { key: "field1Label", label: "Order Template", placeholder: "Standard" },
    { key: "field2Label", label: "Priority", placeholder: "Normal" },
  ],
  erp_update_stock: [
    {
      key: "field1Label",
      label: "Product SKU",
      placeholder: "{{product.sku}}",
    },
    {
      key: "field2Label",
      label: "Adjustment",
      placeholder: "e.g. -{{order.qty}}",
    },
  ],
  erp_create_invoice: [
    { key: "field1Label", label: "Ledger", placeholder: "Default" },
    { key: "field2Label", label: "Auto-reconcile", placeholder: "true" },
  ],
  crm_update_stage: [
    { key: "field1Label", label: "New Stage", placeholder: "e.g. Won" },
  ],
  crm_assign_lead: [
    { key: "field1Label", label: "Team", placeholder: "Sales Team" },
    { key: "field2Label", label: "Rule", placeholder: "Round Robin" },
  ],
  crm_create_deal: [
    { key: "field1Label", label: "Pipeline", placeholder: "Main Pipeline" },
    { key: "field2Label", label: "Initial Stage", placeholder: "Lead" },
  ],
  projects_create_issue: [
    { key: "field1Label", label: "Project", placeholder: "Default Project" },
    { key: "field2Label", label: "Priority", placeholder: "Medium" },
  ],
  projects_update_issue_status: [
    { key: "field1Label", label: "New Status", placeholder: "Done" },
    {
      key: "field2Label",
      label: "Comment",
      placeholder: "Auto-updated by automation",
    },
  ],
  projects_assign_issue: [
    { key: "field1Label", label: "Assignee", placeholder: "{{triggered_by}}" },
  ],
  hr_send_notification: [
    { key: "field1Label", label: "Notify", placeholder: "{{employee.email}}" },
    { key: "field2Label", label: "Message", placeholder: "Notification text" },
  ],
  hr_create_onboarding_task: [
    {
      key: "field1Label",
      label: "Template",
      placeholder: "Standard Onboarding",
    },
    { key: "field2Label", label: "Assign To", placeholder: "HR Team" },
  ],
  email_send: [
    {
      key: "field1Label",
      label: "Template",
      placeholder: "Default Email Template",
    },
    { key: "field2Label", label: "CC", placeholder: "optional@email.com" },
  ],
};

export const TEMPLATES = [
  {
    id: "tpl-deal-won",
    label: "Deal Won → Sales Order",
    description:
      "Automatically create a sales order when a CRM deal is marked as Won.",
    triggerType: "crm_deal_won_lost",
    triggerConfig: { outcome: "Won", pipeline: "Main Pipeline" },
    actions: [
      {
        id: "ta1",
        type: "erp_create_sales_order",
        config: {
          field1Label: "Order Template",
          field1Value: "Standard B2B",
          field2Label: "Priority",
          field2Value: "High",
        },
      },
    ],
  },
  {
    id: "tpl-low-stock",
    label: "Low Stock → Alert",
    description:
      "Post a channel alert when any product falls below the stock threshold.",
    triggerType: "erp_low_stock",
    triggerConfig: { threshold: "20", warehouseFilter: "All Warehouses" },
    actions: [
      {
        id: "ta2",
        type: "chat_post_channel",
        config: {
          field1Label: "Channel",
          field1Value: "#inventory-alerts",
          field2Label: "Message",
          field2Value: "Low stock: {{product.name}}",
        },
      },
    ],
  },
  {
    id: "tpl-onboard",
    label: "New Employee → Onboard",
    description:
      "Kick off onboarding tasks and send a welcome message when an employee joins.",
    triggerType: "hr_employee_onboarded",
    triggerConfig: { department: "Any", startDateOffset: "0" },
    actions: [
      {
        id: "ta3",
        type: "hr_create_onboarding_task",
        config: {
          field1Label: "Template",
          field1Value: "Standard Onboarding",
          field2Label: "Assign To",
          field2Value: "HR Team",
        },
      },
      {
        id: "ta4",
        type: "chat_post_channel",
        config: {
          field1Label: "Channel",
          field1Value: "#general",
          field2Label: "Message",
          field2Value: "Welcome {{employee.name}}!",
        },
      },
    ],
  },
  {
    id: "tpl-pr-merged",
    label: "PR Merged → Close Ticket",
    description:
      "Move linked issues to Done when a pull request is merged into main.",
    triggerType: "projects_pr_merged",
    triggerConfig: { branch: "main", requireLinkedTicket: "true" },
    actions: [
      {
        id: "ta5",
        type: "projects_update_issue_status",
        config: {
          field1Label: "New Status",
          field1Value: "Done",
          field2Label: "Comment",
          field2Value: "Resolved via PR #{{pr.number}}",
        },
      },
    ],
  },
  {
    id: "tpl-invoice-due",
    label: "Invoice Due → Remind",
    description:
      "Send an overdue invoice reminder email 7 days after the due date.",
    triggerType: "erp_invoice_overdue",
    triggerConfig: { daysOverdue: "7", reminderTemplate: "Friendly Reminder" },
    actions: [
      {
        id: "ta6",
        type: "email_send",
        config: {
          field1Label: "Template",
          field1Value: "Invoice Overdue Reminder",
          field2Label: "CC",
          field2Value: "finance@company.com",
        },
      },
    ],
  },
  {
    id: "tpl-custom",
    label: "Custom",
    description: "Start from scratch with a blank automation.",
    triggerType: "",
    triggerConfig: {},
    actions: [],
  },
];

export const CONDITION_FIELDS = [
  "deal.value",
  "deal.stage",
  "deal.source",
  "product.category",
  "product.stock",
  "product.sku",
  "invoice.amount",
  "invoice.daysOverdue",
  "lead.source",
  "lead.company",
  "pr.title",
  "pr.author",
  "pr.branch",
  "message.priority",
  "message.content",
  "employee.department",
  "employee.role",
  "expense.amount",
  "expense.category",
];

export const OPERATORS: Array<{ value: ConditionOperator; label: string }> = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "not equals" },
  { value: "contains", label: "contains" },
  { value: "greater_than", label: "greater than" },
  { value: "less_than", label: "less than" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatRelativeTime(iso: string): string {
  if (iso === "") return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function formatTimestamp(iso: string): string {
  if (iso === "") return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getStatusColor(status: AutomationStatus): string {
  if (status === "active") return "#22C55E";
  if (status === "paused") return "#F59E0B";
  return "#A0A0B8";
}

export function getRunStatusColor(status: RunHistoryEntry["status"]): string {
  if (status === "success") return "#22C55E";
  if (status === "failed") return "#EF4444";
  return "#F59E0B";
}

export function getRunStatusLabel(status: RunHistoryEntry["status"]): string {
  if (status === "success") return "Success";
  if (status === "failed") return "Failed";
  return "Skipped";
}

export function getTriggerLabel(triggerType: string): string {
  for (const group of TRIGGER_GROUPS) {
    for (const opt of group.options) {
      if (opt.value === triggerType) return `${group.group}: ${opt.label}`;
    }
  }
  return triggerType;
}

export function getActionLabel(actionType: string): string {
  for (const group of ACTION_GROUPS) {
    for (const opt of group.options) {
      if (opt.value === actionType) return opt.label;
    }
  }
  return actionType;
}

export function matchesFilter(auto: Automation, tab: FilterTab): boolean {
  if (tab === "all") return true;
  return auto.status === tab;
}

export function matchesSearch(auto: Automation, query: string): boolean {
  const q = query.toLowerCase();
  if (q === "") return true;
  return (
    auto.name.toLowerCase().includes(q) ||
    auto.triggerSummary.toLowerCase().includes(q)
  );
}

export function generateId(): string {
  return `id-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}
