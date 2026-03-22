// ============================================================
// VYNE — API Request / Response Types
// Used by frontend clients and BFF layer
// ============================================================

import type {
  Issue,
  IssueStatus,
  IssuePriority,
  Project,
  Sprint,
  Label,
  Channel,
  Message,
  Document,
  User,
  UserRole,
  Organization,
  Product,
  Order,
  OrderStatus,
  Customer,
  Supplier,
  BillOfMaterials,
  WorkOrder,
  Invoice,
  AlertRule,
  Deployment,
  DeploymentStatus,
  UUID,
} from "./entities";

// ── Generic Wrappers ──────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
    cursor?: string;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
    traceId?: string;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

/** Standard offset-based paginated response envelope. */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Cursor-based paginated response envelope for feeds / infinite scroll. */
export interface CursorPaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
}

// ── Auth ─────────────────────────────────────────────────────

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  organizationName: string;
  organizationSlug: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
  organization: Organization;
}

export interface InviteUserRequest {
  email: string;
  role: UserRole;
  name: string;
}

export interface UpdateUserRoleRequest {
  role: UserRole;
}

// ── Projects ─────────────────────────────────────────────────

export interface CreateProjectRequest {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  leadId?: UUID;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  leadId?: UUID;
  status?: Project["status"];
  settings?: Partial<Project["settings"]>;
}

export interface CreateIssueRequest {
  title: string;
  description?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  assigneeId?: UUID;
  sprintId?: UUID;
  parentIssueId?: UUID;
  labelIds?: UUID[];
  dueDate?: string;
  estimate?: number;
}

export interface UpdateIssueRequest {
  title?: string;
  description?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  assigneeId?: UUID | null;
  sprintId?: UUID | null;
  parentIssueId?: UUID | null;
  labelIds?: UUID[];
  dueDate?: string | null;
  estimate?: number | null;
}

export interface ReorderIssuesRequest {
  issues: Array<{ id: UUID; position: number }>;
}

export interface IssueFilters extends PaginationParams {
  status?: IssueStatus | IssueStatus[];
  priority?: IssuePriority | IssuePriority[];
  assigneeId?: UUID;
  labelId?: UUID;
  sprintId?: UUID;
  q?: string;
  sortBy?: "priority" | "status" | "createdAt" | "updatedAt" | "position";
  sortDir?: "asc" | "desc";
}

export interface CreateSprintRequest {
  name: string;
  startDate?: string;
  endDate?: string;
  goal?: string;
}

export interface CreateCommentRequest {
  content: string;
}

// ── Messaging ────────────────────────────────────────────────

export interface CreateChannelRequest {
  name: string;
  description?: string;
  type?: "public" | "private";
  memberIds?: UUID[];
}

export interface CreateDMRequest {
  userId: UUID;
}

export interface SendMessageRequest {
  content: string;
  contentRich?: Record<string, unknown>;
  threadId?: UUID;
  attachments?: Array<{
    name: string;
    url: string;
    mimeType: string;
    size: number;
  }>;
}

export interface UpdateMessageRequest {
  content: string;
  contentRich?: Record<string, unknown>;
}

export interface AddReactionRequest {
  emoji: string;
}

export interface MessageFilters extends PaginationParams {
  before?: string; // cursor (message id)
  after?: string;
}

export interface MarkReadRequest {
  lastReadAt: string;
}

export interface SearchMessagesRequest {
  q: string;
  channelId?: UUID;
  limit?: number;
}

// ── Documents ────────────────────────────────────────────────

export interface CreateDocumentRequest {
  title: string;
  parentId?: UUID;
  icon?: string;
}

export interface UpdateDocumentRequest {
  title?: string;
  icon?: string;
  coverUrl?: string;
  content?: Record<string, unknown>; // TipTap JSON
  isPublished?: boolean;
}

export interface ReorderDocumentsRequest {
  documents: Array<{ id: UUID; position: number; parentId?: UUID }>;
}

// ── ERP ──────────────────────────────────────────────────────

export interface CreateProductRequest {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unitOfMeasure: string;
  costPrice: number;
  salePrice: number;
  reorderPoint: number;
  reorderQuantity: number;
  barcode?: string;
  weight?: number;
  images?: string[];
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  isActive?: boolean;
}

