// ─── Project Detail Fixtures ──────────────────────────────────────
// Mock data for the project detail / task management views.

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  color: string;
  avatarUrl?: string;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
  assigneeId: string | null;
  dueDate: string | null;
}

export interface TaskComment {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  type:
    | "status_change"
    | "assignment"
    | "comment"
    | "created"
    | "priority_change";
  userId: string;
  description: string;
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
}

export type TaskStatus =
  | "todo"
  | "in_progress"
  | "in_review"
  | "done"
  | "blocked";
export type TaskPriority = "urgent" | "high" | "medium" | "low";

export interface Task {
  id: string;
  projectId: string;
  key: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  startDate: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
  timeSpent: number | null;
  tags: string[];
  subtasks: Subtask[];
  comments: TaskComment[];
  activity: ActivityEntry[];
  attachments: TaskAttachment[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail {
  id: string;
  name: string;
  identifier: string;
  description: string;
  color: string;
  icon: string;
  status: "active" | "paused" | "completed";
  memberIds: string[];
  leadId: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Team Members ────────────────────────────────────────────────

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: "u1",
    name: "Preet R.",
    initials: "PR",
    role: "Founder / Lead",
    color: "#6C47FF",
  },
  {
    id: "u2",
    name: "Sarah K.",
    initials: "SK",
    role: "Frontend Engineer",
    color: "#22C55E",
  },
  {
    id: "u3",
    name: "Tony M.",
    initials: "TM",
    role: "Backend Engineer",
    color: "#F59E0B",
  },
  {
    id: "u4",
    name: "Alex R.",
    initials: "AR",
    role: "DevOps Engineer",
    color: "#3B82F6",
  },
  {
    id: "u5",
    name: "Emma W.",
    initials: "EW",
    role: "Designer",
    color: "#EC4899",
  },
  {
    id: "u6",
    name: "James C.",
    initials: "JC",
    role: "ML Engineer",
    color: "#8B5CF6",
  },
];

export function getMember(id: string): TeamMember | undefined {
  return TEAM_MEMBERS.find((m) => m.id === id);
}

// ─── Projects ────────────────────────────────────────────────────

export const DEMO_PROJECT_DETAILS: ProjectDetail[] = [
  {
    id: "1",
    name: "Vyne Platform",
    identifier: "VYNE",
    description:
      "Core SaaS platform — dashboard, APIs, real-time features, and integrations.",
    color: "#6C47FF",
    icon: "🚀",
    status: "active",
    memberIds: ["u1", "u2", "u3", "u4", "u5", "u6"],
    leadId: "u1",
    createdAt: "2025-12-01T00:00:00Z",
    updatedAt: "2026-03-22T00:00:00Z",
  },
  {
    id: "2",
    name: "Mobile App",
    identifier: "MOB",
    description:
      "React Native cross-platform mobile application for iOS and Android.",
    color: "#22C55E",
    icon: "📱",
    status: "active",
    memberIds: ["u1", "u2", "u5"],
    leadId: "u2",
    createdAt: "2026-01-15T00:00:00Z",
    updatedAt: "2026-03-21T00:00:00Z",
  },
  {
    id: "3",
    name: "AI Engine",
    identifier: "AI",
    description:
      "LangGraph agents, ML models, and AI-powered features across the platform.",
    color: "#F59E0B",
    icon: "🧠",
    status: "active",
    memberIds: ["u1", "u3", "u6"],
    leadId: "u6",
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-03-22T00:00:00Z",
  },
  {
    id: "4",
    name: "Infrastructure",
    identifier: "INFRA",
    description:
      "Terraform, CI/CD pipelines, AWS resources, monitoring, and security.",
    color: "#3B82F6",
    icon: "☁️",
    status: "active",
    memberIds: ["u1", "u4"],
    leadId: "u4",
    createdAt: "2026-01-20T00:00:00Z",
    updatedAt: "2026-03-20T00:00:00Z",
  },
];

// ─── Tasks ───────────────────────────────────────────────────────

export const DEMO_TASKS: Task[] = [
  // ── Vyne Platform (id: "1") ────────────────────────────────────
  {
    id: "t1",
    projectId: "1",
    key: "VYNE-43",
    title: "Fix Secrets Manager IAM permissions for ECS tasks",
    description:
      "The ECS task execution role is missing `secretsmanager:GetSecretValue` permissions. This causes container startup failures when the service tries to inject secrets. Need to update the IAM policy in Terraform and redeploy.",
    status: "in_progress",
    priority: "urgent",
    assigneeId: "u1",
    startDate: "2026-03-18T00:00:00Z",
    dueDate: "2026-03-23T00:00:00Z",
    estimatedHours: 4,
    timeSpent: 2.5,
    tags: ["devops", "security"],
    subtasks: [
      {
        id: "st1",
        title: "Audit current IAM policy",
        done: true,
        assigneeId: "u1",
        dueDate: "2026-03-19T00:00:00Z",
      },
      {
        id: "st2",
        title: "Update Terraform IAM module",
        done: true,
        assigneeId: "u1",
        dueDate: "2026-03-20T00:00:00Z",
      },
      {
        id: "st3",
        title: "Test in staging environment",
        done: false,
        assigneeId: "u4",
        dueDate: "2026-03-22T00:00:00Z",
      },
      {
        id: "st4",
        title: "Deploy to production",
        done: false,
        assigneeId: "u1",
        dueDate: "2026-03-23T00:00:00Z",
      },
    ],
    comments: [
      {
        id: "c1",
        authorId: "u4",
        content:
          "I can help test the staging deploy once the Terraform changes are ready.",
        createdAt: "2026-03-19T10:30:00Z",
      },
      {
        id: "c2",
        authorId: "u1",
        content: "Terraform changes pushed. Staging pipeline running now.",
        createdAt: "2026-03-20T14:00:00Z",
      },
    ],
    activity: [
      {
        id: "a1",
        type: "created",
        userId: "u1",
        description: "created this task",
        createdAt: "2026-03-18T09:00:00Z",
      },
      {
        id: "a2",
        type: "assignment",
        userId: "u1",
        description: "assigned to Preet R.",
        createdAt: "2026-03-18T09:01:00Z",
      },
      {
        id: "a3",
        type: "status_change",
        userId: "u1",
        description: "changed status from Todo to In Progress",
        createdAt: "2026-03-19T08:00:00Z",
      },
    ],
    attachments: [
      {
        id: "att1",
        name: "iam-policy-diff.json",
        type: "application/json",
        size: "2.3 KB",
        uploadedBy: "u1",
        uploadedAt: "2026-03-20T14:05:00Z",
      },
    ],
    order: 0,
    createdAt: "2026-03-18T09:00:00Z",
    updatedAt: "2026-03-22T00:00:00Z",
  },
  {
    id: "t2",
    projectId: "1",
    key: "VYNE-45",
    title: "LangGraph agent orchestration review",
    description:
      "Review the multi-agent workflow for the AI assistant. Ensure proper error handling, retry logic, and graceful degradation when individual agents fail.",
    status: "in_review",
    priority: "high",
    assigneeId: "u6",
    startDate: "2026-03-15T00:00:00Z",
    dueDate: "2026-03-24T00:00:00Z",
    estimatedHours: 12,
    timeSpent: 9,
    tags: ["ai", "review"],
    subtasks: [
      {
        id: "st5",
        title: "Review agent routing logic",
        done: true,
        assigneeId: "u6",
        dueDate: "2026-03-18T00:00:00Z",
      },
      {
        id: "st6",
        title: "Test error recovery paths",
        done: true,
        assigneeId: "u6",
        dueDate: "2026-03-20T00:00:00Z",
      },
      {
        id: "st7",
        title: "Write integration tests",
        done: true,
        assigneeId: "u3",
        dueDate: "2026-03-22T00:00:00Z",
      },
      {
        id: "st8",
        title: "Document agent API contracts",
        done: false,
        assigneeId: "u6",
        dueDate: "2026-03-24T00:00:00Z",
      },
      {
        id: "st9",
        title: "Performance benchmarks",
        done: false,
        assigneeId: "u3",
        dueDate: "2026-03-24T00:00:00Z",
      },
    ],
    comments: [
      {
        id: "c3",
        authorId: "u6",
        content:
          "The routing logic looks clean. Found a potential race condition in the parallel agent execution.",
        createdAt: "2026-03-18T16:00:00Z",
      },
      {
        id: "c4",
        authorId: "u3",
        content: "Integration tests are passing. Coverage at 87%.",
        createdAt: "2026-03-22T11:00:00Z",
      },
    ],
    activity: [
      {
        id: "a4",
        type: "created",
        userId: "u1",
        description: "created this task",
        createdAt: "2026-03-15T10:00:00Z",
      },
      {
        id: "a5",
        type: "assignment",
        userId: "u1",
        description: "assigned to James C.",
        createdAt: "2026-03-15T10:02:00Z",
      },
      {
        id: "a6",
        type: "status_change",
        userId: "u6",
        description: "changed status from In Progress to In Review",
        createdAt: "2026-03-21T17:00:00Z",
      },
    ],
    attachments: [],
    order: 1,
    createdAt: "2026-03-15T10:00:00Z",
    updatedAt: "2026-03-22T00:00:00Z",
  },
  {
    id: "t3",
    projectId: "1",
    key: "VYNE-41",
    title: "TimescaleDB metrics schema migration",
    description:
      "Create hypertable schema for observability metrics. Add continuous aggregates for 1-hour and 1-day rollups. Need to handle the migration carefully to avoid downtime.",
    status: "in_progress",
    priority: "medium",
    assigneeId: "u3",
    startDate: "2026-03-14T00:00:00Z",
    dueDate: "2026-03-25T00:00:00Z",
    estimatedHours: 16,
    timeSpent: 8,
    tags: ["database", "observability"],
    subtasks: [
      {
        id: "st10",
        title: "Design hypertable schema",
        done: true,
        assigneeId: "u3",
        dueDate: "2026-03-16T00:00:00Z",
      },
      {
        id: "st11",
        title: "Write migration scripts",
        done: true,
        assigneeId: "u3",
        dueDate: "2026-03-19T00:00:00Z",
      },
      {
        id: "st12",
        title: "Create continuous aggregates",
        done: false,
        assigneeId: "u3",
        dueDate: "2026-03-22T00:00:00Z",
      },
      {
        id: "st13",
        title: "Load test with sample data",
        done: false,
        assigneeId: "u4",
        dueDate: "2026-03-24T00:00:00Z",
      },
      {
        id: "st14",
        title: "Run migration in staging",
        done: false,
        assigneeId: "u3",
        dueDate: "2026-03-25T00:00:00Z",
      },
    ],
    comments: [
      {
        id: "c5",
        authorId: "u3",
        content:
          "Schema design doc is ready for review. Using chunk_time_interval of 1 day.",
        createdAt: "2026-03-16T14:00:00Z",
      },
    ],
    activity: [
      {
        id: "a7",
        type: "created",
        userId: "u3",
        description: "created this task",
        createdAt: "2026-03-14T09:00:00Z",
      },
      {
        id: "a8",
        type: "status_change",
        userId: "u3",
        description: "changed status from Todo to In Progress",
        createdAt: "2026-03-15T08:00:00Z",
      },
    ],
    attachments: [
      {
        id: "att2",
        name: "schema-design.sql",
        type: "text/sql",
        size: "4.8 KB",
        uploadedBy: "u3",
        uploadedAt: "2026-03-16T14:05:00Z",
      },
    ],
    order: 2,
    createdAt: "2026-03-14T09:00:00Z",
    updatedAt: "2026-03-22T00:00:00Z",
  },
  {
    id: "t4",
    projectId: "1",
    key: "VYNE-50",
    title: "Chat file upload with S3 presigned URLs",
    description:
      "Implement file upload in the chat module using S3 presigned URLs. Support images, PDFs, and documents up to 25 MB. Show upload progress and thumbnail previews.",
    status: "todo",
    priority: "high",
    assigneeId: "u2",
    startDate: "2026-03-24T00:00:00Z",
    dueDate: "2026-03-28T00:00:00Z",
    estimatedHours: 10,
    timeSpent: 0,
    tags: ["frontend", "chat"],
    subtasks: [
      {
        id: "st15",
        title: "Create presigned URL API endpoint",
        done: false,
        assigneeId: "u3",
        dueDate: "2026-03-25T00:00:00Z",
      },
      {
        id: "st16",
        title: "Build upload UI component",
        done: false,
        assigneeId: "u2",
        dueDate: "2026-03-26T00:00:00Z",
      },
      {
        id: "st17",
        title: "Add progress indicator",
        done: false,
        assigneeId: "u2",
        dueDate: "2026-03-27T00:00:00Z",
      },
      {
        id: "st18",
        title: "Implement thumbnail generation",
        done: false,
        assigneeId: "u2",
        dueDate: "2026-03-28T00:00:00Z",
      },
    ],
    comments: [],
    activity: [
      {
        id: "a9",
        type: "created",
        userId: "u1",
        description: "created this task",
        createdAt: "2026-03-21T11:00:00Z",
      },
      {
        id: "a10",
        type: "assignment",
        userId: "u1",
        description: "assigned to Sarah K.",
        createdAt: "2026-03-21T11:02:00Z",
      },
    ],
    attachments: [],
    order: 3,
    createdAt: "2026-03-21T11:00:00Z",
    updatedAt: "2026-03-21T11:00:00Z",
  },
  {
    id: "t5",
    projectId: "1",
    key: "VYNE-48",
    title: "Dark mode CSS variable cleanup",
    description:
      "Replace all remaining hardcoded color values with CSS custom properties. Ensure consistent dark mode support across all dashboard pages.",
    status: "done",
    priority: "medium",
    assigneeId: "u5",
    startDate: "2026-03-17T00:00:00Z",
    dueDate: "2026-03-21T00:00:00Z",
    estimatedHours: 6,
    timeSpent: 5,
    tags: ["frontend", "design"],
    subtasks: [
      {
        id: "st19",
        title: "Audit hardcoded colors",
        done: true,
        assigneeId: "u5",
        dueDate: "2026-03-18T00:00:00Z",
      },
      {
        id: "st20",
        title: "Replace in dashboard pages",
        done: true,
        assigneeId: "u5",
        dueDate: "2026-03-19T00:00:00Z",
      },
      {
        id: "st21",
        title: "Replace in components",
        done: true,
        assigneeId: "u2",
        dueDate: "2026-03-20T00:00:00Z",
      },
      {
        id: "st22",
        title: "Visual regression test",
        done: true,
        assigneeId: "u5",
        dueDate: "2026-03-21T00:00:00Z",
      },
    ],
    comments: [
      {
        id: "c6",
        authorId: "u5",
        content:
          "Found 47 hardcoded color values across the codebase. Spreadsheet attached.",
        createdAt: "2026-03-18T10:00:00Z",
      },
      {
        id: "c7",
        authorId: "u2",
        content: "All component replacements done. Looks good in both themes.",
        createdAt: "2026-03-20T16:00:00Z",
      },
    ],
    activity: [
      {
        id: "a11",
        type: "created",
        userId: "u5",
        description: "created this task",
        createdAt: "2026-03-17T09:00:00Z",
      },
      {
        id: "a12",
        type: "status_change",
        userId: "u5",
        description: "changed status from Todo to In Progress",
        createdAt: "2026-03-17T09:30:00Z",
      },
      {
        id: "a13",
        type: "status_change",
        userId: "u5",
        description: "changed status from In Progress to Done",
        createdAt: "2026-03-21T15:00:00Z",
      },
    ],
    attachments: [
      {
        id: "att3",
        name: "color-audit.xlsx",
        type: "application/vnd.ms-excel",
        size: "12 KB",
        uploadedBy: "u5",
        uploadedAt: "2026-03-18T10:05:00Z",
      },
    ],
    order: 4,
    createdAt: "2026-03-17T09:00:00Z",
    updatedAt: "2026-03-21T15:00:00Z",
  },
  {
    id: "t6",
    projectId: "1",
    key: "VYNE-52",
    title: "Implement WebSocket reconnection with exponential backoff",
    description:
      "Current WebSocket connection drops silently. Implement auto-reconnection with exponential backoff, connection state indicator in the UI, and message queue for offline messages.",
    status: "todo",
    priority: "medium",
    assigneeId: "u3",
    startDate: "2026-03-25T00:00:00Z",
    dueDate: "2026-03-29T00:00:00Z",
    estimatedHours: 8,
    timeSpent: 0,
    tags: ["backend", "websocket"],
    subtasks: [
      {
        id: "st23",
        title: "Add reconnection logic to socket hook",
        done: false,
        assigneeId: "u3",
        dueDate: "2026-03-26T00:00:00Z",
      },
      {
        id: "st24",
        title: "Add connection state UI indicator",
        done: false,
        assigneeId: "u2",
        dueDate: "2026-03-27T00:00:00Z",
      },
      {
        id: "st25",
        title: "Implement message queue",
        done: false,
        assigneeId: "u3",
        dueDate: "2026-03-28T00:00:00Z",
      },
    ],
    comments: [],
    activity: [
      {
        id: "a14",
        type: "created",
        userId: "u1",
        description: "created this task",
        createdAt: "2026-03-22T09:00:00Z",
      },
    ],
    attachments: [],
    order: 5,
    createdAt: "2026-03-22T09:00:00Z",
    updatedAt: "2026-03-22T09:00:00Z",
  },
  {
    id: "t7",
    projectId: "1",
    key: "VYNE-53",
    title: "Add real-time notifications via SSE",
    description:
      "Implement server-sent events for push notifications. Include desktop notifications for mentions and task assignments.",
    status: "blocked",
    priority: "low",
    assigneeId: "u3",
    startDate: null,
    dueDate: "2026-04-01T00:00:00Z",
    estimatedHours: 12,
    timeSpent: 0,
    tags: ["backend", "notifications"],
    subtasks: [
      {
        id: "st26",
        title: "Set up SSE endpoint",
        done: false,
        assigneeId: "u3",
        dueDate: null,
      },
      {
        id: "st27",
        title: "Create notification service",
        done: false,
        assigneeId: "u3",
        dueDate: null,
      },
      {
        id: "st28",
        title: "Build notification dropdown UI",
        done: false,
        assigneeId: "u2",
        dueDate: null,
      },
    ],
    comments: [
      {
        id: "c8",
        authorId: "u3",
        content:
          "Blocked on VYNE-52 (WebSocket reconnection). Need stable connection layer first.",
        createdAt: "2026-03-22T10:00:00Z",
      },
    ],
    activity: [
      {
        id: "a15",
        type: "created",
        userId: "u1",
        description: "created this task",
        createdAt: "2026-03-22T09:30:00Z",
      },
      {
        id: "a16",
        type: "status_change",
        userId: "u3",
        description: "changed status from Todo to Blocked",
        createdAt: "2026-03-22T10:00:00Z",
      },
    ],
    attachments: [],
    order: 6,
    createdAt: "2026-03-22T09:30:00Z",
    updatedAt: "2026-03-22T10:00:00Z",
  },
  {
    id: "t8",
    projectId: "1",
    key: "VYNE-38",
    title: "Command palette keyboard shortcuts",
    description:
      "Add comprehensive keyboard shortcuts accessible via Cmd+K palette. Include navigation, actions, and search.",
    status: "done",
    priority: "low",
    assigneeId: "u2",
    startDate: "2026-03-10T00:00:00Z",
    dueDate: "2026-03-15T00:00:00Z",
    estimatedHours: 5,
    timeSpent: 4,
    tags: ["frontend", "ux"],
    subtasks: [
      {
        id: "st29",
        title: "Define shortcut map",
        done: true,
        assigneeId: "u2",
        dueDate: "2026-03-11T00:00:00Z",
      },
      {
        id: "st30",
        title: "Build palette component",
        done: true,
        assigneeId: "u2",
        dueDate: "2026-03-13T00:00:00Z",
      },
      {
        id: "st31",
        title: "Add fuzzy search",
        done: true,
        assigneeId: "u2",
        dueDate: "2026-03-15T00:00:00Z",
      },
    ],
    comments: [],
    activity: [
      {
        id: "a17",
        type: "created",
        userId: "u2",
        description: "created this task",
        createdAt: "2026-03-10T09:00:00Z",
      },
      {
        id: "a18",
        type: "status_change",
        userId: "u2",
        description: "changed status to Done",
        createdAt: "2026-03-15T14:00:00Z",
      },
    ],
    attachments: [],
    order: 7,
    createdAt: "2026-03-10T09:00:00Z",
    updatedAt: "2026-03-15T14:00:00Z",
  },

  // ── Mobile App (id: "2") ───────────────────────────────────────
  {
    id: "t9",
    projectId: "2",
    key: "MOB-12",
    title: "Implement biometric authentication",
    description:
      "Add Face ID / Touch ID support for quick app unlock. Use expo-local-authentication for cross-platform support.",
    status: "in_progress",
    priority: "high",
    assigneeId: "u2",
    startDate: "2026-03-18T00:00:00Z",
    dueDate: "2026-03-26T00:00:00Z",
    estimatedHours: 14,
    timeSpent: 6,
    tags: ["mobile", "auth"],
    subtasks: [
      {
        id: "st32",
        title: "Research expo-local-authentication API",
        done: true,
        assigneeId: "u2",
        dueDate: "2026-03-19T00:00:00Z",
      },
      {
        id: "st33",
        title: "Implement biometric prompt",
        done: true,
        assigneeId: "u2",
        dueDate: "2026-03-21T00:00:00Z",
      },
      {
        id: "st34",
        title: "Secure token storage with Keychain",
        done: false,
        assigneeId: "u2",
        dueDate: "2026-03-24T00:00:00Z",
      },
      {
        id: "st35",
        title: "Test on physical devices",
        done: false,
        assigneeId: "u2",
        dueDate: "2026-03-26T00:00:00Z",
      },
    ],
    comments: [
      {
        id: "c9",
        authorId: "u2",
        content:
          "expo-local-authentication works great. FaceID prompt is smooth.",
        createdAt: "2026-03-19T16:00:00Z",
      },
    ],
    activity: [
      {
        id: "a19",
        type: "created",
        userId: "u1",
        description: "created this task",
        createdAt: "2026-03-18T10:00:00Z",
      },
      {
        id: "a20",
        type: "status_change",
        userId: "u2",
        description: "changed status to In Progress",
        createdAt: "2026-03-18T14:00:00Z",
      },
    ],
    attachments: [],
    order: 0,
    createdAt: "2026-03-18T10:00:00Z",
    updatedAt: "2026-03-21T00:00:00Z",
  },
  {
    id: "t10",
    projectId: "2",
    key: "MOB-15",
    title: "Push notification deep linking",
    description:
      "Handle push notification taps to navigate directly to the relevant screen (chat message, task, etc.).",
    status: "todo",
    priority: "medium",
    assigneeId: "u2",
    startDate: "2026-03-26T00:00:00Z",
    dueDate: "2026-03-30T00:00:00Z",
    estimatedHours: 8,
    timeSpent: 0,
    tags: ["mobile", "notifications"],
    subtasks: [
      {
        id: "st36",
        title: "Define deep link schema",
        done: false,
        assigneeId: "u2",
        dueDate: "2026-03-27T00:00:00Z",
      },
      {
        id: "st37",
        title: "Handle notification payload",
        done: false,
        assigneeId: "u2",
        dueDate: "2026-03-28T00:00:00Z",
      },
      {
        id: "st38",
        title: "Test on iOS and Android",
        done: false,
        assigneeId: "u2",
        dueDate: "2026-03-30T00:00:00Z",
      },
    ],
    comments: [],
    activity: [
      {
        id: "a21",
        type: "created",
        userId: "u1",
        description: "created this task",
        createdAt: "2026-03-22T09:00:00Z",
      },
    ],
    attachments: [],
    order: 1,
    createdAt: "2026-03-22T09:00:00Z",
    updatedAt: "2026-03-22T09:00:00Z",
  },
  {
    id: "t11",
    projectId: "2",
    key: "MOB-08",
    title: "Offline mode with local SQLite cache",
    description:
      "Cache key data locally so the app remains functional without internet. Sync changes when connection is restored.",
    status: "in_review",
    priority: "high",
    assigneeId: "u2",
    startDate: "2026-03-10T00:00:00Z",
    dueDate: "2026-03-22T00:00:00Z",
    estimatedHours: 20,
    timeSpent: 18,
    tags: ["mobile", "offline"],
    subtasks: [
      {
        id: "st39",
        title: "Set up expo-sqlite",
        done: true,
        assigneeId: "u2",
        dueDate: "2026-03-12T00:00:00Z",
      },
      {
        id: "st40",
        title: "Implement sync queue",
        done: true,
        assigneeId: "u2",
        dueDate: "2026-03-16T00:00:00Z",
      },
      {
        id: "st41",
        title: "Conflict resolution strategy",
        done: true,
        assigneeId: "u2",
        dueDate: "2026-03-19T00:00:00Z",
      },
      {
        id: "st42",
        title: "Final QA and edge cases",
        done: false,
        assigneeId: "u5",
        dueDate: "2026-03-22T00:00:00Z",
      },
    ],
    comments: [
      {
        id: "c10",
        authorId: "u2",
        content:
          "Sync queue is working. Last-write-wins for conflict resolution.",
        createdAt: "2026-03-19T11:00:00Z",
      },
    ],
    activity: [],
    attachments: [],
    order: 2,
    createdAt: "2026-03-10T09:00:00Z",
    updatedAt: "2026-03-22T00:00:00Z",
  },
  {
    id: "t12",
    projectId: "2",
    key: "MOB-05",
    title: "Bottom tab navigation redesign",
    description:
      "Redesign bottom navigation with animated indicators and haptic feedback.",
    status: "done",
    priority: "medium",
    assigneeId: "u5",
    startDate: "2026-03-05T00:00:00Z",
    dueDate: "2026-03-12T00:00:00Z",
    estimatedHours: 6,
    timeSpent: 7,
    tags: ["mobile", "design"],
    subtasks: [
      {
        id: "st43",
        title: "Design new tab bar",
        done: true,
        assigneeId: "u5",
        dueDate: "2026-03-07T00:00:00Z",
      },
      {
        id: "st44",
        title: "Implement with Reanimated",
        done: true,
        assigneeId: "u2",
        dueDate: "2026-03-10T00:00:00Z",
      },
      {
        id: "st45",
        title: "Add haptic feedback",
        done: true,
        assigneeId: "u2",
        dueDate: "2026-03-12T00:00:00Z",
      },
    ],
    comments: [],
    activity: [],
    attachments: [],
    order: 3,
    createdAt: "2026-03-05T09:00:00Z",
    updatedAt: "2026-03-12T16:00:00Z",
  },

  // ── AI Engine (id: "3") ────────────────────────────────────────
  {
    id: "t13",
    projectId: "3",
    key: "AI-07",
    title: "RAG pipeline with document chunking",
    description:
      "Build a retrieval-augmented generation pipeline. Implement semantic chunking for uploaded documents, embed with OpenAI Ada-002, and store in Pinecone.",
    status: "in_progress",
    priority: "urgent",
    assigneeId: "u6",
    startDate: "2026-03-16T00:00:00Z",
    dueDate: "2026-03-25T00:00:00Z",
    estimatedHours: 24,
    timeSpent: 14,
    tags: ["ai", "rag"],
    subtasks: [
      {
        id: "st46",
        title: "Implement semantic chunking",
        done: true,
        assigneeId: "u6",
        dueDate: "2026-03-18T00:00:00Z",
      },
      {
        id: "st47",
        title: "Set up Pinecone index",
        done: true,
        assigneeId: "u6",
        dueDate: "2026-03-19T00:00:00Z",
      },
      {
        id: "st48",
        title: "Build retrieval API",
        done: true,
        assigneeId: "u3",
        dueDate: "2026-03-21T00:00:00Z",
      },
      {
        id: "st49",
        title: "Integrate with LangGraph agent",
        done: false,
        assigneeId: "u6",
        dueDate: "2026-03-23T00:00:00Z",
      },
      {
        id: "st50",
        title: "Evaluation and accuracy testing",
        done: false,
        assigneeId: "u6",
        dueDate: "2026-03-25T00:00:00Z",
      },
    ],
    comments: [
      {
        id: "c11",
        authorId: "u6",
        content:
          "Semantic chunking with overlap of 200 tokens gives best retrieval accuracy.",
        createdAt: "2026-03-18T15:00:00Z",
      },
    ],
    activity: [],
    attachments: [],
    order: 0,
    createdAt: "2026-03-16T09:00:00Z",
    updatedAt: "2026-03-22T00:00:00Z",
  },
  {
    id: "t14",
    projectId: "3",
    key: "AI-09",
    title: "Fine-tune classification model for ticket routing",
    description:
      "Train a lightweight classifier to auto-route support tickets to the right team based on content analysis.",
    status: "todo",
    priority: "medium",
    assigneeId: "u6",
    startDate: "2026-03-26T00:00:00Z",
    dueDate: "2026-04-02T00:00:00Z",
    estimatedHours: 16,
    timeSpent: 0,
    tags: ["ai", "ml"],
    subtasks: [
      {
        id: "st51",
        title: "Prepare training dataset",
        done: false,
        assigneeId: "u6",
        dueDate: "2026-03-28T00:00:00Z",
      },
      {
        id: "st52",
        title: "Train and evaluate model",
        done: false,
        assigneeId: "u6",
        dueDate: "2026-03-31T00:00:00Z",
      },
      {
        id: "st53",
        title: "Deploy as API endpoint",
        done: false,
        assigneeId: "u3",
        dueDate: "2026-04-02T00:00:00Z",
      },
    ],
    comments: [],
    activity: [],
    attachments: [],
    order: 1,
    createdAt: "2026-03-22T10:00:00Z",
    updatedAt: "2026-03-22T10:00:00Z",
  },
  {
    id: "t15",
    projectId: "3",
    key: "AI-04",
    title: "Prompt template versioning system",
    description:
      "Build a version control system for prompt templates. Track changes, allow rollbacks, and A/B test different versions.",
    status: "done",
    priority: "high",
    assigneeId: "u6",
    startDate: "2026-03-08T00:00:00Z",
    dueDate: "2026-03-15T00:00:00Z",
    estimatedHours: 10,
    timeSpent: 11,
    tags: ["ai", "infra"],
    subtasks: [
      {
        id: "st54",
        title: "Design versioning schema",
        done: true,
        assigneeId: "u6",
        dueDate: "2026-03-09T00:00:00Z",
      },
      {
        id: "st55",
        title: "Build version CRUD API",
        done: true,
        assigneeId: "u3",
        dueDate: "2026-03-12T00:00:00Z",
      },
      {
        id: "st56",
        title: "Add diff viewer UI",
        done: true,
        assigneeId: "u2",
        dueDate: "2026-03-14T00:00:00Z",
      },
      {
        id: "st57",
        title: "A/B test framework",
        done: true,
        assigneeId: "u6",
        dueDate: "2026-03-15T00:00:00Z",
      },
    ],
    comments: [],
    activity: [],
    attachments: [],
    order: 2,
    createdAt: "2026-03-08T09:00:00Z",
    updatedAt: "2026-03-15T17:00:00Z",
  },

  // ── Infrastructure (id: "4") ───────────────────────────────────
  {
    id: "t16",
    projectId: "4",
    key: "INFRA-21",
    title: "Set up multi-region failover with Route 53",
    description:
      "Configure active-passive failover across us-east-1 and eu-west-1. Set up health checks and automatic DNS failover.",
    status: "in_progress",
    priority: "urgent",
    assigneeId: "u4",
    startDate: "2026-03-19T00:00:00Z",
    dueDate: "2026-03-27T00:00:00Z",
    estimatedHours: 20,
    timeSpent: 10,
    tags: ["aws", "reliability"],
    subtasks: [
      {
        id: "st58",
        title: "Provision eu-west-1 resources",
        done: true,
        assigneeId: "u4",
        dueDate: "2026-03-21T00:00:00Z",
      },
      {
        id: "st59",
        title: "Configure Route 53 health checks",
        done: true,
        assigneeId: "u4",
        dueDate: "2026-03-23T00:00:00Z",
      },
      {
        id: "st60",
        title: "Set up cross-region DB replication",
        done: false,
        assigneeId: "u4",
        dueDate: "2026-03-25T00:00:00Z",
      },
      {
        id: "st61",
        title: "Failover drill and documentation",
        done: false,
        assigneeId: "u4",
        dueDate: "2026-03-27T00:00:00Z",
      },
    ],
    comments: [
      {
        id: "c12",
        authorId: "u4",
        content: "EU resources provisioned. Terraform modules reused cleanly.",
        createdAt: "2026-03-21T16:00:00Z",
      },
    ],
    activity: [],
    attachments: [],
    order: 0,
    createdAt: "2026-03-19T09:00:00Z",
    updatedAt: "2026-03-22T00:00:00Z",
  },
  {
    id: "t17",
    projectId: "4",
    key: "INFRA-23",
    title: "GitHub Actions CI pipeline optimization",
    description:
      "Reduce CI pipeline time from 12 minutes to under 5 minutes. Use caching, parallel jobs, and selective test runs.",
    status: "todo",
    priority: "high",
    assigneeId: "u4",
    startDate: "2026-03-28T00:00:00Z",
    dueDate: "2026-04-01T00:00:00Z",
    estimatedHours: 8,
    timeSpent: 0,
    tags: ["ci-cd", "performance"],
    subtasks: [
      {
        id: "st62",
        title: "Profile current pipeline bottlenecks",
        done: false,
        assigneeId: "u4",
        dueDate: "2026-03-29T00:00:00Z",
      },
      {
        id: "st63",
        title: "Add dependency caching",
        done: false,
        assigneeId: "u4",
        dueDate: "2026-03-30T00:00:00Z",
      },
      {
        id: "st64",
        title: "Parallelize test suites",
        done: false,
        assigneeId: "u4",
        dueDate: "2026-04-01T00:00:00Z",
      },
    ],
    comments: [],
    activity: [],
    attachments: [],
    order: 1,
    createdAt: "2026-03-22T11:00:00Z",
    updatedAt: "2026-03-22T11:00:00Z",
  },
  {
    id: "t18",
    projectId: "4",
    key: "INFRA-19",
    title: "Terraform state migration to S3 backend",
    description:
      "Migrate local Terraform state to S3 with DynamoDB locking. Ensure zero downtime during migration.",
    status: "done",
    priority: "medium",
    assigneeId: "u4",
    startDate: "2026-03-12T00:00:00Z",
    dueDate: "2026-03-16T00:00:00Z",
    estimatedHours: 6,
    timeSpent: 5,
    tags: ["terraform", "aws"],
    subtasks: [
      {
        id: "st65",
        title: "Create S3 bucket and DynamoDB table",
        done: true,
        assigneeId: "u4",
        dueDate: "2026-03-13T00:00:00Z",
      },
      {
        id: "st66",
        title: "Migrate state files",
        done: true,
        assigneeId: "u4",
        dueDate: "2026-03-14T00:00:00Z",
      },
      {
        id: "st67",
        title: "Update CI pipeline backend config",
        done: true,
        assigneeId: "u4",
        dueDate: "2026-03-15T00:00:00Z",
      },
      {
        id: "st68",
        title: "Verify and cleanup",
        done: true,
        assigneeId: "u4",
        dueDate: "2026-03-16T00:00:00Z",
      },
    ],
    comments: [],
    activity: [],
    attachments: [],
    order: 2,
    createdAt: "2026-03-12T09:00:00Z",
    updatedAt: "2026-03-16T15:00:00Z",
  },
];

// ─── Helper functions ────────────────────────────────────────────

export function getProjectTasks(projectId: string): Task[] {
  return DEMO_TASKS.filter((t) => t.projectId === projectId);
}

export function getProjectDetail(projectId: string): ProjectDetail | undefined {
  return DEMO_PROJECT_DETAILS.find((p) => p.id === projectId);
}

export function getTasksByStatus(
  projectId: string,
  status: TaskStatus,
): Task[] {
  return DEMO_TASKS.filter(
    (t) => t.projectId === projectId && t.status === status,
  );
}

export function getProjectProgress(projectId: string): number {
  const tasks = getProjectTasks(projectId);
  if (tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.status === "done").length;
  return Math.round((done / tasks.length) * 100);
}

// ─── Status / Priority metadata ──────────────────────────────────

export const TASK_STATUS_META: Record<
  TaskStatus,
  { label: string; color: string; bgColor: string }
> = {
  todo: { label: "Todo", color: "#6B6B8A", bgColor: "#EBEBF5" },
  in_progress: { label: "In Progress", color: "#3B82F6", bgColor: "#EFF6FF" },
  in_review: { label: "In Review", color: "#F59E0B", bgColor: "#FFFBEB" },
  done: { label: "Done", color: "#22C55E", bgColor: "#F0FDF4" },
  blocked: { label: "Blocked", color: "#EF4444", bgColor: "#FEF2F2" },
};

export const TASK_PRIORITY_META: Record<
  TaskPriority,
  { label: string; color: string }
> = {
  urgent: { label: "Urgent", color: "#EF4444" },
  high: { label: "High", color: "#F59E0B" },
  medium: { label: "Medium", color: "#3B82F6" },
  low: { label: "Low", color: "#A0A0B8" },
};

export const KANBAN_COLUMNS: TaskStatus[] = [
  "todo",
  "in_progress",
  "in_review",
  "done",
];
