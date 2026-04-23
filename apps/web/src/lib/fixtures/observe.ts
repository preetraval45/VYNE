export const IS_DEMO_MODE = !process.env.NEXT_PUBLIC_API_URL;

// ── Types ────────────────────────────────────────────────────────
export type ServiceStatus = "healthy" | "degraded" | "down";
export type LogLevel = "error" | "warn" | "info" | "debug";
export type AlertSeverity = "critical" | "warning" | "info";

export interface Service {
  id: string;
  name: string;
  icon: string;
  status: ServiceStatus;
  responseMs: number;
  errorRate: number;
  sparkline: readonly number[];
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
}

export interface AlertEntry {
  id: string;
  severity: AlertSeverity;
  service: string;
  condition: string;
  triggered: string;
  resolved: string | null;
  active: boolean;
}

export interface TraceSpan {
  id: string;
  service: string;
  operation: string;
  durationMs: number;
  offsetMs: number;
  color: string;
}

export interface Endpoint {
  id: string;
  method: string;
  path: string;
  p50: number;
  p95: number;
  p99: number;
  count: number;
}

export interface DeployEvent {
  id: string;
  time: string;
  version: string;
  service: string;
  note: string;
}

// ── Mock Data ────────────────────────────────────────────────────
export const SERVICES: readonly Service[] = [
  {
    id: "api-gateway",
    name: "API Gateway",
    icon: "\u26a1",
    status: "healthy",
    responseMs: 42,
    errorRate: 0.01,
    sparkline: [40, 38, 45, 42, 50, 39, 41, 43, 38, 44, 42, 41],
  },
  {
    id: "messaging",
    name: "Messaging Service",
    icon: "\ud83d\udcac",
    status: "healthy",
    responseMs: 18,
    errorRate: 0,
    sparkline: [20, 18, 17, 19, 21, 18, 16, 19, 20, 17, 18, 18],
  },
  {
    id: "erp",
    name: "ERP Service",
    icon: "\ud83d\udce6",
    status: "degraded",
    responseMs: 312,
    errorRate: 1.24,
    sparkline: [80, 90, 120, 200, 280, 310, 295, 312, 308, 315, 312, 312],
  },
  {
    id: "projects",
    name: "Projects Service",
    icon: "\ud83d\udccb",
    status: "healthy",
    responseMs: 67,
    errorRate: 0.02,
    sparkline: [65, 70, 68, 72, 66, 69, 67, 71, 68, 66, 70, 67],
  },
  {
    id: "ai",
    name: "AI Service",
    icon: "\ud83e\udde0",
    status: "healthy",
    responseMs: 890,
    errorRate: 0.05,
    sparkline: [800, 850, 920, 880, 910, 870, 890, 900, 880, 895, 890, 890],
  },
  {
    id: "auth",
    name: "Auth (Cognito)",
    icon: "\ud83d\udd10",
    status: "healthy",
    responseMs: 23,
    errorRate: 0,
    sparkline: [22, 24, 23, 21, 25, 22, 24, 23, 22, 24, 23, 23],
  },
  {
    id: "database",
    name: "Database (Aurora)",
    icon: "\ud83d\uddc4\ufe0f",
    status: "healthy",
    responseMs: 8,
    errorRate: 0,
    sparkline: [7, 8, 9, 8, 7, 8, 9, 8, 7, 8, 8, 8],
  },
  {
    id: "cache",
    name: "Cache (ElastiCache)",
    icon: "\u26a1",
    status: "healthy",
    responseMs: 1,
    errorRate: 0,
    sparkline: [1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1],
  },
];

export const REQUEST_BARS: readonly number[] = [
  420, 380, 410, 450, 490, 520, 480, 510, 540, 500, 470, 490, 530, 560, 590,
  570, 550, 580, 610, 590, 560, 540, 520, 510,
];