export interface ProductFilters extends PaginationParams {
  q?: string;
  category?: string;
  isActive?: boolean;
  belowReorderPoint?: boolean;
}

export interface StockAdjustmentRequest {
  productId: UUID;
  locationId: UUID;
  qty: number;
  notes?: string;
}

export interface StockTransferRequest {
  productId: UUID;
  fromLocationId: UUID;
  toLocationId: UUID;
  qty: number;
  notes?: string;
}

export interface CreateOrderRequest {
  customerId: UUID;
  currency?: string;
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  notes?: string;
  lines: Array<{
    productId: UUID;
    variantId?: UUID;
    qty: number;
    unitPrice: number;
    discountPercent?: number;
  }>;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  notes?: string;
}

export interface OrderFilters extends PaginationParams {
  status?: OrderStatus;
  customerId?: UUID;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
}

export interface CreateWorkOrderRequest {
  productId: UUID;
  bomId: UUID;
  qtyPlanned: number;
  scheduledStart?: string;
  scheduledEnd?: string;
  assignedTo?: UUID;
  notes?: string;
}

export interface MRPExplosionRequest {
  productId: UUID;
  qty: number;
}

export interface MRPExplosionResult {
  productId: UUID;
  qty: number;
  components: Array<{
    productId: UUID;
    product: Pick<Product, "id" | "name" | "sku">;
    required: number;
    available: number;
    shortage: number;
    needToPurchase: number;
  }>;
}

export interface RecordPaymentRequest {
  amountPaid: number;
  paidAt?: string;
  notes?: string;
}

// ── AI ───────────────────────────────────────────────────────

export interface AIQueryRequest {
  query: string;
  context?: {
    channelId?: UUID;
    projectId?: UUID;
    issueId?: UUID;
  };
}

export interface AIQueryResponse {
  answer: string;
  sources: Array<{
    type: "issue" | "message" | "document" | "metric";
    id: UUID;
    title: string;
    excerpt: string;
    score: number;
  }>;
  agentUsed: string;
  tokensUsed: number;
}

export interface HybridSearchRequest {
  q: string;
  sources?: Array<"issues" | "messages" | "documents">;
  limit?: number;
}

export interface HybridSearchResult {
  type: "issue" | "message" | "document";
  id: UUID;
  title: string;
  excerpt: string;
  score: number;
  metadata: Record<string, unknown>;
}

// ── Observability ────────────────────────────────────────────

export interface MetricQueryParams {
  serviceName?: string;
  metricName?: string;
  from: string;
  to: string;
  step?: number; // seconds
}

export interface CreateAlertRuleRequest {
  name: string;
  condition: string;
  threshold: number;
  comparison: AlertRule["comparison"];
  evaluationWindow: number;
  severity: AlertRule["severity"];
  channelId?: UUID;
}

export interface LogSearchParams extends PaginationParams {
  serviceName?: string;
  level?: "debug" | "info" | "warn" | "error";
  q?: string;
  from?: string;
  to?: string;
  traceId?: string;
}

// ── Code / DevOps ────────────────────────────────────────────

export interface DeploymentFilters extends PaginationParams {
  serviceName?: string;
  environment?: string;
  status?: DeploymentStatus;
  branch?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateDeploymentRequest {
  serviceName: string;
  version?: string;
  environment: string;
  commitSha?: string;
  commitMessage?: string;
  branch?: string;
  metadata?: Record<string, unknown>;
}

export interface ConnectRepositoryRequest {
  repoName: string;
  githubUrl: string;
  defaultBranch?: string;
}

export interface UpdateRepositoryRequest {
  defaultBranch?: string;
  githubUrl?: string;
}

export interface PullRequestFilters extends PaginationParams {
  repoName?: string;
  state?: "open" | "closed" | "merged";
  author?: string;
}

// ── Upload ───────────────────────────────────────────────────

export interface UploadUrlRequest {
  filename: string;
  mimeType: string;
  size: number;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  fileUrl: string;
  expiresAt: string;
}

// ── Convenience Aliases ─────────────────────────────────────

/** Alias for RegisterRequest — used in some frontend forms. */
export type SignupRequest = RegisterRequest;

/** Alias for AuthResponse — used by login flows. */
export type LoginResponse = AuthResponse;
