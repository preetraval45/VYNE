'use client'

import { useState } from 'react'
import {
  Search, Plus, Play, Pause, Trash2, ChevronDown, ChevronUp,
  ArrowDown, X, Check, Clock, Zap, BarChart2, AlertTriangle,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type AutomationStatus = 'active' | 'paused' | 'draft'
type FilterTab = 'all' | 'active' | 'paused' | 'draft'
type ConditionOperator = 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
type LogicOp = 'AND' | 'OR'
type DetailTab = 'editor' | 'history'

interface RunHistoryEntry {
  id: string
  timestamp: string
  status: 'success' | 'failed' | 'skipped'
  duration: string
  recordsAffected: number
}

interface Condition {
  id: string
  field: string
  operator: ConditionOperator
  value: string
}

interface ActionConfig {
  field1Label: string
  field1Value: string
  field2Label?: string
  field2Value?: string
}

interface AutomationAction {
  id: string
  type: string
  config: ActionConfig
}

interface Automation {
  id: string
  name: string
  status: AutomationStatus
  triggerType: string
  triggerSummary: string
  triggerConfig: Record<string, string>
  conditions: Condition[]
  conditionLogic: LogicOp
  actions: AutomationAction[]
  runCount: number
  lastRun: string
  history: RunHistoryEntry[]
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const NOW = Date.now()
const minsAgo = (m: number) => new Date(NOW - m * 60000).toISOString()
const hoursAgo = (h: number) => new Date(NOW - h * 3600000).toISOString()
const daysAgo = (d: number) => new Date(NOW - d * 86400000).toISOString()

function makeHistory(count: number, baseOffset: number): RunHistoryEntry[] {
  const statuses: Array<'success' | 'failed' | 'skipped'> = ['success', 'success', 'success', 'success', 'failed', 'skipped']
  return Array.from({ length: count }, (_, i) => ({
    id: `h-${baseOffset}-${i}`,
    timestamp: hoursAgo(baseOffset + i * 3),
    status: statuses[i % statuses.length],
    duration: `${Math.floor(Math.random() * 900 + 100)}ms`,
    recordsAffected: Math.floor(Math.random() * 5 + 1),
  }))
}

const INITIAL_AUTOMATIONS: Automation[] = [
  {
    id: 'auto-1',
    name: 'Deal Won → Create Sales Order',
    status: 'active',
    triggerType: 'crm_deal_won_lost',
    triggerSummary: 'CRM: Deal Won/Lost',
    triggerConfig: { outcome: 'Won', pipeline: 'Main Pipeline' },
    conditions: [
      { id: 'c1a', field: 'deal.value', operator: 'greater_than', value: '5000' },
    ],
    conditionLogic: 'AND',
    actions: [
      { id: 'a1a', type: 'erp_create_sales_order', config: { field1Label: 'Order Template', field1Value: 'Standard B2B', field2Label: 'Priority', field2Value: 'High' } },
      { id: 'a1b', type: 'chat_post_channel', config: { field1Label: 'Channel', field1Value: '#sales-wins', field2Label: 'Message', field2Value: 'New deal closed: {{deal.name}} for {{deal.value}}' } },
    ],
    runCount: 47,
    lastRun: minsAgo(38),
    history: makeHistory(10, 1),
  },
  {
    id: 'auto-2',
    name: 'Low Stock Alert → Slack Notify',
    status: 'active',
    triggerType: 'erp_low_stock',
    triggerSummary: 'ERP: Low Stock',
    triggerConfig: { threshold: '20', warehouseFilter: 'All Warehouses' },
    conditions: [
      { id: 'c2a', field: 'product.category', operator: 'not_equals', value: 'archived' },
    ],
    conditionLogic: 'AND',
    actions: [
      { id: 'a2a', type: 'chat_post_channel', config: { field1Label: 'Channel', field1Value: '#inventory-alerts', field2Label: 'Message', field2Value: 'Low stock: {{product.name}} — {{product.stock}} units left' } },
    ],
    runCount: 203,
    lastRun: minsAgo(12),
    history: makeHistory(10, 2),
  },
  {
    id: 'auto-3',
    name: 'New Lead → Assign to Sales Team',
    status: 'active',
    triggerType: 'crm_lead_created',
    triggerSummary: 'CRM: Lead Created',
    triggerConfig: { source: 'Any', assignmentRule: 'Round Robin' },
    conditions: [],
    conditionLogic: 'AND',
    actions: [
      { id: 'a3a', type: 'crm_assign_lead', config: { field1Label: 'Team', field1Value: 'Sales Team', field2Label: 'Rule', field2Value: 'Round Robin' } },
      { id: 'a3b', type: 'chat_send_dm', config: { field1Label: 'Recipient', field1Value: '{{assigned_user}}', field2Label: 'Message', field2Value: 'New lead assigned: {{lead.name}} from {{lead.company}}' } },
    ],
    runCount: 89,
    lastRun: hoursAgo(2),
    history: makeHistory(10, 3),
  },
  {
    id: 'auto-4',
    name: 'Invoice Overdue → Send Reminder',
    status: 'active',
    triggerType: 'erp_invoice_overdue',
    triggerSummary: 'ERP: Invoice Overdue',
    triggerConfig: { daysOverdue: '7', reminderTemplate: 'Friendly Reminder' },
    conditions: [
      { id: 'c4a', field: 'invoice.amount', operator: 'greater_than', value: '500' },
    ],
    conditionLogic: 'AND',
    actions: [
      { id: 'a4a', type: 'email_send', config: { field1Label: 'Template', field1Value: 'Invoice Overdue Reminder', field2Label: 'CC', field2Value: 'finance@company.com' } },
    ],
    runCount: 15,
    lastRun: hoursAgo(6),
    history: makeHistory(10, 4),
  },
  {
    id: 'auto-5',
    name: 'PR Merged → Update Ticket Status',
    status: 'paused',
    triggerType: 'projects_pr_merged',
    triggerSummary: 'Projects: PR Merged',
    triggerConfig: { branch: 'main', requireLinkedTicket: 'true' },
    conditions: [
      { id: 'c5a', field: 'pr.title', operator: 'contains', value: 'ENG-' },
    ],
    conditionLogic: 'AND',
    actions: [
      { id: 'a5a', type: 'projects_update_issue_status', config: { field1Label: 'New Status', field1Value: 'Done', field2Label: 'Comment', field2Value: 'Resolved via PR #{{pr.number}}' } },
    ],
    runCount: 34,
    lastRun: daysAgo(3),
    history: makeHistory(10, 5),
  },
  {
    id: 'auto-6',
    name: 'Expense Approved → Sync to Finance',
    status: 'active',
    triggerType: 'erp_po_approved',
    triggerSummary: 'ERP: PO Approved',
    triggerConfig: { approvalLevel: 'Manager', category: 'All' },
    conditions: [
      { id: 'c6a', field: 'expense.amount', operator: 'greater_than', value: '100' },
    ],
    conditionLogic: 'AND',
    actions: [
      { id: 'a6a', type: 'erp_create_invoice', config: { field1Label: 'Ledger', field1Value: 'Expenses', field2Label: 'Auto-reconcile', field2Value: 'true' } },
      { id: 'a6b', type: 'hr_send_notification', config: { field1Label: 'Notify', field1Value: '{{submitter}}', field2Label: 'Message', field2Value: 'Your expense has been synced to finance' } },
    ],
    runCount: 28,
    lastRun: hoursAgo(14),
    history: makeHistory(10, 6),
  },
  {
    id: 'auto-7',
    name: 'Employee Onboarded → Create Accounts',
    status: 'draft',
    triggerType: 'hr_employee_onboarded',
    triggerSummary: 'HR: Employee Onboarded',
    triggerConfig: { department: 'Any', startDateOffset: '0' },
    conditions: [],
    conditionLogic: 'AND',
    actions: [
      { id: 'a7a', type: 'hr_create_onboarding_task', config: { field1Label: 'Template', field1Value: 'Standard Onboarding', field2Label: 'Assign To', field2Value: 'HR Team' } },
      { id: 'a7b', type: 'chat_post_channel', config: { field1Label: 'Channel', field1Value: '#general', field2Label: 'Message', field2Value: 'Welcome {{employee.name}} to the team!' } },
    ],
    runCount: 0,
    lastRun: '',
    history: [],
  },
  {
    id: 'auto-8',
    name: 'Support Ticket → Create Issue',
    status: 'active',
    triggerType: 'chat_message_in_channel',
    triggerSummary: 'Chat: Message in Channel',
    triggerConfig: { channel: '#support', keyword: '/ticket' },
    conditions: [
      { id: 'c8a', field: 'message.priority', operator: 'equals', value: 'urgent' },
    ],
    conditionLogic: 'OR',
    actions: [
      { id: 'a8a', type: 'projects_create_issue', config: { field1Label: 'Project', field1Value: 'Support Board', field2Label: 'Priority', field2Value: '{{message.priority}}' } },
      { id: 'a8b', type: 'chat_post_channel', config: { field1Label: 'Channel', field1Value: '#engineering', field2Label: 'Message', field2Value: 'New support ticket escalated: {{issue.title}}' } },
    ],
    runCount: 112,
    lastRun: minsAgo(5),
    history: makeHistory(10, 8),
  },
]

// ─── Lookup tables ────────────────────────────────────────────────────────────

const TRIGGER_GROUPS: Array<{ group: string; options: Array<{ value: string; label: string }> }> = [
  {
    group: 'CRM',
    options: [
      { value: 'crm_deal_stage_changed', label: 'Deal Stage Changed' },
      { value: 'crm_lead_created', label: 'Lead Created' },
      { value: 'crm_deal_won_lost', label: 'Deal Won/Lost' },
    ],
  },
  {
    group: 'ERP',
    options: [
      { value: 'erp_low_stock', label: 'Low Stock' },
      { value: 'erp_order_created', label: 'Order Created' },
      { value: 'erp_invoice_overdue', label: 'Invoice Overdue' },
      { value: 'erp_po_approved', label: 'PO Approved' },
    ],
  },
  {
    group: 'Projects',
    options: [
      { value: 'projects_issue_status_changed', label: 'Issue Status Changed' },
      { value: 'projects_pr_merged', label: 'PR Merged' },
      { value: 'projects_deployment_failed', label: 'Deployment Failed' },
    ],
  },
  {
    group: 'HR',
    options: [
      { value: 'hr_employee_onboarded', label: 'Employee Onboarded' },
      { value: 'hr_leave_approved', label: 'Leave Approved' },
      { value: 'hr_payroll_run', label: 'Payroll Run' },
    ],
  },
  {
    group: 'Chat',
    options: [
      { value: 'chat_message_in_channel', label: 'Message in Channel' },
      { value: 'chat_command_used', label: 'Command Used' },
    ],
  },
  {
    group: 'Schedule',
    options: [
      { value: 'schedule_daily', label: 'Daily at Time' },
      { value: 'schedule_weekly', label: 'Weekly' },
      { value: 'schedule_monthly', label: 'Monthly' },
    ],
  },
]

const ACTION_GROUPS: Array<{ group: string; options: Array<{ value: string; label: string }> }> = [
  {
    group: 'Chat',
    options: [
      { value: 'chat_post_channel', label: 'Post to Channel' },
      { value: 'chat_send_dm', label: 'Send DM' },
      { value: 'chat_post_command_result', label: 'Post Command Result' },
    ],
  },
  {
    group: 'ERP',
    options: [
      { value: 'erp_create_sales_order', label: 'Create Sales Order' },
      { value: 'erp_update_stock', label: 'Update Stock' },
      { value: 'erp_create_invoice', label: 'Create Invoice' },
    ],
  },
  {
    group: 'CRM',
    options: [
      { value: 'crm_update_stage', label: 'Update Stage' },
      { value: 'crm_assign_lead', label: 'Assign Lead' },
      { value: 'crm_create_deal', label: 'Create Deal' },
    ],
  },
  {
    group: 'Projects',
    options: [
      { value: 'projects_create_issue', label: 'Create Issue' },
      { value: 'projects_update_issue_status', label: 'Update Issue Status' },
      { value: 'projects_assign_issue', label: 'Assign Issue' },
    ],
  },
  {
    group: 'HR',
    options: [
      { value: 'hr_send_notification', label: 'Send Notification' },
      { value: 'hr_create_onboarding_task', label: 'Create Onboarding Task' },
    ],
  },
  {
    group: 'Email',
    options: [
      { value: 'email_send', label: 'Send Email' },
    ],
  },
]

const TRIGGER_CONFIG_FIELDS: Record<string, Array<{ key: string; label: string; placeholder: string }>> = {
  crm_deal_stage_changed: [
    { key: 'fromStage', label: 'From Stage', placeholder: 'Any Stage' },
    { key: 'toStage', label: 'To Stage', placeholder: 'e.g. Negotiation' },
  ],
  crm_lead_created: [
    { key: 'source', label: 'Lead Source', placeholder: 'Any' },
    { key: 'assignmentRule', label: 'Assignment Rule', placeholder: 'Round Robin' },
  ],
  crm_deal_won_lost: [
    { key: 'outcome', label: 'Outcome', placeholder: 'Won or Lost' },
    { key: 'pipeline', label: 'Pipeline', placeholder: 'All Pipelines' },
  ],
  erp_low_stock: [
    { key: 'threshold', label: 'Stock Threshold', placeholder: 'e.g. 20' },
    { key: 'warehouseFilter', label: 'Warehouse', placeholder: 'All Warehouses' },
  ],
  erp_order_created: [
    { key: 'orderType', label: 'Order Type', placeholder: 'Any' },
    { key: 'minValue', label: 'Min Order Value', placeholder: 'e.g. 0' },
  ],
  erp_invoice_overdue: [
    { key: 'daysOverdue', label: 'Days Overdue', placeholder: 'e.g. 7' },
    { key: 'reminderTemplate', label: 'Reminder Template', placeholder: 'Default' },
  ],
  erp_po_approved: [
    { key: 'approvalLevel', label: 'Approval Level', placeholder: 'Manager' },
    { key: 'category', label: 'Category', placeholder: 'All' },
  ],
  projects_issue_status_changed: [
    { key: 'fromStatus', label: 'From Status', placeholder: 'Any' },
    { key: 'toStatus', label: 'To Status', placeholder: 'e.g. Done' },
  ],
  projects_pr_merged: [
    { key: 'branch', label: 'Target Branch', placeholder: 'main' },
    { key: 'requireLinkedTicket', label: 'Require Linked Ticket', placeholder: 'true' },
  ],
  projects_deployment_failed: [
    { key: 'environment', label: 'Environment', placeholder: 'production' },
    { key: 'service', label: 'Service Filter', placeholder: 'All Services' },
  ],
  hr_employee_onboarded: [
    { key: 'department', label: 'Department', placeholder: 'Any' },
    { key: 'startDateOffset', label: 'Days Before Start', placeholder: '0' },
  ],
  hr_leave_approved: [
    { key: 'leaveType', label: 'Leave Type', placeholder: 'Any' },
    { key: 'minDays', label: 'Min Days', placeholder: '1' },
  ],
  hr_payroll_run: [
    { key: 'payPeriod', label: 'Pay Period', placeholder: 'Monthly' },
  ],
  chat_message_in_channel: [
    { key: 'channel', label: 'Channel', placeholder: '#general' },
    { key: 'keyword', label: 'Keyword / Command', placeholder: '/ticket' },
  ],
  chat_command_used: [
    { key: 'command', label: 'Command', placeholder: '/report' },
  ],
  schedule_daily: [
    { key: 'time', label: 'Time (UTC)', placeholder: '09:00' },
    { key: 'timezone', label: 'Timezone', placeholder: 'UTC' },
  ],
  schedule_weekly: [
    { key: 'dayOfWeek', label: 'Day of Week', placeholder: 'Monday' },
    { key: 'time', label: 'Time (UTC)', placeholder: '09:00' },
  ],
  schedule_monthly: [
    { key: 'dayOfMonth', label: 'Day of Month', placeholder: '1' },
    { key: 'time', label: 'Time (UTC)', placeholder: '09:00' },
  ],
}

const ACTION_CONFIG_FIELDS: Record<string, Array<{ key: keyof ActionConfig; label: string; placeholder: string }>> = {
  chat_post_channel: [
    { key: 'field1Label', label: 'Channel', placeholder: '#channel-name' },
    { key: 'field2Label', label: 'Message', placeholder: 'Message text or template' },
  ],
  chat_send_dm: [
    { key: 'field1Label', label: 'Recipient', placeholder: '{{assigned_user}}' },
    { key: 'field2Label', label: 'Message', placeholder: 'DM text or template' },
  ],
  chat_post_command_result: [
    { key: 'field1Label', label: 'Channel', placeholder: '#channel-name' },
    { key: 'field2Label', label: 'Command Output', placeholder: '{{command.output}}' },
  ],
  erp_create_sales_order: [
    { key: 'field1Label', label: 'Order Template', placeholder: 'Standard' },
    { key: 'field2Label', label: 'Priority', placeholder: 'Normal' },
  ],
  erp_update_stock: [
    { key: 'field1Label', label: 'Product SKU', placeholder: '{{product.sku}}' },
    { key: 'field2Label', label: 'Adjustment', placeholder: 'e.g. -{{order.qty}}' },
  ],
  erp_create_invoice: [
    { key: 'field1Label', label: 'Ledger', placeholder: 'Default' },
    { key: 'field2Label', label: 'Auto-reconcile', placeholder: 'true' },
  ],
  crm_update_stage: [
    { key: 'field1Label', label: 'New Stage', placeholder: 'e.g. Won' },
  ],
  crm_assign_lead: [
    { key: 'field1Label', label: 'Team', placeholder: 'Sales Team' },
    { key: 'field2Label', label: 'Rule', placeholder: 'Round Robin' },
  ],
  crm_create_deal: [
    { key: 'field1Label', label: 'Pipeline', placeholder: 'Main Pipeline' },
    { key: 'field2Label', label: 'Initial Stage', placeholder: 'Lead' },
  ],
  projects_create_issue: [
    { key: 'field1Label', label: 'Project', placeholder: 'Default Project' },
    { key: 'field2Label', label: 'Priority', placeholder: 'Medium' },
  ],
  projects_update_issue_status: [
    { key: 'field1Label', label: 'New Status', placeholder: 'Done' },
    { key: 'field2Label', label: 'Comment', placeholder: 'Auto-updated by automation' },
  ],
  projects_assign_issue: [
    { key: 'field1Label', label: 'Assignee', placeholder: '{{triggered_by}}' },
  ],
  hr_send_notification: [
    { key: 'field1Label', label: 'Notify', placeholder: '{{employee.email}}' },
    { key: 'field2Label', label: 'Message', placeholder: 'Notification text' },
  ],
  hr_create_onboarding_task: [
    { key: 'field1Label', label: 'Template', placeholder: 'Standard Onboarding' },
    { key: 'field2Label', label: 'Assign To', placeholder: 'HR Team' },
  ],
  email_send: [
    { key: 'field1Label', label: 'Template', placeholder: 'Default Email Template' },
    { key: 'field2Label', label: 'CC', placeholder: 'optional@email.com' },
  ],
}

const TEMPLATES = [
  {
    id: 'tpl-deal-won',
    label: 'Deal Won → Sales Order',
    description: 'Automatically create a sales order when a CRM deal is marked as Won.',
    triggerType: 'crm_deal_won_lost',
    triggerConfig: { outcome: 'Won', pipeline: 'Main Pipeline' },
    actions: [
      { id: 'ta1', type: 'erp_create_sales_order', config: { field1Label: 'Order Template', field1Value: 'Standard B2B', field2Label: 'Priority', field2Value: 'High' } },
    ],
  },
  {
    id: 'tpl-low-stock',
    label: 'Low Stock → Alert',
    description: 'Post a channel alert when any product falls below the stock threshold.',
    triggerType: 'erp_low_stock',
    triggerConfig: { threshold: '20', warehouseFilter: 'All Warehouses' },
    actions: [
      { id: 'ta2', type: 'chat_post_channel', config: { field1Label: 'Channel', field1Value: '#inventory-alerts', field2Label: 'Message', field2Value: 'Low stock: {{product.name}}' } },
    ],
  },
  {
    id: 'tpl-onboard',
    label: 'New Employee → Onboard',
    description: 'Kick off onboarding tasks and send a welcome message when an employee joins.',
    triggerType: 'hr_employee_onboarded',
    triggerConfig: { department: 'Any', startDateOffset: '0' },
    actions: [
      { id: 'ta3', type: 'hr_create_onboarding_task', config: { field1Label: 'Template', field1Value: 'Standard Onboarding', field2Label: 'Assign To', field2Value: 'HR Team' } },
      { id: 'ta4', type: 'chat_post_channel', config: { field1Label: 'Channel', field1Value: '#general', field2Label: 'Message', field2Value: 'Welcome {{employee.name}}!' } },
    ],
  },
  {
    id: 'tpl-pr-merged',
    label: 'PR Merged → Close Ticket',
    description: 'Move linked issues to Done when a pull request is merged into main.',
    triggerType: 'projects_pr_merged',
    triggerConfig: { branch: 'main', requireLinkedTicket: 'true' },
    actions: [
      { id: 'ta5', type: 'projects_update_issue_status', config: { field1Label: 'New Status', field1Value: 'Done', field2Label: 'Comment', field2Value: 'Resolved via PR #{{pr.number}}' } },
    ],
  },
  {
    id: 'tpl-invoice-due',
    label: 'Invoice Due → Remind',
    description: 'Send an overdue invoice reminder email 7 days after the due date.',
    triggerType: 'erp_invoice_overdue',
    triggerConfig: { daysOverdue: '7', reminderTemplate: 'Friendly Reminder' },
    actions: [
      { id: 'ta6', type: 'email_send', config: { field1Label: 'Template', field1Value: 'Invoice Overdue Reminder', field2Label: 'CC', field2Value: 'finance@company.com' } },
    ],
  },
  {
    id: 'tpl-custom',
    label: 'Custom',
    description: 'Start from scratch with a blank automation.',
    triggerType: '',
    triggerConfig: {},
    actions: [],
  },
]

const CONDITION_FIELDS = [
  'deal.value', 'deal.stage', 'deal.source',
  'product.category', 'product.stock', 'product.sku',
  'invoice.amount', 'invoice.daysOverdue',
  'lead.source', 'lead.company',
  'pr.title', 'pr.author', 'pr.branch',
  'message.priority', 'message.content',
  'employee.department', 'employee.role',
  'expense.amount', 'expense.category',
]

const OPERATORS: Array<{ value: ConditionOperator; label: string }> = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: 'greater_than', label: 'greater than' },
  { value: 'less_than', label: 'less than' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  if (iso === '') return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function formatTimestamp(iso: string): string {
  if (iso === '') return '—'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function getStatusColor(status: AutomationStatus): string {
  if (status === 'active') return '#22C55E'
  if (status === 'paused') return '#F59E0B'
  return '#A0A0B8'
}

function getRunStatusColor(status: RunHistoryEntry['status']): string {
  if (status === 'success') return '#22C55E'
  if (status === 'failed') return '#EF4444'
  return '#F59E0B'
}

function getRunStatusLabel(status: RunHistoryEntry['status']): string {
  if (status === 'success') return 'Success'
  if (status === 'failed') return 'Failed'
  return 'Skipped'
}

function getTriggerLabel(triggerType: string): string {
  for (const group of TRIGGER_GROUPS) {
    for (const opt of group.options) {
      if (opt.value === triggerType) return `${group.group}: ${opt.label}`
    }
  }
  return triggerType
}

function getActionLabel(actionType: string): string {
  for (const group of ACTION_GROUPS) {
    for (const opt of group.options) {
      if (opt.value === actionType) return opt.label
    }
  }
  return actionType
}

function matchesFilter(auto: Automation, tab: FilterTab): boolean {
  if (tab === 'all') return true
  return auto.status === tab
}

function matchesSearch(auto: Automation, query: string): boolean {
  const q = query.toLowerCase()
  if (q === '') return true
  return auto.name.toLowerCase().includes(q) || auto.triggerSummary.toLowerCase().includes(q)
}

function generateId(): string {
  return `id-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard(props: Readonly<{ icon: React.ReactNode; label: string; value: string; sub: string; accent: string }>) {
  return (
    <div style={{
      background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12,
      padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: `${props.accent}18`, flexShrink: 0,
      }}>
        {props.icon}
      </div>
      <div>
        <div style={{ fontSize: 11, color: '#6B6B8A', marginBottom: 2 }}>{props.label}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', lineHeight: 1.1 }}>{props.value}</div>
        <div style={{ fontSize: 10, color: '#A0A0B8', marginTop: 2 }}>{props.sub}</div>
      </div>
    </div>
  )
}

function StatusDot(props: Readonly<{ status: AutomationStatus }>) {
  return (
    <span style={{
      width: 7, height: 7, borderRadius: '50%',
      background: getStatusColor(props.status),
      display: 'inline-block', flexShrink: 0,
      boxShadow: props.status === 'active' ? `0 0 0 2px ${getStatusColor('active')}33` : 'none',
    }} />
  )
}

function AutomationRow(props: Readonly<{
  automation: Automation
  isSelected: boolean
  onSelect: () => void
  onToggle: () => void
}>) {
  const { automation, isSelected, onSelect, onToggle } = props
  return (
    <div style={{ position: 'relative', marginBottom: 2 }}>
      {/* Main row — native button covers the full row (padded right to leave room for toggle) */}
      <button
        onClick={onSelect}
        style={{
          width: '100%', textAlign: 'left', padding: '10px 40px 10px 14px', cursor: 'pointer',
          borderRadius: 8, background: isSelected ? 'rgba(108,71,255,0.08)' : 'transparent',
          border: isSelected ? '1px solid rgba(108,71,255,0.2)' : '1px solid transparent',
          transition: 'all 0.1s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <StatusDot status={automation.status} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A2E', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {automation.name}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 15 }}>
          <span style={{ fontSize: 10, color: '#A0A0B8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {automation.triggerSummary}
          </span>
          <span style={{ fontSize: 10, color: '#6B6B8A', fontVariantNumeric: 'tabular-nums' }}>
            {automation.runCount} runs
          </span>
          <span style={{ fontSize: 10, color: '#A0A0B8' }}>
            {formatRelativeTime(automation.lastRun)}
          </span>
        </div>
      </button>

      {/* Toggle button — sibling, not nested, positioned over the top-right of the row */}
      <button
        onClick={onToggle}
        title={automation.status === 'active' ? 'Pause' : 'Activate'}
        style={{
          position: 'absolute', top: 10, right: 10, zIndex: 1,
          background: 'none', border: 'none', cursor: 'pointer', padding: 3, borderRadius: 4,
          color: automation.status === 'active' ? '#F59E0B' : '#22C55E',
          display: 'flex', alignItems: 'center',
        }}
      >
        {automation.status === 'active' ? <Pause size={12} /> : <Play size={12} />}
      </button>
    </div>
  )
}

function TriggerSection(props: Readonly<{
  triggerType: string
  triggerConfig: Record<string, string>
  onTriggerChange: (value: string) => void
  onConfigChange: (key: string, value: string) => void
}>) {
  const { triggerType, triggerConfig, onTriggerChange, onConfigChange } = props
  const configFields = TRIGGER_CONFIG_FIELDS[triggerType] ?? []

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6, background: 'rgba(108,71,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Zap size={12} color="#6C47FF" />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1A2E', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Trigger
        </span>
      </div>
      <div style={{
        background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: 14,
      }}>
        <label htmlFor="trigger-type-select" style={{ fontSize: 11, color: '#6B6B8A', marginBottom: 5, display: 'block' }}>
          Trigger Type
        </label>
        <select
          id="trigger-type-select"
          value={triggerType}
          onChange={(e) => onTriggerChange(e.target.value)}
          style={{
            width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.12)',
            fontSize: 12, color: '#1A1A2E', background: '#FAFAFE', marginBottom: configFields.length > 0 ? 12 : 0,
            appearance: 'none', cursor: 'pointer',
          }}
        >
          <option value="">— Select a trigger —</option>
          {TRIGGER_GROUPS.map((group) => (
            <optgroup key={group.group} label={group.group}>
              {group.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
        {configFields.map((field) => (
          <div key={`${triggerType}-${field.key}`} style={{ marginBottom: 10 }}>
            <label
              htmlFor={`trigger-cfg-${field.key}`}
              style={{ fontSize: 11, color: '#6B6B8A', marginBottom: 4, display: 'block' }}
            >
              {field.label}
            </label>
            <input
              id={`trigger-cfg-${field.key}`}
              type="text"
              value={triggerConfig[field.key] ?? ''}
              onChange={(e) => onConfigChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              style={{
                width: '100%', padding: '7px 10px', borderRadius: 7,
                border: '1px solid rgba(0,0,0,0.12)', fontSize: 12,
                color: '#1A1A2E', background: '#FAFAFE', boxSizing: 'border-box',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function ConditionRow(props: Readonly<{
  condition: Condition
  index: number
  total: number
  logic: LogicOp
  onUpdate: (id: string, field: keyof Condition, value: string) => void
  onDelete: (id: string) => void
  onToggleLogic: () => void
}>) {
  const { condition, index, total, logic, onUpdate, onDelete, onToggleLogic } = props
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '8px 10px',
      }}>
        <select
          id={`cond-field-${condition.id}`}
          value={condition.field}
          onChange={(e) => onUpdate(condition.id, 'field', e.target.value)}
          style={{ flex: 2, padding: '5px 6px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.12)', fontSize: 11, color: '#1A1A2E', background: '#FAFAFE' }}
        >
          <option value="">Field</option>
          {CONDITION_FIELDS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <select
          id={`cond-op-${condition.id}`}
          value={condition.operator}
          onChange={(e) => onUpdate(condition.id, 'operator', e.target.value as ConditionOperator)}
          style={{ flex: 2, padding: '5px 6px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.12)', fontSize: 11, color: '#1A1A2E', background: '#FAFAFE' }}
        >
          {OPERATORS.map((op) => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
        </select>
        <input
          id={`cond-val-${condition.id}`}
          type="text"
          value={condition.value}
          onChange={(e) => onUpdate(condition.id, 'value', e.target.value)}
          placeholder="Value"
          style={{ flex: 2, padding: '5px 6px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.12)', fontSize: 11, color: '#1A1A2E', background: '#FAFAFE' }}
        />
        <button
          onClick={() => onDelete(condition.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 4, display: 'flex', alignItems: 'center' }}
          title="Delete condition"
        >
          <X size={13} />
        </button>
      </div>
      {index < total - 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0' }}>
          <button
            onClick={onToggleLogic}
            style={{
              background: 'rgba(108,71,255,0.1)', border: '1px solid rgba(108,71,255,0.2)',
              borderRadius: 12, padding: '2px 10px', fontSize: 10, fontWeight: 700,
              color: '#6C47FF', cursor: 'pointer', letterSpacing: '0.05em',
            }}
          >
            {logic}
          </button>
        </div>
      )}
    </div>
  )
}

function ConditionsSection(props: Readonly<{
  conditions: Condition[]
  logic: LogicOp
  onAdd: () => void
  onUpdate: (id: string, field: keyof Condition, value: string) => void
  onDelete: (id: string) => void
  onToggleLogic: () => void
}>) {
  const { conditions, logic, onAdd, onUpdate, onDelete, onToggleLogic } = props
  const canAdd = conditions.length < 3

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6, background: 'rgba(245,158,11,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AlertTriangle size={12} color="#F59E0B" />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1A2E', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Conditions <span style={{ fontSize: 10, fontWeight: 400, color: '#A0A0B8', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
        </span>
        {canAdd && (
          <button
            onClick={onAdd}
            style={{
              marginLeft: 'auto', background: 'none', border: '1px dashed rgba(0,0,0,0.2)',
              borderRadius: 6, padding: '3px 8px', fontSize: 11, color: '#6B6B8A',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <Plus size={11} /> Add Condition
          </button>
        )}
      </div>
      {conditions.length === 0 && (
        <div style={{
          background: '#fff', border: '1px dashed rgba(0,0,0,0.12)', borderRadius: 10,
          padding: '16px', textAlign: 'center', color: '#A0A0B8', fontSize: 11,
        }}>
          No conditions — automation runs on every trigger
        </div>
      )}
      {conditions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {conditions.map((cond, i) => (
            <ConditionRow
              key={cond.id}
              condition={cond}
              index={i}
              total={conditions.length}
              logic={logic}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onToggleLogic={onToggleLogic}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ActionCard(props: Readonly<{
  action: AutomationAction
  index: number
  total: number
  onTypeChange: (id: string, type: string) => void
  onConfigChange: (id: string, field: 'field1Value' | 'field2Value', value: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onDelete: (id: string) => void
}>) {
  const { action, index, total, onTypeChange, onConfigChange, onMoveUp, onMoveDown, onDelete } = props
  const configDefs = ACTION_CONFIG_FIELDS[action.type] ?? []

  return (
    <div>
      <div style={{
        background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{
            width: 20, height: 20, borderRadius: 5, background: 'rgba(34,197,94,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#22C55E' }}>{index + 1}</span>
          </div>
          <select
            id={`action-type-${action.id}`}
            value={action.type}
            onChange={(e) => onTypeChange(action.id, e.target.value)}
            style={{
              flex: 1, padding: '5px 8px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.12)',
              fontSize: 12, color: '#1A1A2E', background: '#FAFAFE', appearance: 'none', cursor: 'pointer',
            }}
          >
            <option value="">— Select action —</option>
            {ACTION_GROUPS.map((group) => (
              <optgroup key={group.group} label={group.group}>
                {group.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 2 }}>
            <button
              onClick={() => onMoveUp(action.id)}
              disabled={index === 0}
              style={{ background: 'none', border: 'none', cursor: index === 0 ? 'not-allowed' : 'pointer', color: index === 0 ? '#D0D0E0' : '#6B6B8A', padding: 3, display: 'flex', alignItems: 'center' }}
              title="Move up"
            >
              <ChevronUp size={13} />
            </button>
            <button
              onClick={() => onMoveDown(action.id)}
              disabled={index === total - 1}
              style={{ background: 'none', border: 'none', cursor: index === total - 1 ? 'not-allowed' : 'pointer', color: index === total - 1 ? '#D0D0E0' : '#6B6B8A', padding: 3, display: 'flex', alignItems: 'center' }}
              title="Move down"
            >
              <ChevronDown size={13} />
            </button>
            <button
              onClick={() => onDelete(action.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 3, display: 'flex', alignItems: 'center' }}
              title="Delete action"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
        {configDefs.map((def, di) => (
          <div key={`${action.id}-cfg-${di}`} style={{ marginBottom: di < configDefs.length - 1 ? 8 : 0 }}>
            <label
              htmlFor={`action-cfg-${action.id}-${di}`}
              style={{ fontSize: 11, color: '#6B6B8A', marginBottom: 3, display: 'block' }}
            >
              {def.label}
            </label>
            <input
              id={`action-cfg-${action.id}-${di}`}
              type="text"
              value={di === 0 ? action.config.field1Value : (action.config.field2Value ?? '')}
              onChange={(e) => onConfigChange(action.id, di === 0 ? 'field1Value' : 'field2Value', e.target.value)}
              placeholder={def.placeholder}
              style={{
                width: '100%', padding: '6px 9px', borderRadius: 6,
                border: '1px solid rgba(0,0,0,0.12)', fontSize: 11,
                color: '#1A1A2E', background: '#FAFAFE', boxSizing: 'border-box',
              }}
            />
          </div>
        ))}
      </div>
      {index < total - 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0', color: '#A0A0B8' }}>
          <ArrowDown size={14} />
        </div>
      )}
    </div>
  )
}

function ActionsSection(props: Readonly<{
  actions: AutomationAction[]
  onAdd: () => void
  onTypeChange: (id: string, type: string) => void
  onConfigChange: (id: string, field: 'field1Value' | 'field2Value', value: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onDelete: (id: string) => void
}>) {
  const { actions, onAdd, onTypeChange, onConfigChange, onMoveUp, onMoveDown, onDelete } = props

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6, background: 'rgba(34,197,94,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Play size={12} color="#22C55E" />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1A2E', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Actions
        </span>
        <button
          onClick={onAdd}
          style={{
            marginLeft: 'auto', background: 'rgba(108,71,255,0.08)', border: '1px solid rgba(108,71,255,0.2)',
            borderRadius: 6, padding: '3px 8px', fontSize: 11, color: '#6C47FF',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <Plus size={11} /> Add Action
        </button>
      </div>
      {actions.length === 0 && (
        <div style={{
          background: '#fff', border: '1px dashed rgba(0,0,0,0.12)', borderRadius: 10,
          padding: '24px', textAlign: 'center', color: '#A0A0B8', fontSize: 11,
        }}>
          No actions yet — add one above
        </div>
      )}
      {actions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {actions.map((action, i) => (
            <ActionCard
              key={action.id}
              action={action}
              index={i}
              total={actions.length}
              onTypeChange={onTypeChange}
              onConfigChange={onConfigChange}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function RunHistoryTab(props: Readonly<{ history: RunHistoryEntry[] }>) {
  const { history } = props

  if (history.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#A0A0B8', fontSize: 12 }}>
        No run history yet
      </div>
    )
  }

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px',
        gap: 8, marginBottom: 8, padding: '0 4px',
      }}>
        {['Timestamp', 'Status', 'Duration', 'Records'].map((col) => (
          <span key={col} style={{ fontSize: 10, fontWeight: 600, color: '#A0A0B8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{col}</span>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {history.map((entry) => (
          <div
            key={entry.id}
            style={{
              display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px',
              gap: 8, padding: '8px 4px',
              borderBottom: '1px solid rgba(0,0,0,0.06)', alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 11, color: '#6B6B8A' }}>{formatTimestamp(entry.timestamp)}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: getRunStatusColor(entry.status), flexShrink: 0,
              }} />
              <span style={{ fontSize: 11, color: getRunStatusColor(entry.status), fontWeight: 500 }}>
                {getRunStatusLabel(entry.status)}
              </span>
            </span>
            <span style={{ fontSize: 11, color: '#6B6B8A', fontVariantNumeric: 'tabular-nums' }}>{entry.duration}</span>
            <span style={{ fontSize: 11, color: '#6B6B8A', fontVariantNumeric: 'tabular-nums' }}>{entry.recordsAffected}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TemplateGallery(props: Readonly<{
  onSelect: (templateId: string) => void
  onCancel: () => void
}>) {
  const { onSelect, onCancel } = props

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '40px 32px',
    }}>
      <div style={{ maxWidth: 560, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, background: 'rgba(108,71,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
          }}>
            <Zap size={22} color="#6C47FF" />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E', margin: '0 0 6px' }}>
            New Automation
          </h2>
          <p style={{ fontSize: 13, color: '#6B6B8A', margin: 0 }}>
            Start from a template or build from scratch
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => onSelect(tpl.id)}
              style={{
                background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10,
                padding: '14px 14px', textAlign: 'left', cursor: 'pointer',
                transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: 6,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A2E', lineHeight: 1.3 }}>
                {tpl.label}
              </span>
              <span style={{ fontSize: 11, color: '#6B6B8A', lineHeight: 1.5 }}>
                {tpl.description}
              </span>
              {tpl.id !== 'tpl-custom' && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  background: 'rgba(108,71,255,0.08)', color: '#6C47FF',
                  borderRadius: 20, padding: '2px 7px', fontSize: 9, fontWeight: 600,
                  letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 2,
                }}>
                  <Zap size={8} /> {tpl.actions.length} action{tpl.actions.length === 1 ? '' : 's'}
                </span>
              )}
              {tpl.id === 'tpl-custom' && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  background: 'rgba(0,0,0,0.05)', color: '#6B6B8A',
                  borderRadius: 20, padding: '2px 7px', fontSize: 9, fontWeight: 600,
                  letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 2,
                }}>
                  Blank
                </span>
              )}
            </button>
          ))}
        </div>
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={onCancel}
            style={{
              background: 'none', border: 'none', color: '#A0A0B8', fontSize: 12,
              cursor: 'pointer', textDecoration: 'underline',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#A0A0B8' }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16, background: 'rgba(108,71,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
      }}>
        <Zap size={26} color="#6C47FF" strokeWidth={1.5} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E', marginBottom: 6 }}>
        Select an automation
      </div>
      <div style={{ fontSize: 12, color: '#A0A0B8', textAlign: 'center', maxWidth: 240 }}>
        Choose an automation from the list, or create a new one to get started.
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>(INITIAL_AUTOMATIONS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [detailTab, setDetailTab] = useState<DetailTab>('editor')
  const [showTemplateGallery, setShowTemplateGallery] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')

  const selectedAutomation = automations.find((a) => a.id === selectedId) ?? null

  const visibleAutomations = automations.filter(
    (a) => matchesFilter(a, filterTab) && matchesSearch(a, searchQuery)
  )

  const totalRuns = automations.reduce((sum, a) => sum + a.runCount, 0)
  const activeCount = automations.filter((a) => a.status === 'active').length

  // ─ List actions ─

  function handleToggleStatus(id: string) {
    setAutomations((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a
        const next: AutomationStatus = a.status === 'active' ? 'paused' : 'active'
        return { ...a, status: next }
      })
    )
  }

  // ─ New automation ─

  function handleNewAutomation() {
    setSelectedId(null)
    setShowTemplateGallery(true)
  }

  function handleTemplateSelect(templateId: string) {
    const tpl = TEMPLATES.find((t) => t.id === templateId)
    if (tpl === undefined) return
    const newId = generateId()
    const newAuto: Automation = {
      id: newId,
      name: tpl.label === 'Custom' ? 'Untitled Automation' : tpl.label,
      status: 'draft',
      triggerType: tpl.triggerType,
      triggerSummary: tpl.triggerType === '' ? 'No trigger set' : getTriggerLabel(tpl.triggerType),
      triggerConfig: { ...tpl.triggerConfig },
      conditions: [],
      conditionLogic: 'AND',
      actions: tpl.actions.map((a) => ({ ...a, id: generateId(), config: { ...a.config } })),
      runCount: 0,
      lastRun: '',
      history: [],
    }
    setAutomations((prev) => [newAuto, ...prev])
    setSelectedId(newId)
    setShowTemplateGallery(false)
    setDetailTab('editor')
  }

  function handleCancelTemplate() {
    setShowTemplateGallery(false)
  }

  // ─ Detail editor actions ─

  function handleNameEdit() {
    if (selectedAutomation === null) return
    setNameInput(selectedAutomation.name)
    setEditingName(true)
  }

  function handleNameSave() {
    if (selectedAutomation === null) return
    const trimmed = nameInput.trim()
    if (trimmed !== '') {
      setAutomations((prev) =>
        prev.map((a) => (a.id === selectedAutomation.id ? { ...a, name: trimmed } : a))
      )
    }
    setEditingName(false)
  }

  function handleDetailToggleStatus() {
    if (selectedAutomation === null) return
    handleToggleStatus(selectedAutomation.id)
  }

  function handleTriggerChange(value: string) {
    if (selectedAutomation === null) return
    setAutomations((prev) =>
      prev.map((a) =>
        a.id === selectedAutomation.id
          ? { ...a, triggerType: value, triggerSummary: getTriggerLabel(value), triggerConfig: {} }
          : a
      )
    )
  }

  function handleTriggerConfigChange(key: string, value: string) {
    if (selectedAutomation === null) return
    setAutomations((prev) =>
      prev.map((a) =>
        a.id === selectedAutomation.id
          ? { ...a, triggerConfig: { ...a.triggerConfig, [key]: value } }
          : a
      )
    )
  }

  function handleAddCondition() {
    if (selectedAutomation === null) return
    if (selectedAutomation.conditions.length >= 3) return
    const newCond: Condition = { id: generateId(), field: '', operator: 'equals', value: '' }
    setAutomations((prev) =>
      prev.map((a) =>
        a.id === selectedAutomation.id
          ? { ...a, conditions: [...a.conditions, newCond] }
          : a
      )
    )
  }

  function handleUpdateCondition(id: string, field: keyof Condition, value: string) {
    if (selectedAutomation === null) return
    const autoId = selectedAutomation.id
    function patchCond(c: Condition) { return c.id === id ? { ...c, [field]: value } : c }
    function patchAuto(a: Automation) { return a.id === autoId ? { ...a, conditions: a.conditions.map(patchCond) } : a }
    setAutomations((prev) => prev.map(patchAuto))
  }

  function handleDeleteCondition(id: string) {
    if (selectedAutomation === null) return
    const autoId = selectedAutomation.id
    function filterCond(c: Condition) { return c.id !== id }
    function patchAuto(a: Automation) { return a.id === autoId ? { ...a, conditions: a.conditions.filter(filterCond) } : a }
    setAutomations((prev) => prev.map(patchAuto))
  }

  function handleToggleConditionLogic() {
    if (selectedAutomation === null) return
    setAutomations((prev) =>
      prev.map((a) =>
        a.id === selectedAutomation.id
          ? { ...a, conditionLogic: a.conditionLogic === 'AND' ? 'OR' : 'AND' }
          : a
      )
    )
  }

  function handleAddAction() {
    if (selectedAutomation === null) return
    const newAction: AutomationAction = {
      id: generateId(),
      type: '',
      config: { field1Label: '', field1Value: '', field2Label: '', field2Value: '' },
    }
    setAutomations((prev) =>
      prev.map((a) =>
        a.id === selectedAutomation.id
          ? { ...a, actions: [...a.actions, newAction] }
          : a
      )
    )
  }

  function handleActionTypeChange(id: string, type: string) {
    if (selectedAutomation === null) return
    const autoId = selectedAutomation.id
    const blankConfig = { field1Label: '', field1Value: '', field2Label: '', field2Value: '' }
    function patchAction(act: AutomationAction) { return act.id === id ? { ...act, type, config: blankConfig } : act }
    function patchAuto(a: Automation) { return a.id === autoId ? { ...a, actions: a.actions.map(patchAction) } : a }
    setAutomations((prev) => prev.map(patchAuto))
  }

  function handleActionConfigChange(id: string, field: 'field1Value' | 'field2Value', value: string) {
    if (selectedAutomation === null) return
    const autoId = selectedAutomation.id
    function patchAction(act: AutomationAction) { return act.id === id ? { ...act, config: { ...act.config, [field]: value } } : act }
    function patchAuto(a: Automation) { return a.id === autoId ? { ...a, actions: a.actions.map(patchAction) } : a }
    setAutomations((prev) => prev.map(patchAuto))
  }

  function handleActionMoveUp(id: string) {
    if (selectedAutomation === null) return
    const autoId = selectedAutomation.id
    function patchAuto(a: Automation) {
      if (a.id !== autoId) return a
      const idx = a.actions.findIndex((act) => act.id === id)
      if (idx <= 0) return a
      const next = [...a.actions]
      const temp = next[idx - 1]
      next[idx - 1] = next[idx]
      next[idx] = temp
      return { ...a, actions: next }
    }
    setAutomations((prev) => prev.map(patchAuto))
  }

  function handleActionMoveDown(id: string) {
    if (selectedAutomation === null) return
    const autoId = selectedAutomation.id
    function patchAuto(a: Automation) {
      if (a.id !== autoId) return a
      const idx = a.actions.findIndex((act) => act.id === id)
      if (idx === -1 || idx >= a.actions.length - 1) return a
      const next = [...a.actions]
      const temp = next[idx + 1]
      next[idx + 1] = next[idx]
      next[idx] = temp
      return { ...a, actions: next }
    }
    setAutomations((prev) => prev.map(patchAuto))
  }

  function handleActionDelete(id: string) {
    if (selectedAutomation === null) return
    const autoId = selectedAutomation.id
    function filterAction(act: AutomationAction) { return act.id !== id }
    function patchAuto(a: Automation) { return a.id === autoId ? { ...a, actions: a.actions.filter(filterAction) } : a }
    setAutomations((prev) => prev.map(patchAuto))
  }

  // ─ Render helpers ─

  function renderStatusBadge(status: AutomationStatus) {
    const labelMap: Record<AutomationStatus, string> = {
      active: 'Active',
      paused: 'Paused',
      draft: 'Draft',
    }
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: `${getStatusColor(status)}18`,
        color: getStatusColor(status),
        borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 600,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: getStatusColor(status) }} />
        {labelMap[status]}
      </span>
    )
  }

  function renderDetailHeader() {
    if (selectedAutomation === null) return null
    return (
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.08)',
        background: '#fff', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          {editingName ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
              <input
                id="automation-name-input"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave() }}
                autoFocus
                style={{
                  flex: 1, fontSize: 15, fontWeight: 600, color: '#1A1A2E',
                  border: '1px solid #6C47FF', borderRadius: 7, padding: '4px 8px',
                  background: '#FAFAFE', outline: 'none',
                }}
              />
              <button
                onClick={handleNameSave}
                style={{ background: '#6C47FF', border: 'none', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                title="Save name"
              >
                <Check size={13} color="#fff" />
              </button>
              <button
                onClick={() => setEditingName(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6B8A', padding: 4 }}
                title="Cancel"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E' }}>
                {selectedAutomation.name}
              </span>
              <button
                onClick={handleNameEdit}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A0A0B8', padding: 3, display: 'flex', alignItems: 'center' }}
                title="Edit name"
              >
                <span style={{ fontSize: 11 }}>✏️</span>
              </button>
            </div>
          )}
          <button
            onClick={handleDetailToggleStatus}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: selectedAutomation.status === 'active' ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
              border: `1px solid ${selectedAutomation.status === 'active' ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)'}`,
              borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600,
              color: selectedAutomation.status === 'active' ? '#F59E0B' : '#22C55E',
              cursor: 'pointer',
            }}
          >
            {selectedAutomation.status === 'active' ? <Pause size={11} /> : <Play size={11} />}
            {selectedAutomation.status === 'active' ? 'Pause' : 'Activate'}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {renderStatusBadge(selectedAutomation.status)}
          <span style={{ fontSize: 11, color: '#6B6B8A' }}>
            <strong style={{ color: '#1A1A2E' }}>{selectedAutomation.runCount}</strong> runs total
          </span>
          <span style={{ fontSize: 11, color: '#6B6B8A' }}>
            Last run: <strong style={{ color: '#1A1A2E' }}>{formatRelativeTime(selectedAutomation.lastRun)}</strong>
          </span>
        </div>
      </div>
    )
  }

  function renderDetailTabs() {
    return (
      <div style={{
        display: 'flex', gap: 0, borderBottom: '1px solid rgba(0,0,0,0.08)',
        padding: '0 20px', background: '#fff', flexShrink: 0,
      }}>
        {(['editor', 'history'] as DetailTab[]).map((tab) => {
          const labelMap: Record<DetailTab, string> = { editor: 'Workflow Editor', history: 'Run History' }
          const isActive = detailTab === tab
          return (
            <button
              key={tab}
              onClick={() => setDetailTab(tab)}
              style={{
                background: 'none', border: 'none', padding: '10px 14px',
                fontSize: 12, fontWeight: isActive ? 600 : 400,
                color: isActive ? '#6C47FF' : '#6B6B8A',
                borderBottom: isActive ? '2px solid #6C47FF' : '2px solid transparent',
                cursor: 'pointer', transition: 'all 0.1s',
              }}
            >
              {labelMap[tab]}
            </button>
          )
        })}
      </div>
    )
  }

  function renderEditorContent() {
    if (selectedAutomation === null) return null
    return (
      <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }} className="content-scroll">
        <TriggerSection
          triggerType={selectedAutomation.triggerType}
          triggerConfig={selectedAutomation.triggerConfig}
          onTriggerChange={handleTriggerChange}
          onConfigChange={handleTriggerConfigChange}
        />
        <ConditionsSection
          conditions={selectedAutomation.conditions}
          logic={selectedAutomation.conditionLogic}
          onAdd={handleAddCondition}
          onUpdate={handleUpdateCondition}
          onDelete={handleDeleteCondition}
          onToggleLogic={handleToggleConditionLogic}
        />
        <ActionsSection
          actions={selectedAutomation.actions}
          onAdd={handleAddAction}
          onTypeChange={handleActionTypeChange}
          onConfigChange={handleActionConfigChange}
          onMoveUp={handleActionMoveUp}
          onMoveDown={handleActionMoveDown}
          onDelete={handleActionDelete}
        />
      </div>
    )
  }

  function renderRightPanel() {
    if (showTemplateGallery) {
      return (
        <TemplateGallery
          onSelect={handleTemplateSelect}
          onCancel={handleCancelTemplate}
        />
      )
    }
    if (selectedAutomation === null) {
      return <EmptyState />
    }
    return (
      <>
        {renderDetailHeader()}
        {renderDetailTabs()}
        {detailTab === 'editor' ? renderEditorContent() : <RunHistoryTab history={selectedAutomation.history} />}
      </>
    )
  }

  const filterTabs: Array<{ key: FilterTab; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'paused', label: 'Paused' },
    { key: 'draft', label: 'Draft' },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#FAFAFE' }}>
      {/* Top bar */}
      <div style={{
        height: 44, borderBottom: '1px solid rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'center', padding: '0 18px', gap: 10,
        flexShrink: 0, background: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6, background: 'rgba(108,71,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={12} color="#6C47FF" />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>Automations</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#A0A0B8' }}>
            {activeCount} active · {automations.length} total
          </span>
          <button
            onClick={handleNewAutomation}
            style={{
              background: '#6C47FF', color: '#fff', border: 'none', borderRadius: 8,
              padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <Plus size={12} /> New Automation
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{
        padding: '12px 18px', borderBottom: '1px solid rgba(0,0,0,0.07)',
        display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 220px))', gap: 12,
        background: '#fff', flexShrink: 0,
      }}>
        <KpiCard
          icon={<Zap size={18} color="#6C47FF" />}
          label="Total Automations"
          value={String(automations.length)}
          sub={`${activeCount} active right now`}
          accent="#6C47FF"
        />
        <KpiCard
          icon={<BarChart2 size={18} color="#22C55E" />}
          label="Runs This Month"
          value={totalRuns.toLocaleString()}
          sub="Across all automations"
          accent="#22C55E"
        />
        <KpiCard
          icon={<Clock size={18} color="#F59E0B" />}
          label="Time Saved (est.)"
          value="47h"
          sub="Based on avg. 5 min / run"
          accent="#F59E0B"
        />
      </div>

      {/* Split view */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left sidebar */}
        <div style={{
          width: 280, borderRight: '1px solid rgba(0,0,0,0.08)',
          display: 'flex', flexDirection: 'column', background: '#FAFAFE', flexShrink: 0,
        }}>
          {/* Search */}
          <div style={{ padding: '12px 12px 8px', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#A0A0B8' }} />
              <label htmlFor="automation-search" style={{ display: 'none' }}>Search automations</label>
              <input
                id="automation-search"
                type="text"
                placeholder="Search automations…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', padding: '7px 9px 7px 28px', borderRadius: 8,
                  border: '1px solid rgba(0,0,0,0.1)', fontSize: 11, color: '#1A1A2E',
                  background: '#fff', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', padding: '0 12px 8px', gap: 4, flexShrink: 0 }}>
            {filterTabs.map((tab) => {
              const count = tab.key === 'all'
                ? automations.length
                : automations.filter((a) => a.status === tab.key).length
              const isActive = filterTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilterTab(tab.key)}
                  style={{
                    flex: 1, background: isActive ? '#6C47FF' : 'transparent',
                    color: isActive ? '#fff' : '#6B6B8A',
                    border: isActive ? '1px solid #6C47FF' : '1px solid rgba(0,0,0,0.1)',
                    borderRadius: 6, padding: '4px 4px', fontSize: 10, fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.1s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                  }}
                >
                  <span>{tab.label}</span>
                  <span style={{ fontSize: 10, opacity: 0.8 }}>{count}</span>
                </button>
              )
            })}
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }} className="content-scroll">
            {visibleAutomations.length === 0 && (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: '#A0A0B8', fontSize: 11 }}>
                No automations found
              </div>
            )}
            {visibleAutomations.map((auto) => (
              <AutomationRow
                key={auto.id}
                automation={auto}
                isSelected={auto.id === selectedId}
                onSelect={() => { setSelectedId(auto.id); setShowTemplateGallery(false); setDetailTab('editor') }}
                onToggle={() => handleToggleStatus(auto.id)}
              />
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F7F7FB' }}>
          {renderRightPanel()}
        </div>
      </div>
    </div>
  )
}
