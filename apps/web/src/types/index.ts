// ─── User & Auth ────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  orgId: string;
  role: "owner" | "admin" | "member" | "viewer";
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  createdAt: string;
}

// ─── Projects ───────────────────────────────────────────────────
export interface Project {
  id: string;
  orgId: string;
  name: string;
  identifier: string;
  description?: string;
  color: string;
  icon?: string;
  leadId?: string;
  lead?: User;
  memberIds: string[];
  members?: User[];
  issueCounts: {
    backlog: number;
    todo: number;
    inProgress: number;
    inReview: number;
    done: number;
    total: number;
  };
  createdAt: string;
  updatedAt: string;
}

// ─── Issues ─────────────────────────────────────────────────────
export type IssueStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done";
export type IssuePriority =
  | "urgent"
  | "high"
  | "medium"
  | "low"
  | "no_priority";

export interface Issue {
  id: string;
  projectId: string;
  project?: Project;
  identifier: string;
  title: string;
  description?: string;
  status: IssueStatus;
  priority: IssuePriority;
  assigneeId?: string;
  assignee?: User;
  reporterId: string;
  reporter?: User;
  labels: Label[];
  dueDate?: string;
  estimate?: number;
  order: number;
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

// ─── Comments ───────────────────────────────────────────────────
export interface Comment {
  id: string;
  issueId: string;
  authorId: string;
  author?: User;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Activity ───────────────────────────────────────────────────
export interface ActivityEvent {
  id: string;
  type: string;
  issueId: string;
  userId: string;
  user?: User;
  data: Record<string, unknown>;
  createdAt: string;
}

// ─── Chat ───────────────────────────────────────────────────────
export interface Channel {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  memberIds: string[];
  createdAt: string;
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  author?: User;
  content: string;
  attachments?: Attachment[];
  replyCount: number;
  reactions: Reaction[];
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  url: string;
  name: string;
  type: string;
  size: number;
}

export interface Reaction {
  emoji: string;
  count: number;
  userIds: string[];
}

// ─── Docs ────────────────────────────────────────────────────────
export interface Document {
  id: string;
  orgId: string;
  parentId?: string | null;
  title: string;
  icon?: string | null;
  coverUrl?: string | null;
  isPublished: boolean;
  isTemplate: boolean;
  createdBy: string;
  updatedBy?: string | null;
  position: number;
  content?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Code / DevOps ───────────────────────────────────────────────
export type DeploymentStatus =
  | "in_progress"
  | "success"
  | "failed"
  | "rolled_back";

export interface Deployment {
  id: string;
  orgId: string;
  serviceName: string;
  version?: string | null;
  environment: string;
  status: DeploymentStatus;
  triggeredBy?: string | null;
  commitSha?: string | null;
  commitMessage?: string | null;
  branch?: string | null;
  startedAt: string;
  completedAt?: string | null;
  metadata: Record<string, unknown>;
}

export interface DeploymentStats {
  totalThisWeek: number;
  successRate: number | null;
  avgDurationSeconds: number | null;
}

export type PullRequestState = "open" | "closed" | "merged";

export interface PullRequest {
  id: string;
  orgId: string;
  repoName: string;
  prNumber: number;
  title?: string | null;
  state: PullRequestState;
  author?: string | null;
  baseBranch?: string | null;
  headBranch?: string | null;
  url?: string | null;
  openedAt?: string | null;
  mergedAt?: string | null;
  closedAt?: string | null;
}

export interface PullRequestStats {
  openCount: number;
  mergedThisWeek: number;
  avgHoursToMerge: number | null;
}

export interface Repository {
  id: string;
  orgId: string;
  repoName: string;
  githubUrl?: string | null;
  defaultBranch: string;
  connectedAt: string;
  lastDeployAt?: string | null;
  lastDeployStatus?: DeploymentStatus | null;
}

// ─── API Response Types ──────────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    page: number;
    perPage: number;
  };
}

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
}

// ─── Paginated Response Types ───────────────────────────────────

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

// ─── UI Types ───────────────────────────────────────────────────
export type Module = "projects" | "chat" | "docs" | "code" | "observe" | "ops";

export interface FilterState {
  status?: IssueStatus[];
  priority?: IssuePriority[];
  assigneeId?: string[];
  labelId?: string[];
  search?: string;
}

export interface KanbanColumn {
  id: IssueStatus;
  label: string;
  color: string;
  issues: Issue[];
}

// ─── Status / Priority Metadata ─────────────────────────────────
export const STATUS_META: Record<
  IssueStatus,
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
  no_priority: { label: "No Priority", color: "#D1D1E0" },
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
];
