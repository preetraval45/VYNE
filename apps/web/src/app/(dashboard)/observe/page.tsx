'use client'

import { useState, useEffect } from 'react'

// ─── Types ────────────────────────────────────────────────────────
type ServiceStatus = 'healthy' | 'degraded' | 'down'
type LogLevel = 'error' | 'warn' | 'info' | 'debug'
type AlertSeverity = 'critical' | 'warning' | 'info'
type TabId = 'overview' | 'metrics' | 'logs' | 'alerts' | 'traces'
type Environment = 'Production' | 'Staging' | 'Dev'
type TimeRange = '1h' | '6h' | '24h' | '7d'
type LogFilter = 'All' | 'Error' | 'Warn' | 'Info' | 'Debug'

interface Service {
  id: string
  name: string
  icon: string
  status: ServiceStatus
  responseMs: number
  errorRate: number
  sparkline: readonly number[]
}

interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  service: string
  message: string
}

interface AlertEntry {
  id: string
  severity: AlertSeverity
  service: string
  condition: string
  triggered: string
  resolved: string | null
  active: boolean
}

interface TraceSpan {
  id: string
  service: string
  operation: string
  durationMs: number
  offsetMs: number
  color: string
}

interface Endpoint {
  id: string
  method: string
  path: string
  p50: number
  p95: number
  p99: number
  count: number
}

interface DeployEvent {
  id: string
  time: string
  version: string
  service: string
  note: string
}

// ─── Mock Data ────────────────────────────────────────────────────
const SERVICES: readonly Service[] = [
  { id: 'api-gateway',   name: 'API Gateway',        icon: '⚡', status: 'healthy',  responseMs: 42,  errorRate: 0.01, sparkline: [40,38,45,42,50,39,41,43,38,44,42,41] },
  { id: 'messaging',     name: 'Messaging Service',   icon: '💬', status: 'healthy',  responseMs: 18,  errorRate: 0, sparkline: [20,18,17,19,21,18,16,19,20,17,18,18] },
  { id: 'erp',           name: 'ERP Service',         icon: '📦', status: 'degraded', responseMs: 312, errorRate: 1.24, sparkline: [80,90,120,200,280,310,295,312,308,315,312,312] },
  { id: 'projects',      name: 'Projects Service',    icon: '📋', status: 'healthy',  responseMs: 67,  errorRate: 0.02, sparkline: [65,70,68,72,66,69,67,71,68,66,70,67] },
  { id: 'ai',            name: 'AI Service',          icon: '🧠', status: 'healthy',  responseMs: 890, errorRate: 0.05, sparkline: [800,850,920,880,910,870,890,900,880,895,890,890] },
  { id: 'auth',          name: 'Auth (Cognito)',       icon: '🔐', status: 'healthy',  responseMs: 23,  errorRate: 0, sparkline: [22,24,23,21,25,22,24,23,22,24,23,23] },
  { id: 'database',      name: 'Database (Aurora)',   icon: '🗄️', status: 'healthy',  responseMs: 8,   errorRate: 0, sparkline: [7,8,9,8,7,8,9,8,7,8,8,8] },
  { id: 'cache',         name: 'Cache (ElastiCache)', icon: '⚡', status: 'healthy',  responseMs: 1,   errorRate: 0, sparkline: [1,1,2,1,1,1,1,2,1,1,1,1] },
]

const REQUEST_BARS: readonly number[] = [
  420, 380, 410, 450, 490, 520, 480, 510, 540, 500, 470, 490,
  530, 560, 590, 570, 550, 580, 610, 590, 560, 540, 520, 510,
]

const ERROR_BARS: readonly number[] = [
  2, 1, 2, 3, 2, 1, 2, 2, 8, 12, 15, 18, 20, 18, 16, 14, 12, 10, 8, 6, 4, 3, 2, 2,
]

const SLOWEST_ENDPOINTS: readonly Endpoint[] = [
  { id: 'ep1', method: 'POST', path: '/api/erp/orders',        p50: 280, p95: 490, p99: 820, count: 1240 },
  { id: 'ep2', method: 'GET',  path: '/api/ai/completions',    p50: 890, p95: 1420, p99: 2100, count: 380 },
  { id: 'ep3', method: 'PUT',  path: '/api/erp/inventory',     p50: 210, p95: 380, p99: 640, count: 890 },
  { id: 'ep4', method: 'POST', path: '/api/projects/issues',   p50: 95, p95: 180, p99: 310, count: 2100 },
  { id: 'ep5', method: 'GET',  path: '/api/messaging/threads', p50: 45, p95: 120, p99: 240, count: 4200 },
]