export const ERROR_BARS: readonly number[] = [
  2, 1, 2, 3, 2, 1, 2, 2, 8, 12, 15, 18, 20, 18, 16, 14, 12, 10, 8, 6, 4, 3, 2,
  2,
];

export const SLOWEST_ENDPOINTS: readonly Endpoint[] = [
  {
    id: "ep1",
    method: "POST",
    path: "/api/erp/orders",
    p50: 280,
    p95: 490,
    p99: 820,
    count: 1240,
  },
  {
    id: "ep2",
    method: "GET",
    path: "/api/ai/completions",
    p50: 890,
    p95: 1420,
    p99: 2100,
    count: 380,
  },
  {
    id: "ep3",
    method: "PUT",
    path: "/api/erp/inventory",
    p50: 210,
    p95: 380,
    p99: 640,
    count: 890,
  },
  {
    id: "ep4",
    method: "POST",
    path: "/api/projects/issues",
    p50: 95,
    p95: 180,
    p99: 310,
    count: 2100,
  },
  {
    id: "ep5",
    method: "GET",
    path: "/api/messaging/threads",
    p50: 45,
    p95: 120,
    p99: 240,
    count: 4200,
  },
];

export const DEPLOY_EVENTS: readonly DeployEvent[] = [
  {
    id: "dep1",
    time: "09:42",
    version: "api-service v2.4.1",
    service: "API Gateway",
    note: "\u26a0\ufe0f Caused p95 spike",
  },
  {
    id: "dep2",
    time: "11:15",
    version: "erp-service v3.1.2",
    service: "ERP Service",
    note: "\u26a0\ufe0f Error rate increase",
  },
  {
    id: "dep3",
    time: "14:00",
    version: "auth-service v1.8.2",
    service: "Auth (Cognito)",
    note: "\u2705 Clean deploy",
  },
  {
    id: "dep4",
    time: "16:30",
    version: "ai-service v1.2.0",
    service: "AI Service",
    note: "\u2705 Clean deploy",
  },
];

export const CPU_USAGE: readonly {
  id: string;
  service: string;
  pct: number;
}[] = [
  { id: "cpu1", service: "API Gateway", pct: 42 },
  { id: "cpu2", service: "Messaging Service", pct: 18 },
  { id: "cpu3", service: "ERP Service", pct: 78 },
  { id: "cpu4", service: "Projects Service", pct: 31 },
  { id: "cpu5", service: "AI Service", pct: 65 },
  { id: "cpu6", service: "Auth (Cognito)", pct: 12 },
  { id: "cpu7", service: "Database (Aurora)", pct: 55 },
  { id: "cpu8", service: "Cache (ElastiCache)", pct: 8 },
];

export const MEM_USAGE: readonly {
  id: string;
  service: string;
  pct: number;
  used: string;
  total: string;
}[] = [
  {
    id: "mem1",
    service: "API Gateway",
    pct: 51,
    used: "2.1 GB",
    total: "4 GB",
  },
  {
    id: "mem2",
    service: "Messaging Service",
    pct: 28,
    used: "0.6 GB",
    total: "2 GB",
  },
  {
    id: "mem3",
    service: "ERP Service",
    pct: 82,
    used: "6.6 GB",
    total: "8 GB",
  },
  {
    id: "mem4",
    service: "Projects Service",
    pct: 44,
    used: "0.9 GB",
    total: "2 GB",
  },
  {
    id: "mem5",
    service: "AI Service",
    pct: 71,
    used: "11.4 GB",
    total: "16 GB",
  },
  {
    id: "mem6",
    service: "Auth (Cognito)",
    pct: 19,
    used: "0.4 GB",
    total: "2 GB",
  },
  {
    id: "mem7",
    service: "Database (Aurora)",
    pct: 66,
    used: "5.3 GB",
    total: "8 GB",
  },
  {
    id: "mem8",
    service: "Cache (ElastiCache)",
    pct: 34,
    used: "1.4 GB",
    total: "4 GB",
  },
];

