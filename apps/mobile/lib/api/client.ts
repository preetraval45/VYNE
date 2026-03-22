import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import type {
  User,
  Organization,
  Project,
  Issue,
  IssueStatus,
  IssuePriority,
  ApiResponse,
  FilterState,
  Document,
  Deployment,
  DeploymentStats,
  PullRequest,
  PullRequestStats,
  Repository,
  Comment,
  MsgChannel,
  MsgMessage,
  MsgPage,
  MsgDM,
  ERPProduct,
  ERPOrder,
  ERPSupplier,
  ERPFinance,
  ERPCustomer,
  ERPOrgSettings,
} from "@/lib/types";

// ─── Configuration ──────────────────────────────────────────────
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === "true";

// ─── Create Axios Instance ─────────────────────────────────────
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

// ─── Token Refresh State ───────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
}

// ─── Stored Auth Helpers ────────────────────────────────────────
const AUTH_STORAGE_KEY = "vyne-auth";

async function getStoredAuth(): Promise<{
  token: string | null;
  refreshToken: string | null;
}> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        token: parsed?.state?.token ?? null,
        refreshToken: parsed?.state?.refreshToken ?? null,
      };
    }
  } catch {
    // ignore parse errors
  }
  return { token: null, refreshToken: null };
}

async function updateStoredTokens(token: string, refreshToken: string) {
  try {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.state = { ...parsed.state, token, refreshToken };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsed));
    }
  } catch {
    // ignore
  }
}

async function clearStoredAuth() {
  await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
}

