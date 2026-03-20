// ============================================================
// VYNE — EventBridge CloudEvents Schemas
// All events flowing through the vyne-events bus
// ============================================================

import type { UUID, ISODateString } from "./entities";

// ── Base Event Structure ──────────────────────────────────────

export interface VyneEvent<T = unknown> {
  specversion: "1.0";
  id: string; // UUID
  source: string; // e.g. "vyne.projects-service"
  type: string; // e.g. "vyne.issue.status_changed"
  datacontenttype: "application/json";
  time: ISODateString;
  tenantId: UUID; // org_id — always present
  data: T;
}

// ── Projects / Issues ─────────────────────────────────────────

export interface IssueCreatedData {
  issueId: UUID;
  projectId: UUID;
  orgId: UUID;
  title: string;
  status: string;
  priority: string;
  assigneeId: UUID | null;
  reporterId: UUID;
}

export type IssueCreatedEvent = VyneEvent<IssueCreatedData> & {
  source: "vyne.projects-service";
  type: "vyne.issue.created";
};

export interface IssueStatusChangedData {
  issueId: UUID;
  projectId: UUID;
  orgId: UUID;
  from: string;
  to: string;
  changedBy: UUID;
}

export type IssueStatusChangedEvent = VyneEvent<IssueStatusChangedData> & {
  source: "vyne.projects-service";
  type: "vyne.issue.status_changed";
};

export interface IssueAssignedData {
  issueId: UUID;
  projectId: UUID;
  orgId: UUID;
  assigneeId: UUID;
  assignedBy: UUID;
}

export type IssueAssignedEvent = VyneEvent<IssueAssignedData> & {
  source: "vyne.projects-service";
  type: "vyne.issue.assigned";
};

// ── ERP / Orders ──────────────────────────────────────────────

export interface OrderConfirmedData {
  orderId: UUID;
  orgId: UUID;
  orderNumber: string;
  customerId: UUID;
  totalAmount: number;
  currency: string;
  lineCount: number;
}

export type OrderConfirmedEvent = VyneEvent<OrderConfirmedData> & {
  source: "vyne.erp-service";
  type: "vyne.order.confirmed";
};

export interface OrderFailedData {
  orderId: UUID;
  orgId: UUID;
  orderNumber: string;
  reason: string;
  affectedCount: number;
  estimatedRevenueLoss: number;
}

export type OrderFailedEvent = VyneEvent<OrderFailedData> & {
  source: "vyne.erp-service";
  type: "vyne.order.failed";
};

export interface InventoryLowData {
  productId: UUID;
  orgId: UUID;
  sku: string;
  productName: string;
  currentQty: number;
  reorderPoint: number;
  reorderQuantity: number;
}

export type InventoryLowEvent = VyneEvent<InventoryLowData> & {
  source: "vyne.erp-service";
  type: "vyne.inventory.low";
};

export interface InventoryDepletedData {
  productId: UUID;
  orgId: UUID;
  sku: string;
  productName: string;
}

export type InventoryDepletedEvent = VyneEvent<InventoryDepletedData> & {
  source: "vyne.erp-service";
  type: "vyne.inventory.depleted";
};

export interface InvoiceOverdueData {
  invoiceId: UUID;
  orgId: UUID;
  invoiceNumber: string;
  orderId: UUID;
  amountDue: number;
  amountPaid: number;
  dueDate: ISODateString;
}

export type InvoiceOverdueEvent = VyneEvent<InvoiceOverdueData> & {
  source: "vyne.erp-service";
  type: "vyne.invoice.overdue";
};

export interface WorkOrderStartedData {
  workOrderId: UUID;
  orgId: UUID;
  productId: UUID;
  qtyPlanned: number;
  assignedTo: UUID | null;
}

export type WorkOrderStartedEvent = VyneEvent<WorkOrderStartedData> & {
  source: "vyne.erp-service";
  type: "vyne.work_order.started";
};

export interface WorkOrderCompletedData {
  workOrderId: UUID;
  orgId: UUID;
  productId: UUID;
  qtyProduced: number;
}

export type WorkOrderCompletedEvent = VyneEvent<WorkOrderCompletedData> & {
  source: "vyne.erp-service";
  type: "vyne.work_order.completed";
};