export const DB_POOL: readonly {
  id: string;
  label: string;
  used: number;
  total: number;
}[] = [
  { id: "pool1", label: "Read Pool", used: 18, total: 30 },
  { id: "pool2", label: "Write Pool", used: 7, total: 10 },
];

export const BUSINESS_METRICS: readonly {
  id: string;
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
}[] = [
  {
    id: "bm1",
    label: "Orders / min",
    value: "4.2",
    trend: "\u2191 12%",
    trendUp: true,
  },
  {
    id: "bm2",
    label: "Messages / min",
    value: "28.7",
    trend: "\u2191 5%",
    trendUp: true,
  },
  {
    id: "bm3",
    label: "Active Users",
    value: "342",
    trend: "\u2193 3%",
    trendUp: false,
  },
  {
    id: "bm4",
    label: "AI Queries / hour",
    value: "1,840",
    trend: "\u2191 22%",
    trendUp: true,
  },
];

export const LOG_ENTRIES: readonly LogEntry[] = [
  {
    id: "l01",
    timestamp: "14:32:01.221",
    level: "error",
    service: "ERP Service",
    message:
      "Unhandled exception: NullReferenceException in OrderProcessor.ProcessBatch() at line 142",
  },
  {
    id: "l02",
    timestamp: "14:31:58.100",
    level: "error",
    service: "ERP Service",
    message:
      "Database connection timeout after 30s \u2014 pool exhausted (18/18 connections in use)",
  },
  {
    id: "l03",
    timestamp: "14:31:45.884",
    level: "warn",
    service: "API Gateway",
    message:
      "p95 latency exceeded 500ms threshold: current=512ms for route POST /api/erp/orders",
  },
  {
    id: "l04",
    timestamp: "14:31:40.003",
    level: "warn",
    service: "AI Service",
    message:
      "LLM response time degraded: avg=1240ms (SLO=1000ms). Consider scaling inference pods.",
  },
  {
    id: "l05",
    timestamp: "14:31:35.442",
    level: "info",
    service: "Auth (Cognito)",
    message:
      "User preet@vyne.dev authenticated successfully via OAuth2 [session: s_abc123]",
  },
  {
    id: "l06",
    timestamp: "14:31:30.819",
    level: "info",
    service: "Projects Service",
    message:
      "Issue ENG-47 created by user:preet \u2014 sprint:12 priority:high",
  },
  {
    id: "l07",
    timestamp: "14:31:28.201",
    level: "warn",
    service: "ERP Service",
    message:
      "Retry attempt 2/3 for order ORD-00891 \u2014 upstream inventory service returned 503",
  },
  {
    id: "l08",
    timestamp: "14:31:22.567",
    level: "info",
    service: "Messaging Service",
    message: "Channel #alerts: 3 new messages delivered to 12 subscribers",
  },
  {
    id: "l09",
    timestamp: "14:31:18.993",
    level: "debug",
    service: "API Gateway",
    message:
      "Route matched: POST /api/erp/orders \u2192 erp-service:8080 [req_id: r_9f2a1c]",
  },
  {
    id: "l10",
    timestamp: "14:31:15.104",
    level: "info",
    service: "AI Service",
    message:
      "LangGraph agent completed task: order_analysis in 892ms \u2014 tokens_used: 1240",
  },
  {
    id: "l11",
    timestamp: "14:31:10.772",
    level: "debug",
    service: "Database (Aurora)",
    message:
      "Query plan selected: index_scan on orders(customer_id) \u2014 rows=42 cost=0.12",
  },
  {
    id: "l12",
    timestamp: "14:31:08.330",
    level: "info",
    service: "Auth (Cognito)",
    message:
      "Token refresh for user:marcus.chen \u2014 new expiry: 2026-03-21T16:31:08Z",
  },
  {
    id: "l13",
    timestamp: "14:31:05.001",
    level: "warn",
    service: "Cache (ElastiCache)",
    message:
      "Cache miss rate elevated: 18% (threshold=10%) for key pattern orders:pending:*",
  },
  {
    id: "l14",
    timestamp: "14:31:01.488",
    level: "info",
    service: "ERP Service",
    message:
      "Inventory sync completed: 124 SKUs updated from supplier feed in 2.1s",
  },
  {
    id: "l15",
    timestamp: "14:30:58.220",
    level: "debug",
    service: "Projects Service",
    message:
      "Webhook delivered to github.com/vyne/api \u2014 event: push \u2014 status: 200 OK",
  },
  {
    id: "l16",
    timestamp: "14:30:54.900",
    level: "info",
    service: "Messaging Service",
    message:
      "Slack integration: forwarded 2 alert events to #engineering channel",
  },
  {
    id: "l17",
    timestamp: "14:30:50.312",
    level: "error",
    service: "ERP Service",
    message:
      "Failed to acquire write lock on inventory table \u2014 deadlock detected, transaction rolled back",
  },
  {
    id: "l18",
    timestamp: "14:30:45.104",
    level: "debug",
    service: "API Gateway",
    message: "Health check: all upstream services responded within 50ms",
  },
  {
    id: "l19",
    timestamp: "14:30:40.779",
    level: "info",
    service: "AI Service",
    message:
      "Model cache warm \u2014 embedding index loaded: 48,210 vectors in 340ms",
  },
  {
    id: "l20",
    timestamp: "14:30:35.001",
    level: "info",
    service: "Auth (Cognito)",
    message: "JWKS keys rotated successfully \u2014 new KID: kid_2026032101",
  },
];