const DEPLOY_EVENTS: readonly DeployEvent[] = [
  { id: 'dep1', time: '09:42', version: 'api-service v2.4.1',   service: 'API Gateway',    note: '⚠️ Caused p95 spike' },
  { id: 'dep2', time: '11:15', version: 'erp-service v3.1.2',   service: 'ERP Service',    note: '⚠️ Error rate increase' },
  { id: 'dep3', time: '14:00', version: 'auth-service v1.8.2',  service: 'Auth (Cognito)', note: '✅ Clean deploy' },
  { id: 'dep4', time: '16:30', version: 'ai-service v1.2.0',    service: 'AI Service',     note: '✅ Clean deploy' },
]

const CPU_USAGE: readonly { id: string; service: string; pct: number }[] = [
  { id: 'cpu1', service: 'API Gateway',        pct: 42 },
  { id: 'cpu2', service: 'Messaging Service',  pct: 18 },
  { id: 'cpu3', service: 'ERP Service',        pct: 78 },
  { id: 'cpu4', service: 'Projects Service',   pct: 31 },
  { id: 'cpu5', service: 'AI Service',         pct: 65 },
  { id: 'cpu6', service: 'Auth (Cognito)',      pct: 12 },
  { id: 'cpu7', service: 'Database (Aurora)',  pct: 55 },
  { id: 'cpu8', service: 'Cache (ElastiCache)',pct: 8 },
]

const MEM_USAGE: readonly { id: string; service: string; pct: number; used: string; total: string }[] = [
  { id: 'mem1', service: 'API Gateway',        pct: 51, used: '2.1 GB', total: '4 GB' },
  { id: 'mem2', service: 'Messaging Service',  pct: 28, used: '0.6 GB', total: '2 GB' },
  { id: 'mem3', service: 'ERP Service',        pct: 82, used: '6.6 GB', total: '8 GB' },
  { id: 'mem4', service: 'Projects Service',   pct: 44, used: '0.9 GB', total: '2 GB' },
  { id: 'mem5', service: 'AI Service',         pct: 71, used: '11.4 GB', total: '16 GB' },
  { id: 'mem6', service: 'Auth (Cognito)',      pct: 19, used: '0.4 GB', total: '2 GB' },
  { id: 'mem7', service: 'Database (Aurora)',  pct: 66, used: '5.3 GB', total: '8 GB' },
  { id: 'mem8', service: 'Cache (ElastiCache)',pct: 34, used: '1.4 GB', total: '4 GB' },
]

const DB_POOL: readonly { id: string; label: string; used: number; total: number }[] = [
  { id: 'pool1', label: 'Read Pool',  used: 18, total: 30 },
  { id: 'pool2', label: 'Write Pool', used: 7,  total: 10 },
]

const BUSINESS_METRICS: readonly { id: string; label: string; value: string; trend: string; trendUp: boolean }[] = [
  { id: 'bm1', label: 'Orders / min',      value: '4.2',  trend: '↑ 12%', trendUp: true },
  { id: 'bm2', label: 'Messages / min',    value: '28.7', trend: '↑ 5%',  trendUp: true },
  { id: 'bm3', label: 'Active Users',      value: '342',  trend: '↓ 3%',  trendUp: false },
  { id: 'bm4', label: 'AI Queries / hour', value: '1,840',trend: '↑ 22%', trendUp: true },
]

