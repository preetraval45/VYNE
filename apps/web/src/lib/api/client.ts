import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { env } from '@/lib/env'

const API_URL = env.NEXT_PUBLIC_API_URL

// ─── Create Axios Instance ───────────────────────────────────────
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

// ─── Request Interceptor ─────────────────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage (fallback if Zustand isn't hydrated)
    let token: string | null = null

    if (typeof window !== 'undefined') {
      try {
        const authStorage = localStorage.getItem('vyne-auth')
        if (authStorage) {
          const parsed = JSON.parse(authStorage)
          token = parsed?.state?.token ?? null
        }
      } catch {
        // ignore parse errors
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

// ─── Response Interceptor ────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Clear auth state and redirect to login
      localStorage.removeItem('vyne-auth')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ─── Typed API Functions ─────────────────────────────────────────

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<{ user: import('@/types').User; token: string }>('/api/auth/login', {
      email,
      password,
    }),

  signup: (data: {
    email: string
    password: string
    name: string
    orgName: string
  }) =>
    apiClient.post<{ user: import('@/types').User; token: string; org: import('@/types').Organization }>(
      '/api/auth/signup',
      data
    ),

  me: () => apiClient.get<import('@/types').User>('/api/auth/me'),
}

// Projects
export const projectsApi = {
  list: () =>
    apiClient.get<import('@/types').ApiResponse<import('@/types').Project[]>>('/api/projects'),

  get: (id: string) =>
    apiClient.get<import('@/types').Project>(`/api/projects/${id}`),

  create: (data: {
    name: string
    identifier: string
    description?: string
    color: string
    icon?: string
  }) => apiClient.post<import('@/types').Project>('/api/projects', data),

  update: (
    id: string,
    data: Partial<Pick<import('@/types').Project, 'name' | 'description' | 'color' | 'icon' | 'leadId'>>
  ) => apiClient.patch<import('@/types').Project>(`/api/projects/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/projects/${id}`),
}

// Issues
export const issuesApi = {
  list: (
    projectId: string,
    filters?: import('@/types').FilterState
  ) =>
    apiClient.get<import('@/types').ApiResponse<import('@/types').Issue[]>>(
      `/api/projects/${projectId}/issues`,
      { params: filters }
    ),

  get: (id: string) =>
    apiClient.get<import('@/types').Issue>(`/api/issues/${id}`),

  create: (
    projectId: string,
    data: {
      title: string
      description?: string
      status: import('@/types').IssueStatus
      priority: import('@/types').IssuePriority
      assigneeId?: string
      dueDate?: string
    }
  ) =>
    apiClient.post<import('@/types').Issue>(`/api/projects/${projectId}/issues`, data),

  update: (
    id: string,
    data: Partial<
      Pick<
        import('@/types').Issue,
        'title' | 'description' | 'status' | 'priority' | 'assigneeId' | 'dueDate' | 'estimate'
      >
    >
  ) => apiClient.patch<import('@/types').Issue>(`/api/issues/${id}`, data),

  reorder: (updates: Array<{ id: string; status: import('@/types').IssueStatus; order: number }>) =>
    apiClient.patch('/api/issues/reorder', { updates }),

  addComment: (issueId: string, content: string) =>
    apiClient.post<import('@/types').Comment>(`/api/issues/${issueId}/comments`, { content }),
}

// Users
export const usersApi = {
  listByOrg: () =>
    apiClient.get<import('@/types').User[]>('/api/users'),
}

// Docs
export const docsApi = {
  list: () =>
    apiClient.get<import('@/types').Document[]>('/api/docs'),

  get: (id: string) =>
    apiClient.get<import('@/types').Document>(`/api/docs/${id}`),

  getChildren: (id: string) =>
    apiClient.get<import('@/types').Document[]>(`/api/docs/${id}/children`),

  create: (data: {
    title?: string
    parentId?: string
    icon?: string
    content?: string
  }) => apiClient.post<import('@/types').Document>('/api/docs', data),

  update: (
    id: string,
    data: { title?: string; icon?: string; coverUrl?: string; content?: string }
  ) => apiClient.patch<import('@/types').Document>(`/api/docs/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/api/docs/${id}`),

  duplicate: (id: string) =>
    apiClient.post<import('@/types').Document>(`/api/docs/${id}/duplicate`),

  search: (q: string) =>
    apiClient.get<import('@/types').Document[]>('/api/docs/search', { params: { q } }),
}

// Code / DevOps
export const codeApi = {
  listDeployments: (params?: {
    service?: string
    environment?: string
    status?: string
    limit?: number
  }) => apiClient.get<import('@/types').Deployment[]>('/api/code/deployments', { params }),

  getDeployment: (id: string) =>
    apiClient.get<import('@/types').Deployment>(`/api/code/deployments/${id}`),

  createDeployment: (data: {
    serviceName: string
    version?: string
    environment?: string
    branch?: string
    commitSha?: string
    commitMessage?: string
    triggeredBy?: string
  }) => apiClient.post<import('@/types').Deployment>('/api/code/deployments', data),

  updateDeploymentStatus: (id: string, status: 'success' | 'failed' | 'rolled_back') =>
    apiClient.patch<import('@/types').Deployment>(`/api/code/deployments/${id}/status`, { status }),

  getDeploymentStats: () =>
    apiClient.get<import('@/types').DeploymentStats>('/api/code/deployments/stats'),

  listPullRequests: (params?: { repo?: string; state?: string; limit?: number }) =>
    apiClient.get<import('@/types').PullRequest[]>('/api/code/pull-requests', { params }),

  getPullRequestStats: () =>
    apiClient.get<import('@/types').PullRequestStats>('/api/code/pull-requests/stats'),

  listRepositories: () =>
    apiClient.get<import('@/types').Repository[]>('/api/code/repositories'),

  connectRepository: (data: { repoName: string; githubUrl?: string; defaultBranch?: string }) =>
    apiClient.post<import('@/types').Repository>('/api/code/repositories/connect', data),
}

// Messaging
export const messagingApi = {
  listChannels: () => apiClient.get<MsgChannel[]>('/api/messaging/channels'),
  createChannel: (data: { name: string; description?: string; isPrivate: boolean }) =>
    apiClient.post<MsgChannel>('/api/messaging/channels', data),
  listMessages: (channelId: string, params?: { before?: string; limit?: number }) =>
    apiClient.get<MsgPage>(`/api/messaging/channels/${channelId}/messages`, { params }),
  sendMessage: (channelId: string, data: { content: string; parentMessageId?: string }) =>
    apiClient.post<MsgMessage>(`/api/messaging/channels/${channelId}/messages`, data),
  addReaction: (channelId: string, messageId: string, emoji: string) =>
    apiClient.post(`/api/messaging/channels/${channelId}/messages/${messageId}/reactions`, { emoji }),
  listDMs: () => apiClient.get<MsgDM[]>('/api/messaging/dms'),
  createOrGetDM: (userId: string) => apiClient.post<MsgDM>('/api/messaging/dms', { userId }),
  listDMMessages: (dmId: string, params?: { before?: string; limit?: number }) =>
    apiClient.get<MsgPage>(`/api/messaging/dms/${dmId}/messages`, { params }),
  sendDMMessage: (dmId: string, content: string) =>
    apiClient.post<MsgMessage>(`/api/messaging/dms/${dmId}/messages`, { content }),
}

// ERP
export const erpApi = {
  listProducts: (params?: { search?: string; categoryId?: string; lowStock?: boolean }) =>
    apiClient.get<ERPProduct[]>('/api/erp/inventory', { params }),
  createProduct: (data: Partial<ERPProduct>) => apiClient.post<ERPProduct>('/api/erp/inventory', data),
  adjustStock: (id: string, qty: number, reason: string) =>
    apiClient.patch(`/api/erp/inventory/${id}/adjust`, { quantity: qty, reason }),
  listOrders: (params?: { status?: string; search?: string }) =>
    apiClient.get<ERPOrder[]>('/api/erp/orders', { params }),
  createOrder: (data: Partial<ERPOrder>) => apiClient.post<ERPOrder>('/api/erp/orders', data),
  confirmOrder: (id: string) => apiClient.patch(`/api/erp/orders/${id}/confirm`, {}),
  shipOrder: (id: string) => apiClient.patch(`/api/erp/orders/${id}/ship`, {}),
  deliverOrder: (id: string) => apiClient.patch(`/api/erp/orders/${id}/deliver`, {}),
  cancelOrder: (id: string) => apiClient.patch(`/api/erp/orders/${id}/cancel`, {}),
  listSuppliers: () => apiClient.get<ERPSupplier[]>('/api/erp/suppliers'),
  createSupplier: (data: Partial<ERPSupplier>) => apiClient.post<ERPSupplier>('/api/erp/suppliers', data),
  listBOMs: () => apiClient.get<ERPBOM[]>('/api/erp/manufacturing/boms'),
  createBOM: (data: Partial<ERPBOM>) => apiClient.post<ERPBOM>('/api/erp/manufacturing/boms', data),
  listWorkOrders: () => apiClient.get<ERPWorkOrder[]>('/api/erp/manufacturing/work-orders'),
  createWorkOrder: (data: Partial<ERPWorkOrder>) => apiClient.post<ERPWorkOrder>('/api/erp/manufacturing/work-orders', data),
  getFinanceSummary: (year: number, month: number) =>
    apiClient.get<ERPFinance>('/api/erp/finance/summary', { params: { year, month } }),
  listJournalEntries: () => apiClient.get<ERPJournalEntry[]>('/api/erp/accounting/journal-entries'),
  listCustomers: () => apiClient.get<ERPCustomer[]>('/api/erp/crm/customers'),
  createCustomer: (data: Partial<ERPCustomer>) => apiClient.post<ERPCustomer>('/api/erp/crm/customers', data),
  listCategories: () => apiClient.get<{ id: string; name: string }[]>('/api/erp/settings/categories'),
  listUOMs: () => apiClient.get<{ id: string; name: string; abbreviation: string }[]>('/api/erp/settings/uoms'),
  getOrgSettings: () => apiClient.get<ERPOrgSettings>('/api/erp/settings/org'),
  updateOrgSettings: (data: Partial<ERPOrgSettings>) => apiClient.patch<ERPOrgSettings>('/api/erp/settings/org', data),
}

// ─── Messaging types ──────────────────────────────────────────────
export interface MsgChannel { id: string; name: string; description?: string; isPrivate: boolean; memberCount?: number; unreadCount?: number; lastMessage?: string; lastMessageAt?: string }
export interface MsgMessage { id: string; channelId?: string; dmId?: string; parentMessageId?: string; author: { id: string; name: string; avatarUrl?: string }; content: string; createdAt: string; updatedAt?: string; reactions?: Array<{ emoji: string; count: number; userReacted?: boolean }>; replyCount?: number }
export interface MsgPage { messages: MsgMessage[]; hasMore: boolean; nextCursor?: string }
export interface MsgDM { id: string; participant: { id: string; name: string; avatarUrl?: string; presence?: 'online' | 'away' | 'offline' }; lastMessage?: string; lastMessageAt?: string; unreadCount?: number }

// ─── ERP types ────────────────────────────────────────────────────
export interface ERPProduct { id: string; name: string; sku: string; price: number; costPrice: number; stockQty: number; uom?: string; categoryId?: string; categoryName?: string; status?: 'in_stock' | 'low_stock' | 'out_of_stock' }
export interface ERPOrder { id: string; orderNumber: string; customerName: string; customerEmail?: string; status: 'draft' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'; total: number; createdAt: string; lines?: ERPOrderLine[] }
export interface ERPOrderLine { id?: string; productId: string; productName?: string; quantity: number; unitPrice: number }
export interface ERPSupplier { id: string; name: string; contactName?: string; email?: string; phone?: string; status?: string }
export interface ERPBOM { id: string; productId: string; productName?: string; version?: string; components?: Array<{ componentId: string; componentName: string; quantity: number; uom: string }> }
export interface ERPWorkOrder { id: string; bomId?: string; productName?: string; qtyToProduce: number; status: 'planned' | 'in_progress' | 'done' | 'cancelled'; dueDate?: string; scheduledDate?: string }
export interface ERPFinance { revenue: number; expenses: number; profit: number; month: number; year: number }
export interface ERPJournalEntry { id: string; entryNumber: string; description: string; postingDate: string; status: string; totalDebits: number }
export interface ERPCustomer { id: string; name: string; email?: string; phone?: string; status: string; totalRevenue?: number }
export interface ERPOrgSettings { currency: string; currencySymbol: string; taxIncluded: boolean; defaultTaxRate: number; fiscalYearStart: number; timezone: string; lowStockThreshold: number; autoReorder: boolean }

export default apiClient