export const ACTIVE_ALERTS: readonly AlertEntry[] = [
  {
    id: "a1",
    severity: "warning",
    service: "API Gateway",
    condition: "p95 latency > 500ms",
    triggered: "14:31 today",
    resolved: null,
    active: true,
  },
  {
    id: "a2",
    severity: "critical",
    service: "ERP Service",
    condition: "error rate > 1%",
    triggered: "14:28 today",
    resolved: null,
    active: true,
  },
];

export const ALERT_HISTORY: readonly AlertEntry[] = [
  {
    id: "ah1",
    severity: "critical",
    service: "Database (Aurora)",
    condition: "connection pool > 90%",
    triggered: "11:15 today",
    resolved: "11:42 today",
    active: false,
  },
  {
    id: "ah2",
    severity: "warning",
    service: "AI Service",
    condition: "p99 > 2000ms",
    triggered: "09:50 today",
    resolved: "10:05 today",
    active: false,
  },
  {
    id: "ah3",
    severity: "warning",
    service: "Cache (ElastiCache)",
    condition: "miss rate > 15%",
    triggered: "08:30 today",
    resolved: "08:55 today",
    active: false,
  },
  {
    id: "ah4",
    severity: "critical",
    service: "API Gateway",
    condition: "5xx rate > 5%",
    triggered: "Yesterday 22:10",
    resolved: "Yesterday 22:34",
    active: false,
  },
];

export const TRACE_SPANS: readonly TraceSpan[] = [
  {
    id: "ts1",
    service: "API Gateway",
    operation: "POST /api/orders \u2192 route",
    durationMs: 12,
    offsetMs: 0,
    color: "#06B6D4",
  },
  {
    id: "ts2",
    service: "Auth (Cognito)",
    operation: "JWT verify + RBAC check",
    durationMs: 8,
    offsetMs: 12,
    color: "#22C55E",
  },
  {
    id: "ts3",
    service: "ERP Service",
    operation: "OrderProcessor.create()",
    durationMs: 45,
    offsetMs: 20,
    color: "#F59E0B",
  },
  {
    id: "ts4",
    service: "Database",
    operation: "INSERT orders + inventory",
    durationMs: 38,
    offsetMs: 25,
    color: "#3B82F6",
  },
];

export const TOTAL_TRACE_MS = 103;