const LOG_ENTRIES: readonly LogEntry[] = [
  { id: 'l01', timestamp: '14:32:01.221', level: 'error', service: 'ERP Service',      message: 'Unhandled exception: NullReferenceException in OrderProcessor.ProcessBatch() at line 142' },
  { id: 'l02', timestamp: '14:31:58.100', level: 'error', service: 'ERP Service',      message: 'Database connection timeout after 30s — pool exhausted (18/18 connections in use)' },
  { id: 'l03', timestamp: '14:31:45.884', level: 'warn',  service: 'API Gateway',      message: 'p95 latency exceeded 500ms threshold: current=512ms for route POST /api/erp/orders' },
  { id: 'l04', timestamp: '14:31:40.003', level: 'warn',  service: 'AI Service',       message: 'LLM response time degraded: avg=1240ms (SLO=1000ms). Consider scaling inference pods.' },
  { id: 'l05', timestamp: '14:31:35.442', level: 'info',  service: 'Auth (Cognito)',   message: 'User preet@vyne.dev authenticated successfully via OAuth2 [session: s_abc123]' },
  { id: 'l06', timestamp: '14:31:30.819', level: 'info',  service: 'Projects Service', message: 'Issue ENG-47 created by user:preet — sprint:12 priority:high' },
  { id: 'l07', timestamp: '14:31:28.201', level: 'warn',  service: 'ERP Service',      message: 'Retry attempt 2/3 for order ORD-00891 — upstream inventory service returned 503' },
  { id: 'l08', timestamp: '14:31:22.567', level: 'info',  service: 'Messaging Service',message: 'Channel #alerts: 3 new messages delivered to 12 subscribers' },
  { id: 'l09', timestamp: '14:31:18.993', level: 'debug', service: 'API Gateway',      message: 'Route matched: POST /api/erp/orders → erp-service:8080 [req_id: r_9f2a1c]' },
  { id: 'l10', timestamp: '14:31:15.104', level: 'info',  service: 'AI Service',       message: 'LangGraph agent completed task: order_analysis in 892ms — tokens_used: 1240' },
  { id: 'l11', timestamp: '14:31:10.772', level: 'debug', service: 'Database (Aurora)',message: 'Query plan selected: index_scan on orders(customer_id) — rows=42 cost=0.12' },
  { id: 'l12', timestamp: '14:31:08.330', level: 'info',  service: 'Auth (Cognito)',   message: 'Token refresh for user:marcus.chen — new expiry: 2026-03-21T16:31:08Z' },
  { id: 'l13', timestamp: '14:31:05.001', level: 'warn',  service: 'Cache (ElastiCache)', message: 'Cache miss rate elevated: 18% (threshold=10%) for key pattern orders:pending:*' },
  { id: 'l14', timestamp: '14:31:01.488', level: 'info',  service: 'ERP Service',      message: 'Inventory sync completed: 124 SKUs updated from supplier feed in 2.1s' },
  { id: 'l15', timestamp: '14:30:58.220', level: 'debug', service: 'Projects Service', message: 'Webhook delivered to github.com/vyne/api — event: push — status: 200 OK' },
  { id: 'l16', timestamp: '14:30:54.900', level: 'info',  service: 'Messaging Service',message: 'Slack integration: forwarded 2 alert events to #engineering channel' },
  { id: 'l17', timestamp: '14:30:50.312', level: 'error', service: 'ERP Service',      message: 'Failed to acquire write lock on inventory table — deadlock detected, transaction rolled back' },
  { id: 'l18', timestamp: '14:30:45.104', level: 'debug', service: 'API Gateway',      message: 'Health check: all upstream services responded within 50ms' },
  { id: 'l19', timestamp: '14:30:40.779', level: 'info',  service: 'AI Service',       message: 'Model cache warm — embedding index loaded: 48,210 vectors in 340ms' },
  { id: 'l20', timestamp: '14:30:35.001', level: 'info',  service: 'Auth (Cognito)',   message: 'JWKS keys rotated successfully — new KID: kid_2026032101' },
]

const ACTIVE_ALERTS: readonly AlertEntry[] = [
  { id: 'a1', severity: 'warning',  service: 'API Gateway', condition: 'p95 latency > 500ms', triggered: '14:31 today', resolved: null, active: true },
  { id: 'a2', severity: 'critical', service: 'ERP Service', condition: 'error rate > 1%',     triggered: '14:28 today', resolved: null, active: true },
]

const ALERT_HISTORY: readonly AlertEntry[] = [
  { id: 'ah1', severity: 'critical', service: 'Database (Aurora)',  condition: 'connection pool > 90%', triggered: '11:15 today',  resolved: '11:42 today',  active: false },
  { id: 'ah2', severity: 'warning',  service: 'AI Service',         condition: 'p99 > 2000ms',          triggered: '09:50 today',  resolved: '10:05 today',  active: false },
  { id: 'ah3', severity: 'warning',  service: 'Cache (ElastiCache)',condition: 'miss rate > 15%',        triggered: '08:30 today',  resolved: '08:55 today',  active: false },
  { id: 'ah4', severity: 'critical', service: 'API Gateway',        condition: '5xx rate > 5%',          triggered: 'Yesterday 22:10', resolved: 'Yesterday 22:34', active: false },
]

const TRACE_SPANS: readonly TraceSpan[] = [
  { id: 'ts1', service: 'API Gateway',   operation: 'POST /api/orders → route',  durationMs: 12, offsetMs: 0,  color: '#6C47FF' },
  { id: 'ts2', service: 'Auth (Cognito)',operation: 'JWT verify + RBAC check',   durationMs: 8,  offsetMs: 12, color: '#22C55E' },
  { id: 'ts3', service: 'ERP Service',   operation: 'OrderProcessor.create()',   durationMs: 45, offsetMs: 20, color: '#F59E0B' },
  { id: 'ts4', service: 'Database',      operation: 'INSERT orders + inventory', durationMs: 38, offsetMs: 25, color: '#3B82F6' },
]

const TOTAL_TRACE_MS = 103

// ─── Helper functions (no nested ternaries) ───────────────────────
function getStatusColor(status: ServiceStatus): string {
  if (status === 'healthy') { return '#22C55E' }
  if (status === 'degraded') { return '#F59E0B' }
  return '#EF4444'
}

function getStatusLabel(status: ServiceStatus): string {
  if (status === 'healthy') { return 'Healthy' }
  if (status === 'degraded') { return 'Degraded' }
  return 'Down'
}