// ── Observability / Incidents ─────────────────────────────────

export interface AlertFiredData {
  alertRuleId: UUID;
  alertHistoryId: UUID;
  orgId: UUID;
  name: string;
  severity: "critical" | "warning" | "info";
  serviceName: string;
  metricName: string;
  valueAtTrigger: number;
  threshold: number;
  channelId: UUID | null;
}

export type AlertFiredEvent = VyneEvent<AlertFiredData> & {
  source: "vyne.observability-service";
  type: "vyne.alert.fired";
};

export interface AlertResolvedData {
  alertRuleId: UUID;
  alertHistoryId: UUID;
  orgId: UUID;
  name: string;
  resolvedAt: ISODateString;
}

export type AlertResolvedEvent = VyneEvent<AlertResolvedData> & {
  source: "vyne.observability-service";
  type: "vyne.alert.resolved";
};

export interface DeploymentFailedData {
  deploymentId: UUID;
  orgId: UUID;
  serviceName: string;
  version: string;
  triggeredBy: UUID;
  errorMessage: string;
  rollbackAvailable: boolean;
  affectedOrderIds: UUID[];
  estimatedRevenueLoss: number;
}

export type DeploymentFailedEvent = VyneEvent<DeploymentFailedData> & {
  source: "vyne.observability-service";
  type: "vyne.deployment.failed";
};

export interface IncidentCreatedData {
  incidentId: UUID;
  orgId: UUID;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  affectedServices: string[];
  channelId: UUID;
}

export type IncidentCreatedEvent = VyneEvent<IncidentCreatedData> & {
  source: "vyne.ai-service";
  type: "vyne.incident.created";
};

// ── Messaging ────────────────────────────────────────────────

export interface MessageMentionData {
  messageId: UUID;
  channelId: UUID;
  orgId: UUID;
  mentionedUserId: UUID;
  authorId: UUID;
  preview: string;
}

export type MessageMentionEvent = VyneEvent<MessageMentionData> & {
  source: "vyne.messaging-service";
  type: "vyne.message.mention";
};

// ── User / Auth ───────────────────────────────────────────────

export interface UserInvitedData {
  orgId: UUID;
  invitedEmail: string;
  invitedBy: UUID;
  role: string;
  inviteToken: string;
}

export type UserInvitedEvent = VyneEvent<UserInvitedData> & {
  source: "vyne.core-service";
  type: "vyne.user.invited";
};

// ── Union Types ───────────────────────────────────────────────

export type AnyVyneEvent =
  | IssueCreatedEvent
  | IssueStatusChangedEvent
  | IssueAssignedEvent
  | OrderConfirmedEvent
  | OrderFailedEvent
  | InventoryLowEvent
  | InventoryDepletedEvent
  | InvoiceOverdueEvent
  | WorkOrderStartedEvent
  | WorkOrderCompletedEvent
  | AlertFiredEvent
  | AlertResolvedEvent
  | DeploymentFailedEvent
  | IncidentCreatedEvent
  | MessageMentionEvent
  | UserInvitedEvent;

// ── Event Type Constants ──────────────────────────────────────

export const EventTypes = {
  ISSUE_CREATED: "vyne.issue.created",
  ISSUE_STATUS_CHANGED: "vyne.issue.status_changed",
  ISSUE_ASSIGNED: "vyne.issue.assigned",
  ORDER_CONFIRMED: "vyne.order.confirmed",
  ORDER_FAILED: "vyne.order.failed",
  INVENTORY_LOW: "vyne.inventory.low",
  INVENTORY_DEPLETED: "vyne.inventory.depleted",
  INVOICE_OVERDUE: "vyne.invoice.overdue",
  WORK_ORDER_STARTED: "vyne.work_order.started",
  WORK_ORDER_COMPLETED: "vyne.work_order.completed",
  ALERT_FIRED: "vyne.alert.fired",
  ALERT_RESOLVED: "vyne.alert.resolved",
  DEPLOYMENT_FAILED: "vyne.deployment.failed",
  INCIDENT_CREATED: "vyne.incident.created",
  MESSAGE_MENTION: "vyne.message.mention",
  USER_INVITED: "vyne.user.invited",
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];