// ─── Request Interceptor ───────────────────────────────────────
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const { token } = await getStoredAuth();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor (with token refresh) ─────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Skip refresh for auth endpoints to prevent loops
    const isAuthEndpoint =
      originalRequest?.url?.includes("/auth/refresh") ||
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/signup");

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !isAuthEndpoint
    ) {
      if (isRefreshing) {
        // Another refresh is in progress — queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              if (token && originalRequest) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken } = await getStoredAuth();

      if (!refreshToken) {
        isRefreshing = false;
        await clearStoredAuth();
        router.replace("/(auth)/login");
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post<{
          token: string;
          refreshToken: string;
        }>(`${API_URL}/api/auth/refresh`, { refreshToken });

        const newToken = data.token;
        const newRefreshToken = data.refreshToken;

        await updateStoredTokens(newToken, newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await clearStoredAuth();
        router.replace("/(auth)/login");
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ─── Demo Mode Mock Data ────────────────────────────────────────
const DEMO_USER: User = {
  id: "demo-user-1",
  email: "preet@vyne.dev",
  name: "Preet Raval",
  avatarUrl: undefined,
  orgId: "demo-org-1",
  role: "owner",
  createdAt: "2025-01-01T00:00:00.000Z",
};

const DEMO_PROJECTS: Project[] = [
  {
    id: "proj-1",
    orgId: "demo-org-1",
    name: "Engineering",
    identifier: "ENG",
    description: "Core engineering work",
    color: "#6C47FF",
    icon: "code",
    memberIds: ["demo-user-1"],
    issueCounts: {
      backlog: 3,
      todo: 5,
      inProgress: 4,
      inReview: 2,
      done: 12,
      total: 26,
    },
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2026-03-20T00:00:00.000Z",
  },
  {
    id: "proj-2",
    orgId: "demo-org-1",
    name: "Product",
    identifier: "PRD",
    description: "Product roadmap and features",
    color: "#F59E0B",
    icon: "bulb",
    memberIds: ["demo-user-1"],
    issueCounts: {
      backlog: 2,
      todo: 4,
      inProgress: 2,
      inReview: 1,
      done: 8,
      total: 17,
    },
    createdAt: "2025-01-15T00:00:00.000Z",
    updatedAt: "2026-03-19T00:00:00.000Z",
  },
  {
    id: "proj-3",
    orgId: "demo-org-1",
    name: "Design",
    identifier: "DSN",
    description: "UI/UX design tasks",
    color: "#EC4899",
    icon: "color-palette",
    memberIds: ["demo-user-1"],
    issueCounts: {
      backlog: 1,
      todo: 3,
      inProgress: 1,
      inReview: 0,
      done: 5,
      total: 10,
    },
    createdAt: "2025-02-01T00:00:00.000Z",
    updatedAt: "2026-03-18T00:00:00.000Z",
  },
  {
    id: "proj-4",
    orgId: "demo-org-1",
    name: "Infrastructure",
    identifier: "INF",
    description: "Cloud infrastructure and DevOps",
    color: "#22C55E",
    icon: "server",
    memberIds: ["demo-user-1"],
    issueCounts: {
      backlog: 4,
      todo: 2,
      inProgress: 3,
      inReview: 1,
      done: 15,
      total: 25,
    },
    createdAt: "2025-01-10T00:00:00.000Z",
    updatedAt: "2026-03-21T00:00:00.000Z",
  },
];

const DEMO_ISSUES: Issue[] = [
  {
    id: "issue-1",
    projectId: "proj-1",
    identifier: "ENG-43",
    title: "Fix Secrets Manager IAM policy binding in staging",
    status: "done",
    priority: "urgent",
    assigneeId: "demo-user-1",
    reporterId: "demo-user-1",
    labels: [],
    order: 1,
    comments: [],
    createdAt: "2026-03-20T00:00:00.000Z",
    updatedAt: "2026-03-20T00:00:00.000Z",
  },
  {
    id: "issue-2",
    projectId: "proj-1",
    identifier: "ENG-45",
    title: "LangGraph streaming review & performance audit",
    status: "in_review",
    priority: "high",
    assigneeId: "demo-user-1",
    reporterId: "demo-user-1",
    labels: [],
    order: 2,
    comments: [],
    createdAt: "2026-03-19T00:00:00.000Z",
    updatedAt: "2026-03-20T00:00:00.000Z",
  },
  {
    id: "issue-3",
    projectId: "proj-1",
    identifier: "ENG-41",
    title: "TimescaleDB migration script for telemetry data",
    status: "in_progress",
    priority: "medium",
    assigneeId: "demo-user-1",
    reporterId: "demo-user-1",
    labels: [],
    order: 3,
    comments: [],
    createdAt: "2026-03-18T00:00:00.000Z",
    updatedAt: "2026-03-20T00:00:00.000Z",
  },
  {
    id: "issue-4",
    projectId: "proj-2",
    identifier: "PRD-12",
    title: "Q2 roadmap: define AI features milestone",
    status: "in_progress",
    priority: "high",
    assigneeId: "demo-user-1",
    reporterId: "demo-user-1",
    labels: [],
    order: 4,
    comments: [],
    createdAt: "2026-03-17T00:00:00.000Z",
    updatedAt: "2026-03-20T00:00:00.000Z",
  },
  {
    id: "issue-5",
    projectId: "proj-1",
    identifier: "ENG-38",
    title: "Upgrade react-native to 0.76.3",
    status: "todo",
    priority: "low",
    assigneeId: "demo-user-1",
    reporterId: "demo-user-1",
    labels: [],
    order: 5,
    comments: [],
    createdAt: "2026-03-16T00:00:00.000Z",
    updatedAt: "2026-03-19T00:00:00.000Z",
  },
];

const DEMO_CHANNELS: MsgChannel[] = [
  {
    id: "ch-1",
    name: "general",
    isPrivate: false,
    memberCount: 5,
    unreadCount: 3,
    lastMessage: "Sarah: Just pushed the fix to staging",
    lastMessageAt: "2026-03-21T09:08:00.000Z",
  },
  {
    id: "ch-2",
    name: "alerts",
    isPrivate: false,
    memberCount: 5,
    unreadCount: 1,
    lastMessage: "AI: ENG-43 resolved",
    lastMessageAt: "2026-03-21T08:58:00.000Z",
  },
  {
    id: "ch-3",
    name: "engineering",
    isPrivate: false,
    memberCount: 4,
    unreadCount: 0,
    lastMessage: "Tony: PR #218 is ready",
    lastMessageAt: "2026-03-21T08:42:00.000Z",
  },
];

// ─── Demo-safe request wrapper ──────────────────────────────────
async function demoOr<T>(demoData: T, realFn: () => Promise<T>): Promise<T> {
  if (DEMO_MODE) {
    return demoData;
  }
  try {
    return await realFn();
  } catch (err) {
    // If the backend is unreachable, fall back to demo data
    if (axios.isAxiosError(err) && !err.response) {
      console.warn("[VYNE API] Backend unreachable, using demo data");
      return demoData;
    }
    throw err;
  }
}

// ─── Auth API ───────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    demoOr(
      {
        data: {
          user: DEMO_USER,
          token: "demo-token",
          refreshToken: "demo-refresh-token",
        },
      },
      () =>
        apiClient.post<{ user: User; token: string; refreshToken: string }>(
          "/api/auth/login",
          { email, password },
        ),
    ),

  signup: (data: {
    email: string;
    password: string;
    name: string;
    orgName: string;
  }) =>
    demoOr(
      {
        data: {
          user: { ...DEMO_USER, email: data.email, name: data.name },
          token: "demo-token",
          refreshToken: "demo-refresh-token",
          org: {
            id: "demo-org-1",
            name: data.orgName,
            slug: data.orgName.toLowerCase().replace(/\s+/g, "-"),
            createdAt: new Date().toISOString(),
          } as Organization,
        },
      },
      () =>
        apiClient.post<{
          user: User;
          token: string;
          refreshToken: string;
          org: Organization;
        }>("/api/auth/signup", data),
    ),

  me: () =>
    demoOr({ data: DEMO_USER }, () => apiClient.get<User>("/api/auth/me")),

  refreshToken: (refreshToken: string) =>
    demoOr(
      {
        data: {
          token: "demo-token-refreshed",
          refreshToken: "demo-refresh-token-refreshed",
        },
      },
      () =>
        apiClient.post<{ token: string; refreshToken: string }>(
          "/api/auth/refresh",
          { refreshToken },
        ),
    ),

  forgotPassword: (email: string) =>
    demoOr({ data: { message: "Password reset email sent." } }, () =>
      apiClient.post<{ message: string }>("/api/auth/forgot-password", {
        email,
      }),
    ),

  resetPassword: (token: string, newPassword: string) =>
    demoOr({ data: { message: "Password reset successfully." } }, () =>
      apiClient.post<{ message: string }>("/api/auth/reset-password", {
        token,
        newPassword,
      }),
    ),
};

// ─── Projects API ───────────────────────────────────────────────
export const projectsApi = {
  list: () =>
    demoOr({ data: { data: DEMO_PROJECTS } }, () =>
      apiClient.get<ApiResponse<Project[]>>("/api/projects"),
    ),

  get: (id: string) =>
    demoOr(
      { data: DEMO_PROJECTS.find((p) => p.id === id) ?? DEMO_PROJECTS[0] },
      () => apiClient.get<Project>(`/api/projects/${id}`),
    ),

  create: (data: {
    name: string;
    identifier: string;
    description?: string;
    color: string;
    icon?: string;
  }) =>
    demoOr(
      {
        data: {
          id: `proj-${Date.now()}`,
          orgId: "demo-org-1",
          memberIds: ["demo-user-1"],
          issueCounts: {
            backlog: 0,
            todo: 0,
            inProgress: 0,
            inReview: 0,
            done: 0,
            total: 0,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...data,
        } as Project,
      },
      () => apiClient.post<Project>("/api/projects", data),
    ),

  update: (
    id: string,
    data: Partial<
      Pick<Project, "name" | "description" | "color" | "icon" | "leadId">
    >,
  ) =>
    demoOr(
      {
        data: {
          ...(DEMO_PROJECTS.find((p) => p.id === id) ?? DEMO_PROJECTS[0]),
          ...data,
        } as Project,
      },
      () => apiClient.patch<Project>(`/api/projects/${id}`, data),
    ),

  delete: (id: string) =>
    demoOr({ data: undefined as unknown }, () =>
      apiClient.delete(`/api/projects/${id}`),
    ),
};

// ─── Issues API ─────────────────────────────────────────────────
export const issuesApi = {
  list: (projectId: string, filters?: FilterState) =>
    demoOr(
      {
        data: {
          data: DEMO_ISSUES.filter((i) => i.projectId === projectId),
        },
      },
      () =>
        apiClient.get<ApiResponse<Issue[]>>(
          `/api/projects/${projectId}/issues`,
          { params: filters },
        ),
    ),

  get: (id: string) =>
    demoOr(
      { data: DEMO_ISSUES.find((i) => i.id === id) ?? DEMO_ISSUES[0] },
      () => apiClient.get<Issue>(`/api/issues/${id}`),
    ),

  create: (
    projectId: string,
    data: {
      title: string;
      description?: string;
      status: IssueStatus;
      priority: IssuePriority;
      assigneeId?: string;
      dueDate?: string;
    },
  ) =>
    demoOr(
      {
        data: {
          id: `issue-${Date.now()}`,
          projectId,
          identifier: `DEMO-${Date.now()}`,
          reporterId: "demo-user-1",
          labels: [],
          order: 99,
          comments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...data,
        } as Issue,
      },
      () => apiClient.post<Issue>(`/api/projects/${projectId}/issues`, data),
    ),

  update: (
    id: string,
    data: Partial<
      Pick<
        Issue,
        | "title"
        | "description"
        | "status"
        | "priority"
        | "assigneeId"
        | "dueDate"
        | "estimate"
      >
    >,
  ) =>
    demoOr(
      {
        data: {
          ...(DEMO_ISSUES.find((i) => i.id === id) ?? DEMO_ISSUES[0]),
          ...data,
        } as Issue,
      },
      () => apiClient.patch<Issue>(`/api/issues/${id}`, data),
    ),

  reorder: (
    updates: Array<{ id: string; status: IssueStatus; order: number }>,
  ) =>
    demoOr({ data: undefined as unknown }, () =>
      apiClient.patch("/api/issues/reorder", { updates }),
    ),

  addComment: (issueId: string, content: string) =>
    demoOr(
      {
        data: {
          id: `comment-${Date.now()}`,
          issueId,
          authorId: "demo-user-1",
          content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Comment,
      },
      () =>
        apiClient.post<Comment>(`/api/issues/${issueId}/comments`, { content }),
    ),
};

// ─── Messaging API ──────────────────────────────────────────────
export const messagingApi = {
  listChannels: () =>
    demoOr({ data: DEMO_CHANNELS }, () =>
      apiClient.get<MsgChannel[]>("/api/messaging/channels"),
    ),

  createChannel: (data: {
    name: string;
    description?: string;
    isPrivate: boolean;
  }) =>
    demoOr(
      {
        data: {
          id: `ch-${Date.now()}`,
          memberCount: 1,
          unreadCount: 0,
          ...data,
        } as MsgChannel,
      },
      () => apiClient.post<MsgChannel>("/api/messaging/channels", data),
    ),

  listMessages: (
    channelId: string,
    params?: { before?: string; limit?: number },
  ) =>
    demoOr({ data: { messages: [], hasMore: false } as MsgPage }, () =>
      apiClient.get<MsgPage>(`/api/messaging/channels/${channelId}/messages`, {
        params,
      }),
    ),

  sendMessage: (
    channelId: string,
    data: { content: string; parentMessageId?: string },
  ) =>
    demoOr(
      {
        data: {
          id: `msg-${Date.now()}`,
          channelId,
          author: { id: "demo-user-1", name: "Preet Raval" },
          content: data.content,
          createdAt: new Date().toISOString(),
        } as MsgMessage,
      },
      () =>
        apiClient.post<MsgMessage>(
          `/api/messaging/channels/${channelId}/messages`,
          data,
        ),
    ),

  addReaction: (channelId: string, messageId: string, emoji: string) =>
    demoOr({ data: undefined as unknown }, () =>
      apiClient.post(
        `/api/messaging/channels/${channelId}/messages/${messageId}/reactions`,
        { emoji },
      ),
    ),

  listDMs: () =>
    demoOr({ data: [] as MsgDM[] }, () =>
      apiClient.get<MsgDM[]>("/api/messaging/dms"),
    ),

  createOrGetDM: (userId: string) =>
    demoOr(
      {
        data: {
          id: `dm-${userId}`,
          participant: {
            id: userId,
            name: "Demo User",
            presence: "online" as const,
          },
          unreadCount: 0,
        } as MsgDM,
      },
      () => apiClient.post<MsgDM>("/api/messaging/dms", { userId }),
    ),

  listDMMessages: (
    dmId: string,
    params?: { before?: string; limit?: number },
  ) =>
    demoOr({ data: { messages: [], hasMore: false } as MsgPage }, () =>
      apiClient.get<MsgPage>(`/api/messaging/dms/${dmId}/messages`, {
        params,
      }),
    ),

  sendDMMessage: (dmId: string, content: string) =>
    demoOr(
      {
        data: {
          id: `msg-${Date.now()}`,
          dmId,
          author: { id: "demo-user-1", name: "Preet Raval" },
          content,
          createdAt: new Date().toISOString(),
        } as MsgMessage,
      },
      () =>
        apiClient.post<MsgMessage>(`/api/messaging/dms/${dmId}/messages`, {
          content,
        }),
    ),
};

// ─── ERP API ────────────────────────────────────────────────────
export const erpApi = {
  listProducts: (params?: {
    search?: string;
    categoryId?: string;
    lowStock?: boolean;
  }) =>
    demoOr({ data: [] as ERPProduct[] }, () =>
      apiClient.get<ERPProduct[]>("/api/erp/inventory", { params }),
    ),

  createProduct: (data: Partial<ERPProduct>) =>
    demoOr({ data: { id: `prod-${Date.now()}`, ...data } as ERPProduct }, () =>
      apiClient.post<ERPProduct>("/api/erp/inventory", data),
    ),

  adjustStock: (id: string, qty: number, reason: string) =>
    demoOr({ data: undefined as unknown }, () =>
      apiClient.patch(`/api/erp/inventory/${id}/adjust`, {
        quantity: qty,
        reason,
      }),
    ),

  listOrders: (params?: { status?: string; search?: string }) =>
    demoOr({ data: [] as ERPOrder[] }, () =>
      apiClient.get<ERPOrder[]>("/api/erp/orders", { params }),
    ),

  createOrder: (data: Partial<ERPOrder>) =>
    demoOr({ data: { id: `order-${Date.now()}`, ...data } as ERPOrder }, () =>
      apiClient.post<ERPOrder>("/api/erp/orders", data),
    ),

  confirmOrder: (id: string) =>
    demoOr({ data: undefined as unknown }, () =>
      apiClient.patch(`/api/erp/orders/${id}/confirm`, {}),
    ),

  shipOrder: (id: string) =>
    demoOr({ data: undefined as unknown }, () =>
      apiClient.patch(`/api/erp/orders/${id}/ship`, {}),
    ),

  deliverOrder: (id: string) =>
    demoOr({ data: undefined as unknown }, () =>
      apiClient.patch(`/api/erp/orders/${id}/deliver`, {}),
    ),

  cancelOrder: (id: string) =>
    demoOr({ data: undefined as unknown }, () =>
      apiClient.patch(`/api/erp/orders/${id}/cancel`, {}),
    ),

  listSuppliers: () =>
    demoOr({ data: [] as ERPSupplier[] }, () =>
      apiClient.get<ERPSupplier[]>("/api/erp/suppliers"),
    ),

  createSupplier: (data: Partial<ERPSupplier>) =>
    demoOr({ data: { id: `sup-${Date.now()}`, ...data } as ERPSupplier }, () =>
      apiClient.post<ERPSupplier>("/api/erp/suppliers", data),
    ),

  getFinanceSummary: (year: number, month: number) =>
    demoOr(
      {
        data: {
          revenue: 125_000,
          expenses: 84_000,
          profit: 41_000,
          month,
          year,
        } as ERPFinance,
      },
      () =>
        apiClient.get<ERPFinance>("/api/erp/finance/summary", {
          params: { year, month },
        }),
    ),

  listCustomers: () =>
    demoOr({ data: [] as ERPCustomer[] }, () =>
      apiClient.get<ERPCustomer[]>("/api/erp/crm/customers"),
    ),

  createCustomer: (data: Partial<ERPCustomer>) =>
    demoOr({ data: { id: `cust-${Date.now()}`, ...data } as ERPCustomer }, () =>
      apiClient.post<ERPCustomer>("/api/erp/crm/customers", data),
    ),

  getOrgSettings: () =>
    demoOr(
      {
        data: {
          currency: "USD",
          currencySymbol: "$",
          taxIncluded: false,
          defaultTaxRate: 0,
          fiscalYearStart: 1,
          timezone: "America/New_York",
          lowStockThreshold: 10,
          autoReorder: false,
        } as ERPOrgSettings,
      },
      () => apiClient.get<ERPOrgSettings>("/api/erp/settings/org"),
    ),

  updateOrgSettings: (data: Partial<ERPOrgSettings>) =>
    demoOr({ data: { ...data } as ERPOrgSettings }, () =>
      apiClient.patch<ERPOrgSettings>("/api/erp/settings/org", data),
    ),
};

export default apiClient;