function getLevelColor(level: LogLevel): string {
  if (level === 'error') { return '#EF4444' }
  if (level === 'warn')  { return '#F59E0B' }
  if (level === 'info')  { return '#3B82F6' }
  return '#6B6B8A'
}

function getLevelBg(level: LogLevel): string {
  if (level === 'error') { return '#FEF2F2' }
  if (level === 'warn')  { return '#FFFBEB' }
  if (level === 'info')  { return '#EFF6FF' }
  return '#F0F0F8'
}

function getSeverityColor(severity: AlertSeverity): string {
  if (severity === 'critical') { return '#EF4444' }
  if (severity === 'warning')  { return '#F59E0B' }
  return '#3B82F6'
}

function getSeverityBg(severity: AlertSeverity): string {
  if (severity === 'critical') { return '#FEF2F2' }
  if (severity === 'warning')  { return '#FFFBEB' }
  return '#EFF6FF'
}

function getBarColor(pct: number): string {
  if (pct >= 80) { return '#EF4444' }
  if (pct >= 60) { return '#F59E0B' }
  return '#6C47FF'
}

function getErrorBarColor(val: number): string {
  if (val > 10) { return '#EF4444' }
  if (val > 5)  { return '#F59E0B' }
  return '#22C55E'
}

function matchesLogFilter(entry: LogEntry, filter: LogFilter): boolean {
  if (filter === 'All')   { return true }
  if (filter === 'Error') { return entry.level === 'error' }
  if (filter === 'Warn')  { return entry.level === 'warn' }
  if (filter === 'Info')  { return entry.level === 'info' }
  return entry.level === 'debug'
}

function filterLogEntries(entries: readonly LogEntry[], filter: LogFilter, search: string, service: string): readonly LogEntry[] {
  return entries.filter((e) => {
    const levelOk = matchesLogFilter(e, filter)
    const searchOk = search.length === 0 || e.message.toLowerCase().includes(search.toLowerCase())
    const serviceOk = service === 'All Services' || e.service === service
    return levelOk && searchOk && serviceOk
  })
}

// ─── Sub-components ───────────────────────────────────────────────

function KpiCard({ label, value, unit, color, note }: Readonly<{
  label: string; value: string; unit: string; color: string; note: string
}>) {
  return (
    <div style={{
      background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12,
      padding: '16px 18px', flex: 1, minWidth: 0,
    }}>
      <div style={{ fontSize: 11, color: '#6B6B8A', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 13, color: '#A0A0B8', fontWeight: 500 }}>{unit}</span>
      </div>
      <div style={{ fontSize: 11, color: '#A0A0B8', marginTop: 5 }}>{note}</div>
    </div>
  )
}

function Sparkline({ data }: Readonly<{ data: readonly number[] }>) {
  const max = Math.max(...data)
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 24 }}>
      {data.map((val, idx) => (
        <div
          key={`spark-${idx}-${val}`}
          style={{
            width: 4,
            height: `${Math.round((val / max) * 100)}%`,
            background: '#6C47FF',
            opacity: 0.4 + 0.6 * (idx / (data.length - 1)),
            borderRadius: 1,
            minHeight: 2,
          }}
        />
      ))}
    </div>
  )
}

