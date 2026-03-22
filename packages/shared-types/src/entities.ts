// ============================================================
// VYNE — Core Entity Types
// Shared across web, mobile, and all services
// ============================================================

// ── Common ───────────────────────────────────────────────────

export type UUID = string;
export type ISODateString = string;
export type Currency = "USD" | "EUR" | "GBP" | "CAD" | "AUD";

export interface Timestamps {
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface SoftDelete {
  deletedAt: ISODateString | null;
}

// ── Organization ─────────────────────────────────────────────

export type PlanType = "free" | "starter" | "pro" | "enterprise";

export interface Organization {
  id: UUID;
  name: string;
  slug: string;
  logoUrl: string | null;
  plan: PlanType;
  maxMembers: number;
  settings: OrganizationSettings;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface OrganizationSettings {
  defaultTimezone: string;
  fiscalYearStart: number; // month 1-12
  currency: Currency;
  features: {
    erp: boolean;
    observability: boolean;
    ai: boolean;
  };
}

// ── User ─────────────────────────────────────────────────────

export type UserRole =
  | "owner"
  | "admin"
  | "manager"
  | "member"
  | "viewer"
  | "guest";

export type PresenceStatus = "online" | "away" | "offline";

export interface User {
  id: UUID;
  orgId: UUID;
  cognitoId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
  permissions: string[];
  timezone: string;
  presence: PresenceStatus;
  lastSeenAt: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface UserProfile extends User {
  organization: Organization;
}

// ── Issue / Project ──────────────────────────────────────────

export type IssueStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done"
  | "cancelled";

export type IssuePriority = "urgent" | "high" | "medium" | "low" | "none";

export interface Project {
  id: UUID;
  orgId: UUID;
  name: string;
  description: string | null;
  status: "active" | "paused" | "completed" | "archived";
  leadId: UUID | null;
  icon: string | null;
  color: string | null;
  identifier: string; // e.g. "PRJ"
  settings: ProjectSettings;
  memberCount: number;
  issueCount: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface ProjectSettings {
  defaultIssueStatus: IssueStatus;
  defaultIssuePriority: IssuePriority;
  sprintsEnabled: boolean;
  roadmapEnabled: boolean;
}

export interface Sprint {
  id: UUID;
  orgId: UUID;
  projectId: UUID;
  name: string;
  startDate: ISODateString | null;
  endDate: ISODateString | null;
  status: "planned" | "active" | "completed";
  goal: string | null;
  createdAt: ISODateString;
}

export interface Label {
  id: UUID;
  orgId: UUID;
  name: string;
  color: string;
}

export interface Issue {
  id: UUID;
  orgId: UUID;
  projectId: UUID;
  identifier: string; // e.g. "PRJ-42"
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  assigneeId: UUID | null;
  reporterId: UUID;
  sprintId: UUID | null;
  parentIssueId: UUID | null;
  labels: Label[];
  dueDate: ISODateString | null;
  estimate: number | null; // story points
  position: number; // for ordering
  commentCount: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface IssueComment {
  id: UUID;
  orgId: UUID;
  issueId: UUID;
  userId: UUID;
  user: Pick<User, "id" | "name" | "avatarUrl">;
  content: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface IssueActivity {
  id: UUID;
  orgId: UUID;
  issueId: UUID;
  userId: UUID;
  user: Pick<User, "id" | "name" | "avatarUrl">;
  type:
    | "status_changed"
    | "priority_changed"
    | "assignee_changed"
    | "title_changed"
    | "description_changed"
    | "label_added"
    | "label_removed"
    | "sprint_changed"
    | "comment_added"
    | "created";
  fromValue: string | null;
  toValue: string | null;
  createdAt: ISODateString;
}

// ── Messaging ────────────────────────────────────────────────

export type ChannelType = "public" | "private" | "dm" | "system";
export type MessageType = "text" | "system" | "ai_bot" | "rich_embed";

export interface Channel {
  id: UUID;
  orgId: UUID;
  name: string;
  description: string | null;
  type: ChannelType;
  isSystem: boolean;
  topic: string | null;
  createdById: UUID;
  memberCount: number;
  unreadCount: number;
  lastReadAt: ISODateString | null;
  lastMessage: Pick<Message, "id" | "content" | "createdAt"> | null;
  archivedAt: ISODateString | null;
  createdAt: ISODateString;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  userIds: UUID[];
  hasReacted: boolean;
}

export interface MessageAttachment {
  id: UUID;
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface RichEmbed {
  type: string;
  title: string;
  status: "success" | "warning" | "error" | "info";
  fields: Array<{ label: string; value: string }>;
  actions: Array<{ label: string; url: string }>;
  metadata?: Record<string, unknown>;
}

export interface Message {
  id: UUID;
  orgId: UUID;
  channelId: UUID;
  userId: UUID;
  user: Pick<User, "id" | "name" | "avatarUrl">;
  content: string;
  contentRich: Record<string, unknown> | null; // TipTap JSON
  type: MessageType;
  threadId: UUID | null;
  replyCount: number;
  reactions: MessageReaction[];
  attachments: MessageAttachment[];
  richEmbed: RichEmbed | null;
  isEdited: boolean;
  editedAt: ISODateString | null;
  deletedAt: ISODateString | null;
  createdAt: ISODateString;
}

// ── Documents ────────────────────────────────────────────────

export interface Document {
  id: UUID;
  orgId: UUID;
  parentId: UUID | null;
  title: string;
  icon: string | null;
  coverUrl: string | null;
  isPublished: boolean;
  isTemplate: boolean;
  createdById: UUID;
  updatedById: UUID;
  position: number;
  childCount: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface DocumentVersion {
  id: UUID;
  documentId: UUID;
  content: Record<string, unknown>; // TipTap JSON
  version: number;
  createdById: UUID;
  createdAt: ISODateString;
}

// ── ERP ──────────────────────────────────────────────────────

export type OrderStatus =
  | "draft"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type WorkOrderStatus =
  | "draft"
  | "confirmed"
  | "in_progress"
  | "qc"
  | "done"
  | "cancelled";

export interface Product {
  id: UUID;
  orgId: UUID;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  unitOfMeasure: string;
  costPrice: number;
  salePrice: number;
  reorderPoint: number;
  reorderQuantity: number;
  barcode: string | null;
  images: string[];
  isActive: boolean;
  stockLevel?: {
    onHand: number;
    reserved: number;
    available: number;
    status: "healthy" | "low" | "depleted";
  };
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Customer {
  id: UUID;
  orgId: UUID;
  name: string;
  email: string | null;
  phone: string | null;
  address: Address | null;
  createdAt: ISODateString;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderLine {
  id: UUID;
  orderId: UUID;
  productId: UUID;
  product?: Pick<Product, "id" | "name" | "sku">;
  variantId: UUID | null;
  qty: number;
  unitPrice: number;
  discountPercent: number;
  totalPrice: number;
}

export interface Order {
  id: UUID;
  orgId: UUID;
  orderNumber: string;
  customerId: UUID;
  customer?: Pick<Customer, "id" | "name" | "email">;
  status: OrderStatus;
  totalAmount: number;
  taxAmount: number;
  shippingAmount: number;
  currency: Currency;
  shippingAddress: Address | null;
  notes: string | null;
  lines: OrderLine[];
  createdById: UUID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Supplier {
  id: UUID;
  orgId: UUID;
  name: string;
  email: string | null;
  phone: string | null;
  address: Address | null;
  leadTimeDays: number;
  paymentTerms: string | null;
  notes: string | null;
  createdAt: ISODateString;
}

export interface BOMComponent {
  id: UUID;
  bomId: UUID;
  componentProductId: UUID;
  component?: Pick<Product, "id" | "name" | "sku">;
  quantity: number;
  unitOfMeasure: string;
  notes: string | null;
}

export interface BillOfMaterials {
  id: UUID;
  orgId: UUID;
  productId: UUID;
  product?: Pick<Product, "id" | "name" | "sku">;
  version: number;
  isActive: boolean;
  notes: string | null;
  components: BOMComponent[];
  createdAt: ISODateString;
}

export interface WorkOrder {
  id: UUID;
  orgId: UUID;
  productId: UUID;
  product?: Pick<Product, "id" | "name" | "sku">;
  bomId: UUID;
  qtyPlanned: number;
  qtyProduced: number;
  status: WorkOrderStatus;
  scheduledStart: ISODateString | null;
  scheduledEnd: ISODateString | null;
  actualStart: ISODateString | null;
  actualEnd: ISODateString | null;
  assignedTo: UUID | null;
  notes: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Invoice {
  id: UUID;
  orgId: UUID;
  orderId: UUID;
  invoiceNumber: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  amountDue: number;
  amountPaid: number;
  dueDate: ISODateString;
  issuedAt: ISODateString | null;
  createdAt: ISODateString;
}

// ── Observability ────────────────────────────────────────────

export interface MetricPoint {
  time: ISODateString;
  orgId: UUID;
  serviceName: string;
  metricName: string;
  value: number;
  labels: Record<string, string>;
}

export interface AlertRule {
  id: UUID;
  orgId: UUID;
  name: string;
  condition: string;
  threshold: number;
  comparison: "gt" | "lt" | "gte" | "lte" | "eq";
  evaluationWindow: number; // seconds
  severity: "critical" | "warning" | "info";
  channelId: UUID | null;
  isActive: boolean;
  createdAt: ISODateString;
}

export interface AlertHistory {
  id: UUID;
  ruleId: UUID;
  orgId: UUID;
  triggeredAt: ISODateString;
  resolvedAt: ISODateString | null;
  valueAtTrigger: number;
  status: "firing" | "resolved";
}

// ── Code / DevOps ────────────────────────────────────────────

export type DeploymentStatus =
  | "in_progress"
  | "success"
  | "failed"
  | "rolled_back";

export interface Deployment {
  id: UUID;
  orgId: UUID;
  serviceName: string;
  version: string | null;
  environment: string;
  status: DeploymentStatus;
  triggeredBy: UUID | null;
  commitSha: string | null;
  commitMessage: string | null;
  branch: string | null;
  startedAt: ISODateString;
  completedAt: ISODateString | null;
  metadata: Record<string, unknown>;
}

export interface DeploymentStats {
  totalThisWeek: number;
  successRate: number | null;
  avgDurationSeconds: number | null;
}

export type PullRequestState = "open" | "closed" | "merged";

export interface PullRequest {
  id: UUID;
  orgId: UUID;
  repoName: string;
  prNumber: number;
  title: string | null;
  state: PullRequestState;
  author: string | null;
  baseBranch: string | null;
  headBranch: string | null;
  url: string | null;
  openedAt: ISODateString | null;
  mergedAt: ISODateString | null;
  closedAt: ISODateString | null;
}

export interface PullRequestStats {
  openCount: number;
  mergedThisWeek: number;
  avgHoursToMerge: number | null;
}

export interface Repository {
  id: UUID;
  orgId: UUID;
  repoName: string;
  githubUrl: string | null;
  defaultBranch: string;
  connectedAt: ISODateString;
  lastDeployAt: ISODateString | null;
  lastDeployStatus: DeploymentStatus | null;
}

// ── Notifications ────────────────────────────────────────────

export type NotificationType =
  | "mention"
  | "issue_assigned"
  | "issue_comment"
  | "issue_status_changed"
  | "channel_message"
  | "alert_fired"
  | "order_failed"
  | "inventory_low"
  | "deployment_failed";

export interface Notification {
  id: UUID;
  userId: UUID;
  orgId: UUID;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  isRead: boolean;
  readAt: ISODateString | null;
  createdAt: ISODateString;
}

// ── Status / Priority Metadata ──────────────────────────────

export const STATUS_META: Record<
  Exclude<IssueStatus, "cancelled">,
  { label: string; color: string; bgColor: string }
> = {
  backlog: { label: "Backlog", color: "#A0A0B8", bgColor: "#F0F0F8" },
  todo: { label: "Todo", color: "#6B6B8A", bgColor: "#EBEBF5" },
  in_progress: { label: "In Progress", color: "#3B82F6", bgColor: "#EFF6FF" },
  in_review: { label: "In Review", color: "#F59E0B", bgColor: "#FFFBEB" },
  done: { label: "Done", color: "#22C55E", bgColor: "#F0FDF4" },
};

export const PRIORITY_META: Record<
  IssuePriority,
  { label: string; color: string }
> = {
  urgent: { label: "Urgent", color: "#EF4444" },
  high: { label: "High", color: "#F59E0B" },
  medium: { label: "Medium", color: "#3B82F6" },
  low: { label: "Low", color: "#A0A0B8" },
  none: { label: "No Priority", color: "#D1D1E0" },
};

export const PROJECT_COLORS = [
  "#6C47FF",
  "#3B82F6",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#8B5CF6",
  "#06B6D4",
] as const;