function ServiceCard({ svc }: Readonly<{ svc: Service }>) {
  const dotColor = getStatusColor(svc.status)
  const statusLabel = getStatusLabel(svc.status)
  return (
    <div style={{
      background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12,
      padding: '14px 16px',
      borderTop: `3px solid ${dotColor}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>{svc.icon}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{svc.name}</span>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} title={statusLabel} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: '#A0A0B8' }}>Response</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E' }}>{svc.responseMs}ms</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: '#A0A0B8' }}>Error rate</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: svc.errorRate > 0.5 ? '#EF4444' : '#1A1A2E' }}>{svc.errorRate.toFixed(2)}%</div>
        </div>
      </div>
      <Sparkline data={svc.sparkline} />
    </div>
  )
}

function RequestRateChart({ bars, animated }: Readonly<{ bars: readonly number[]; animated: boolean }>) {
  const max = Math.max(...bars)
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A2E', marginBottom: 10 }}>Request Rate (req/s) — last 24h</div>
      <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 80 }}>
        {bars.map((val, idx) => (
          <div
            key={`reqbar-${idx}-${val}`}
            style={{
              flex: 1,
              height: animated ? `${Math.round((val / max) * 100)}%` : '0%',
              background: 'linear-gradient(to top, #6C47FF, #9B7DFF)',
              borderRadius: '2px 2px 0 0',
              minHeight: 2,
              transition: `height 0.6s ease ${(idx * 25).toString()}ms`,
            }}
            title={`${val} req/s`}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 10, color: '#A0A0B8' }}>-24h</span>
        <span style={{ fontSize: 10, color: '#A0A0B8' }}>-12h</span>
        <span style={{ fontSize: 10, color: '#A0A0B8' }}>now</span>
      </div>
    </div>
  )
}

function ErrorRateChart({ bars }: Readonly<{ bars: readonly number[] }>) {
  const max = Math.max(...bars)
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A2E', marginBottom: 10 }}>Error Rate (errors/min) — last 24h</div>
      <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 60 }}>
        {bars.map((val, idx) => (
          <div
            key={`errbar-${idx}-${val}`}
            style={{
              flex: 1,
              height: `${Math.round((val / max) * 100)}%`,
              background: getErrorBarColor(val),
              borderRadius: '2px 2px 0 0',
              minHeight: 2,
              opacity: 0.85,
            }}
            title={`${val} err/min`}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 10, color: '#A0A0B8' }}>-24h</span>
        <span style={{ fontSize: 10, color: '#A0A0B8' }}>now</span>
      </div>
    </div>
  )
}

function ProgressBar({ pct, label, sublabel }: Readonly<{ pct: number; label: string; sublabel?: string }>) {
  const color = getBarColor(pct)
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#1A1A2E' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color }}>{sublabel ?? `${pct.toString()}%`}</span>
      </div>
      <div style={{ height: 6, background: '#F0F0F8', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct.toString()}%`, background: color, borderRadius: 6, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  )
}

function OverviewTab({ animated }: Readonly<{ animated: boolean }>) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '16px 18px' }}>
          <RequestRateChart bars={REQUEST_BARS} animated={animated} />
        </div>
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '16px 18px' }}>
          <ErrorRateChart bars={ERROR_BARS} />
        </div>
      </div>

      {/* Slowest endpoints */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '16px 18px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 12 }}>Top 5 Slowest Endpoints</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Method', 'Path', 'p50', 'p95', 'p99', 'Count'].map((h) => (
                <th key={h} style={{ textAlign: 'left', color: '#A0A0B8', fontWeight: 500, paddingBottom: 8, fontSize: 11, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOWEST_ENDPOINTS.map((ep) => (
              <tr key={ep.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                <td style={{ padding: '8px 0' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                    background: ep.method === 'GET' ? '#EFF6FF' : '#F0FDF4',
                    color: ep.method === 'GET' ? '#1E40AF' : '#166534',
                  }}>{ep.method}</span>
                </td>
                <td style={{ padding: '8px 8px 8px 0', color: '#1A1A2E', fontFamily: 'monospace', fontSize: 11 }}>{ep.path}</td>
                <td style={{ padding: '8px 0', color: '#1A1A2E' }}>{ep.p50.toString()}ms</td>
                <td style={{ padding: '8px 0', color: ep.p95 > 400 ? '#F59E0B' : '#1A1A2E' }}>{ep.p95.toString()}ms</td>
                <td style={{ padding: '8px 0', color: ep.p99 > 700 ? '#EF4444' : '#1A1A2E', fontWeight: ep.p99 > 700 ? 600 : 400 }}>{ep.p99.toString()}ms</td>
                <td style={{ padding: '8px 0', color: '#6B6B8A' }}>{ep.count.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent deploys */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '16px 18px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 14 }}>Recent Deploys</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {DEPLOY_EVENTS.map((dep, idx) => (
            <div key={dep.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingBottom: idx < DEPLOY_EVENTS.length - 1 ? 14 : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#6C47FF', marginTop: 2 }} />
                {idx < DEPLOY_EVENTS.length - 1 && <div style={{ width: 2, flex: 1, background: 'rgba(108,71,255,0.15)', minHeight: 14, marginTop: 2 }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#A0A0B8', fontFamily: 'monospace' }}>{dep.time}</span>
                  <code style={{ fontSize: 11, background: '#F0F0F8', padding: '1px 6px', borderRadius: 4, color: '#6C47FF' }}>{dep.version}</code>
                  <span style={{ fontSize: 11, color: '#6B6B8A' }}>{dep.service}</span>
                </div>
                <div style={{ fontSize: 11, color: '#6B6B8A', marginTop: 2 }}>{dep.note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MetricsTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 14 }}>CPU Usage</div>
          {CPU_USAGE.map((row) => (
            <ProgressBar key={row.id} label={row.service} pct={row.pct} />
          ))}
        </div>
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 14 }}>Memory Usage</div>
          {MEM_USAGE.map((row) => (
            <ProgressBar key={row.id} label={row.service} pct={row.pct} sublabel={`${row.used} / ${row.total}`} />
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 14 }}>Network I/O</div>
          {[
            { id: 'net1', label: 'API Gateway — In',        pct: 38, sublabel: '142 MB/s' },
            { id: 'net2', label: 'API Gateway — Out',       pct: 55, sublabel: '210 MB/s' },
            { id: 'net3', label: 'ERP Service — In',        pct: 71, sublabel: '272 MB/s' },
            { id: 'net4', label: 'Database (Aurora) — In',  pct: 49, sublabel: '188 MB/s' },
            { id: 'net5', label: 'Database (Aurora) — Out', pct: 62, sublabel: '238 MB/s' },
          ].map((row) => (
            <ProgressBar key={row.id} label={row.label} pct={row.pct} sublabel={row.sublabel} />
          ))}
        </div>
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 14 }}>DB Connection Pool</div>
          {DB_POOL.map((pool) => {
            const pct = Math.round((pool.used / pool.total) * 100)
            return (
              <div key={pool.id} style={{ marginBottom: 14 }}>
                <ProgressBar label={pool.label} pct={pct} sublabel={`${pool.used.toString()} / ${pool.total.toString()} connections`} />
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: '#6B6B8A' }}>Active: {pool.used.toString()}</span>
                  <span style={{ fontSize: 10, color: '#A0A0B8' }}>•</span>
                  <span style={{ fontSize: 10, color: '#6B6B8A' }}>Idle: {(pool.total - pool.used).toString()}</span>
                  <span style={{ fontSize: 10, color: '#A0A0B8' }}>•</span>
                  <span style={{ fontSize: 10, color: '#6B6B8A' }}>Max: {pool.total.toString()}</span>
                </div>
              </div>
            )
          })}
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 14, marginTop: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A2E', marginBottom: 10 }}>Business Metrics</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {BUSINESS_METRICS.map((m) => (
                <div key={m.id} style={{ background: '#F7F7FB', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: '#6B6B8A', marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E' }}>{m.value}</div>
                  <div style={{ fontSize: 10, color: m.trendUp ? '#22C55E' : '#EF4444', marginTop: 2 }}>{m.trend}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LogsTab() {
  const [filter, setFilter] = useState<LogFilter>('All')
  const [search, setSearch] = useState('')
  const [serviceFilter, setServiceFilter] = useState('All Services')
  const [autoRefresh, setAutoRefresh] = useState(false)

  const LOG_FILTERS: readonly LogFilter[] = ['All', 'Error', 'Warn', 'Info', 'Debug']
  const SERVICE_OPTIONS = ['All Services', ...Array.from(new Set(LOG_ENTRIES.map((e) => e.service)))]

  const filtered = filterLogEntries(LOG_ENTRIES, filter, search, serviceFilter)

  return (
    <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '16px 18px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        {/* Level filter pills */}
        <div style={{ display: 'flex', gap: 4 }}>
          {LOG_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, border: 'none', cursor: 'pointer',
                background: filter === f ? '#6C47FF' : '#F0F0F8',
                color: filter === f ? '#fff' : '#6B6B8A',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Service filter */}
        <label htmlFor="log-service-select" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Service</label>
        <select
          id="log-service-select"
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          style={{
            padding: '4px 8px', borderRadius: 8, fontSize: 11, border: '1px solid rgba(0,0,0,0.12)',
            background: '#fff', color: '#1A1A2E', cursor: 'pointer',
          }}
        >
          {SERVICE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Search */}
        <label htmlFor="log-search-input" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Search logs</label>
        <input
          id="log-search-input"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search logs..."
          style={{
            flex: 1, minWidth: 160, padding: '4px 10px', borderRadius: 8, fontSize: 11,
            border: '1px solid rgba(0,0,0,0.12)', background: '#fff', color: '#1A1A2E',
          }}
        />

        {/* Auto-refresh toggle */}
        <label htmlFor="auto-refresh-toggle" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, color: '#6B6B8A' }}>
          <input
            id="auto-refresh-toggle"
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            style={{ accentColor: '#6C47FF', cursor: 'pointer' }}
          />
          <span>Auto-refresh</span>
        </label>
      </div>

      {/* Count */}
      <div style={{ fontSize: 11, color: '#A0A0B8', marginBottom: 10 }}>
        Showing {filtered.length.toString()} of {LOG_ENTRIES.length.toString()} entries
      </div>

      {/* Log list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filtered.map((entry) => (
          <div
            key={entry.id}
            style={{
              display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px',
              borderRadius: 6, background: '#FAFAFE', fontFamily: 'monospace',
              borderLeft: `3px solid ${getLevelColor(entry.level)}`,
            }}
          >
            <span style={{ fontSize: 10, color: '#A0A0B8', flexShrink: 0, lineHeight: 1.8 }}>{entry.timestamp}</span>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, flexShrink: 0, lineHeight: 1.6,
              background: getLevelBg(entry.level), color: getLevelColor(entry.level), textTransform: 'uppercase',
            }}>
              {entry.level}
            </span>
            <span style={{ fontSize: 10, color: '#6C47FF', flexShrink: 0, lineHeight: 1.8 }}>{entry.service}</span>
            <span style={{ fontSize: 11, color: '#1A1A2E', lineHeight: 1.6, flex: 1, minWidth: 0, wordBreak: 'break-word', fontFamily: 'monospace' }}>
              {entry.message}
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#A0A0B8', fontSize: 12 }}>
            No log entries match your filters.
          </div>
        )}
      </div>
    </div>
  )
}

function AlertBanner({ alert }: Readonly<{ alert: AlertEntry }>) {
  const bg = alert.severity === 'critical' ? '#FEF2F2' : '#FFFBEB'
  const border = alert.severity === 'critical' ? '#EF4444' : '#F59E0B'
  const textColor = alert.severity === 'critical' ? '#991B1B' : '#92400E'
  const icon = alert.severity === 'critical' ? '🔴' : '🟠'
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: textColor }}>{alert.service} — {alert.condition}</div>
        <div style={{ fontSize: 11, color: textColor, opacity: 0.8, marginTop: 2 }}>Triggered: {alert.triggered} · Active</div>
      </div>
      <span style={{
        fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.06em',
        background: border, color: '#fff',
      }}>{alert.severity}</span>
    </div>
  )
}

function AlertsTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 10 }}>Active Alerts (2)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ACTIVE_ALERTS.map((a) => <AlertBanner key={a.id} alert={a} />)}
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>Alert History</div>
          <button style={{
            background: '#6C47FF', color: '#fff', border: 'none', borderRadius: 8,
            padding: '6px 14px', fontSize: 11, fontWeight: 500, cursor: 'pointer',
          }}>
            + Create Alert Rule
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Severity', 'Service', 'Condition', 'Triggered', 'Resolved'].map((h) => (
                <th key={h} style={{ textAlign: 'left', color: '#A0A0B8', fontWeight: 500, paddingBottom: 8, fontSize: 11, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALERT_HISTORY.map((a) => (
              <tr key={a.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                <td style={{ padding: '8px 0' }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 3, textTransform: 'uppercase',
                    background: getSeverityBg(a.severity), color: getSeverityColor(a.severity),
                  }}>{a.severity}</span>
                </td>
                <td style={{ padding: '8px 8px 8px 0', color: '#1A1A2E' }}>{a.service}</td>
                <td style={{ padding: '8px 8px 8px 0', color: '#6B6B8A', fontFamily: 'monospace', fontSize: 11 }}>{a.condition}</td>
                <td style={{ padding: '8px 8px 8px 0', color: '#6B6B8A', fontSize: 11 }}>{a.triggered}</td>
                <td style={{ padding: '8px 0', color: '#22C55E', fontSize: 11 }}>{a.resolved ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TracesTab() {
  return (
    <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>Distributed Trace Viewer</div>
        <div style={{ fontSize: 11, color: '#6B6B8A', marginTop: 2 }}>
          <span>{'Trace ID: '}</span>
          <code style={{ background: '#F0F0F8', padding: '1px 5px', borderRadius: 3, fontSize: 10 }}>{'trc_9f2a1c8e'}</code>
          <span>{' · POST /api/orders · Total: '}</span>
          <strong>{TOTAL_TRACE_MS.toString()}{'ms'}</strong>
          <span>{' · Status: '}</span>
          <span style={{ color: '#22C55E', fontWeight: 600 }}>{'200 OK'}</span>
        </div>
      </div>

      {/* Timeline header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 8 }}>
        <div style={{ width: 180, flexShrink: 0, fontSize: 10, color: '#A0A0B8' }}>Service / Operation</div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: '#A0A0B8' }}>0ms</span>
          <span style={{ fontSize: 10, color: '#A0A0B8' }}>{Math.round(TOTAL_TRACE_MS / 2).toString()}ms</span>
          <span style={{ fontSize: 10, color: '#A0A0B8' }}>{TOTAL_TRACE_MS.toString()}ms</span>
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: 12 }}>
        {TRACE_SPANS.map((span, idx) => {
          const leftPct = (span.offsetMs / TOTAL_TRACE_MS) * 100
          const widthPct = (span.durationMs / TOTAL_TRACE_MS) * 100
          return (
            <div key={span.id} style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 10, paddingLeft: `${(idx * 16).toString()}px` }}>
              <div style={{ width: `${(180 - idx * 16).toString()}px`, flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#1A1A2E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{span.service}</div>
                <div style={{ fontSize: 10, color: '#6B6B8A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{span.operation}</div>
              </div>
              <div style={{ flex: 1, height: 28, position: 'relative', background: '#F7F7FB', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute',
                  left: `${leftPct.toString()}%`,
                  width: `${widthPct.toString()}%`,
                  height: '100%',
                  background: span.color,
                  borderRadius: 4,
                  opacity: 0.85,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 32,
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{span.durationMs.toString()}ms</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 12 }}>
        {TRACE_SPANS.map((span) => (
          <div key={span.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: span.color }} />
            <span style={{ fontSize: 11, color: '#6B6B8A' }}>{span.service}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────
export default function ObservePage() {
  const [env, setEnv] = useState<Environment>('Production')
  const [timeRange, setTimeRange] = useState<TimeRange>('24h')
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [animated, setAnimated] = useState(false)

  const ENVS: readonly Environment[] = ['Production', 'Staging', 'Dev']
  const TIME_RANGES: readonly TimeRange[] = ['1h', '6h', '24h', '7d']
  const TABS: readonly { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'metrics',  label: 'Metrics' },
    { id: 'logs',     label: 'Logs' },
    { id: 'alerts',   label: 'Alerts' },
    { id: 'traces',   label: 'Traces' },
  ]

  useEffect(() => {
    const timer = globalThis.setTimeout(() => { setAnimated(true) }, 80)
    return () => { globalThis.clearTimeout(timer) }
  }, [])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F7F7FB' }}>

      {/* Header */}
      <div style={{
        height: 48, borderBottom: '1px solid rgba(0,0,0,0.08)', background: '#fff',
        display: 'flex', alignItems: 'center', padding: '0 18px', gap: 10, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#6C47FF,#9B7DFF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>Observe</span>
          <span style={{ fontSize: 10, fontWeight: 600, background: '#F0FDF4', color: '#166534', padding: '2px 7px', borderRadius: 20 }}>● LIVE</span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Environment picker */}
          <div style={{ display: 'flex', gap: 2, background: '#F0F0F8', borderRadius: 8, padding: 3 }}>
            {ENVS.map((e) => (
              <button
                key={e}
                onClick={() => setEnv(e)}
                style={{
                  padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500, border: 'none', cursor: 'pointer',
                  background: env === e ? '#fff' : 'transparent',
                  color: env === e ? '#1A1A2E' : '#6B6B8A',
                  boxShadow: env === e ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s',
                }}
              >{e}</button>
            ))}
          </div>

          {/* Time range picker */}
          <div style={{ display: 'flex', gap: 2, background: '#F0F0F8', borderRadius: 8, padding: 3 }}>
            {TIME_RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                style={{
                  padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 500, border: 'none', cursor: 'pointer',
                  background: timeRange === r ? '#6C47FF' : 'transparent',
                  color: timeRange === r ? '#fff' : '#6B6B8A',
                  transition: 'all 0.15s',
                }}
              >{r}</button>
            ))}
          </div>

          <button style={{
            background: 'transparent', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8,
            padding: '4px 12px', fontSize: 11, fontWeight: 500, color: '#6B6B8A', cursor: 'pointer',
          }}>
            🔔 Alert Rules
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="content-scroll" style={{ flex: 1, overflowY: 'auto', padding: 18 }}>

        {/* KPI Row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
          <KpiCard label="Uptime" value="99.97" unit="%" color="#22C55E" note="↑ 0.01% from last week" />
          <KpiCard label="Avg Response" value="142" unit="ms" color="#22C55E" note="p50 across all services" />
          <KpiCard label="Error Rate" value="0.03" unit="%" color="#22C55E" note="Global · last 24h" />
          <KpiCard label="Active Alerts" value="2" unit="" color="#F59E0B" note="1 critical · 1 warning" />
        </div>

        {/* Service Health Map */}
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '16px 18px', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>Service Health Map</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#6B6B8A' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} /> Healthy
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#6B6B8A' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} /> Degraded
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#6B6B8A' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} /> Down
              </span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {SERVICES.map((svc) => <ServiceCard key={svc.id} svc={svc} />)}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden' }}>
          {/* Tab Bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '0 18px' }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 16px', fontSize: 12, fontWeight: 500, border: 'none', background: 'transparent',
                  cursor: 'pointer', borderBottom: activeTab === tab.id ? '2px solid #6C47FF' : '2px solid transparent',
                  color: activeTab === tab.id ? '#6C47FF' : '#6B6B8A',
                  marginBottom: -1, transition: 'color 0.15s',
                }}
              >
                {tab.label}
                {tab.id === 'alerts' && (
                  <span style={{ marginLeft: 5, background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 20 }}>2</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ padding: 18 }}>
            {activeTab === 'overview' && <OverviewTab animated={animated} />}
            {activeTab === 'metrics'  && <MetricsTab />}
            {activeTab === 'logs'     && <LogsTab />}
            {activeTab === 'alerts'   && <AlertsTab />}
            {activeTab === 'traces'   && <TracesTab />}
          </div>
        </div>

        {/* Footer spacer */}
        <div style={{ height: 24 }} />
      </div>
    </div>
  )
}
