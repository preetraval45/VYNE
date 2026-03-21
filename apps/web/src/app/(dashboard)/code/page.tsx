'use client'

import { useState, useEffect } from 'react'
import { codeApi } from '@/lib/api/client'
import type { Deployment, PullRequest, Repository } from '@/types'

// ── Mock Data ─────────────────────────────────────────────────────
const MOCK_DEPLOYMENTS: Deployment[] = [
  { id: 'd1', orgId: 'demo', serviceName: 'api-service', version: 'v2.4.1', environment: 'production', status: 'failed', triggeredBy: 'GitHub Actions', commitSha: 'a1b2c3d', commitMessage: 'feat: add Secrets Manager IAM permissions', branch: 'main', startedAt: new Date(Date.now() - 420000).toISOString(), completedAt: new Date(Date.now() - 400000).toISOString(), metadata: {} },
  { id: 'd2', orgId: 'demo', serviceName: 'auth-service', version: 'v1.8.2', environment: 'production', status: 'success', triggeredBy: 'Tony M.', commitSha: 'e4f5a6b', commitMessage: 'fix: refresh token rotation', branch: 'main', startedAt: new Date(Date.now() - 3600000).toISOString(), completedAt: new Date(Date.now() - 3500000).toISOString(), metadata: {} },
  { id: 'd3', orgId: 'demo', serviceName: 'messaging-service', version: 'v1.2.0', environment: 'staging', status: 'success', triggeredBy: 'Sarah K.', commitSha: 'c7d8e9f', commitMessage: 'feat: real-time typing indicators', branch: 'feature/typing', startedAt: new Date(Date.now() - 7200000).toISOString(), completedAt: new Date(Date.now() - 7100000).toISOString(), metadata: {} },
  { id: 'd4', orgId: 'demo', serviceName: 'erp-service', version: 'v3.1.0', environment: 'staging', status: 'in_progress', triggeredBy: 'GitHub Actions', commitSha: 'a0b1c2d', commitMessage: 'feat: BOM + work order management', branch: 'feature/manufacturing', startedAt: new Date(Date.now() - 120000).toISOString(), completedAt: null, metadata: {} },
  { id: 'd5', orgId: 'demo', serviceName: 'ai-service', version: 'v0.9.3', environment: 'dev', status: 'success', triggeredBy: 'Preet R.', commitSha: 'f1a2b3c', commitMessage: 'feat: LangGraph agent orchestration', branch: 'feature/langchain', startedAt: new Date(Date.now() - 86400000).toISOString(), completedAt: new Date(Date.now() - 86300000).toISOString(), metadata: {} },
  { id: 'd6', orgId: 'demo', serviceName: 'api-service', version: 'v2.4.0', environment: 'production', status: 'rolled_back', triggeredBy: 'GitHub Actions', commitSha: 'b2c3d4e', commitMessage: 'perf: optimize database queries', branch: 'main', startedAt: new Date(Date.now() - 172800000).toISOString(), completedAt: new Date(Date.now() - 172700000).toISOString(), metadata: {} },
]

const MOCK_PRS: PullRequest[] = [
  { id: 'pr1', orgId: 'demo', repoName: 'vyne/api-service', prNumber: 142, title: 'feat: add Secrets Manager IAM permissions fix', state: 'open', author: 'Preet R.', baseBranch: 'main', headBranch: 'fix/secrets-iam', url: null, openedAt: new Date(Date.now() - 1800000).toISOString(), mergedAt: null, closedAt: null },
  { id: 'pr2', orgId: 'demo', repoName: 'vyne/auth-service', prNumber: 89, title: 'fix: refresh token rotation on expiry', state: 'merged', author: 'Tony M.', baseBranch: 'main', headBranch: 'fix/refresh-token', url: null, openedAt: new Date(Date.now() - 7200000).toISOString(), mergedAt: new Date(Date.now() - 3500000).toISOString(), closedAt: null },
  { id: 'pr3', orgId: 'demo', repoName: 'vyne/messaging-service', prNumber: 56, title: 'feat: real-time typing indicators + presence', state: 'open', author: 'Sarah K.', baseBranch: 'main', headBranch: 'feature/typing', url: null, openedAt: new Date(Date.now() - 10800000).toISOString(), mergedAt: null, closedAt: null },
  { id: 'pr4', orgId: 'demo', repoName: 'vyne/erp-service', prNumber: 211, title: 'feat: BOM and manufacturing work orders', state: 'open', author: 'Preet R.', baseBranch: 'main', headBranch: 'feature/manufacturing', url: null, openedAt: new Date(Date.now() - 14400000).toISOString(), mergedAt: null, closedAt: null },
  { id: 'pr5', orgId: 'demo', repoName: 'vyne/ai-service', prNumber: 34, title: 'feat: LangGraph multi-step agent orchestration', state: 'merged', author: 'Preet R.', baseBranch: 'main', headBranch: 'feature/langchain', url: null, openedAt: new Date(Date.now() - 172800000).toISOString(), mergedAt: new Date(Date.now() - 86400000).toISOString(), closedAt: null },
  { id: 'pr6', orgId: 'demo', repoName: 'vyne/frontend', prNumber: 98, title: 'feat: Slack-like chat with threads and reactions', state: 'merged', author: 'Preet R.', baseBranch: 'main', headBranch: 'feature/chat-v2', url: null, openedAt: new Date(Date.now() - 259200000).toISOString(), mergedAt: new Date(Date.now() - 172800000).toISOString(), closedAt: null },
]

const MOCK_REPOS: Repository[] = [
  { id: 'r1', orgId: 'demo', repoName: 'vyne/api-service', githubUrl: 'https://github.com/vyne/api-service', defaultBranch: 'main', connectedAt: '2024-01-15T00:00:00Z', lastDeployAt: new Date(Date.now() - 420000).toISOString(), lastDeployStatus: 'failed' },
  { id: 'r2', orgId: 'demo', repoName: 'vyne/auth-service', githubUrl: 'https://github.com/vyne/auth-service', defaultBranch: 'main', connectedAt: '2024-01-15T00:00:00Z', lastDeployAt: new Date(Date.now() - 3600000).toISOString(), lastDeployStatus: 'success' },
  { id: 'r3', orgId: 'demo', repoName: 'vyne/messaging-service', githubUrl: 'https://github.com/vyne/messaging-service', defaultBranch: 'main', connectedAt: '2024-02-01T00:00:00Z', lastDeployAt: new Date(Date.now() - 7200000).toISOString(), lastDeployStatus: 'success' },
  { id: 'r4', orgId: 'demo', repoName: 'vyne/erp-service', githubUrl: 'https://github.com/vyne/erp-service', defaultBranch: 'main', connectedAt: '2024-02-15T00:00:00Z', lastDeployAt: new Date(Date.now() - 120000).toISOString(), lastDeployStatus: 'in_progress' },
  { id: 'r5', orgId: 'demo', repoName: 'vyne/ai-service', githubUrl: null, defaultBranch: 'main', connectedAt: '2024-03-01T00:00:00Z', lastDeployAt: new Date(Date.now() - 86400000).toISOString(), lastDeployStatus: 'success' },
  { id: 'r6', orgId: 'demo', repoName: 'vyne/frontend', githubUrl: 'https://github.com/vyne/frontend', defaultBranch: 'main', connectedAt: '2024-01-10T00:00:00Z', lastDeployAt: new Date(Date.now() - 43200000).toISOString(), lastDeployStatus: 'success' },
]

// ── Helpers ───────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function shortSha(sha: string | null | undefined) {
  return sha ? sha.slice(0, 7) : '—'
}

function rateColor(rate: number): string {
  if (rate >= 80) return '#22C55E'
  if (rate >= 50) return '#F59E0B'
  return '#EF4444'
}

function statusFilterLabel(s: string): string {
  if (s === 'all') return 'All'
  if (s === 'in_progress') return 'In Progress'
  if (s === 'rolled_back') return 'Rolled Back'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function prIconBg(state: PullRequest['state']): string {
  if (state === 'merged') return '#F3F0FF'
  if (state === 'open') return '#F0FDF4'
  return '#F0F0F8'
}

function prIconSymbol(state: PullRequest['state']): string {
  if (state === 'merged') return '⇌'
  if (state === 'open') return '↑'
  return '✕'
}

function prTimeLabel(pr: PullRequest): string {
  if (pr.state === 'merged' && pr.mergedAt) return `Merged ${timeAgo(pr.mergedAt)}`
  if (pr.openedAt) return `Opened ${timeAgo(pr.openedAt)}`
  return '—'
}

function durationLabel(startedAt: string, completedAt: string | null | undefined): string {
  if (completedAt === null || completedAt === undefined) return '—'
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime()
  return `${Math.round(ms / 1000)}s`
}

// ── Status Badge ──────────────────────────────────────────────────
function DeployBadge({ status }: Readonly<{ status: Deployment['status'] }>) {
  const map: Record<string, { label: string; bg: string; color: string; dot: string }> = {
    success: { label: 'Success', bg: '#F0FDF4', color: '#166534', dot: '#22C55E' },
    failed: { label: 'Failed', bg: '#FEF2F2', color: '#991B1B', dot: '#EF4444' },
    in_progress: { label: 'In Progress', bg: '#EFF6FF', color: '#1E40AF', dot: '#3B82F6' },
    rolled_back: { label: 'Rolled Back', bg: '#FFF7ED', color: '#9A3412', dot: '#F97316' },
  }
  const s = map[status] ?? map.failed
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: s.bg, color: s.color }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, ...(status === 'in_progress' ? { animation: 'pulse 1.5s infinite' } : {}) }} />
      {s.label}
    </span>
  )
}

function PRBadge({ state }: Readonly<{ state: PullRequest['state'] }>) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    open: { label: 'Open', bg: '#F0FDF4', color: '#166534' },
    merged: { label: 'Merged', bg: '#F3F0FF', color: '#5B21B6' },
    closed: { label: 'Closed', bg: '#F8F8F8', color: '#6B6B8A' },
  }
  const s = map[state] ?? map.closed
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function EnvBadge({ env }: Readonly<{ env: string }>) {
  const map: Record<string, { bg: string; color: string }> = {
    production: { bg: 'rgba(239,68,68,0.1)', color: '#B91C1C' },
    staging: { bg: 'rgba(245,158,11,0.1)', color: '#92400E' },
    dev: { bg: 'rgba(59,130,246,0.1)', color: '#1E40AF' },
  }
  const s = map[env] ?? map.dev
  return (
    <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', background: s.bg, color: s.color }}>
      {env}
    </span>
  )
}

// ── Tab Button ────────────────────────────────────────────────────
function TabBtn({ label, active, onClick, count }: Readonly<{ label: string; active: boolean; onClick: () => void; count?: number }>) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: active ? 600 : 400,
        background: active ? '#6C47FF' : 'transparent',
        color: active ? '#fff' : '#6B6B8A',
        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
      }}
    >
      {label}
      {count !== undefined && (
        <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 10, background: active ? 'rgba(255,255,255,0.25)' : '#F0F0F8', color: active ? '#fff' : '#6B6B8A' }}>
          {count}
        </span>
      )}
    </button>
  )
}

// ── Modal ─────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: Readonly<{ title: string; onClose: () => void; children: React.ReactNode }>) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 480, maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A2E' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6B6B8A' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function FormField({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6B6B8A', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E8E8F0',
  fontSize: 13, color: '#1A1A2E', outline: 'none', boxSizing: 'border-box',
}

// ── Overview Tab ──────────────────────────────────────────────────
function OverviewTab({ deployments, prs }: Readonly<{ deployments: Deployment[]; prs: PullRequest[] }>) {
  const successCount = deployments.filter(d => d.status === 'success').length
  const successRate = deployments.length > 0 ? Math.round((successCount / deployments.length) * 100) : 0
  const openPRs = prs.filter(p => p.state === 'open').length
  const mergedPRs = prs.filter(p => p.state === 'merged').length

  const services = Array.from(new Set(deployments.map(d => d.serviceName)))
  const serviceStats = services.map(svc => {
    const svcDeploys = deployments.filter(d => d.serviceName === svc)
    const latest = svcDeploys[0]
    const svcSuccess = svcDeploys.filter(d => d.status === 'success').length
    const rate = svcDeploys.length > 0 ? Math.round((svcSuccess / svcDeploys.length) * 100) : 0
    return { svc, latest, count: svcDeploys.length, rate }
  })

  const successRateColor = successRate >= 80 ? '#22C55E' : '#EF4444'

  return (
    <div>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Deployments This Week', value: String(deployments.length), sub: `${successRate}% success rate`, subColor: successRateColor },
          { label: 'Open Pull Requests', value: String(openPRs), sub: `${mergedPRs} merged this week`, subColor: '#6C47FF' },
          { label: 'Services', value: String(services.length), sub: '1 currently deploying', subColor: '#3B82F6' },
          { label: 'Incidents', value: '1', sub: 'api-service · active', subColor: '#EF4444' },
        ].map(({ label, value, sub, subColor }) => (
          <div key={label} style={{ background: '#F7F7FB', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: '#6B6B8A', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#1A1A2E', letterSpacing: '-0.03em', lineHeight: 1.1 }}>{value}</div>
            <div style={{ fontSize: 11, marginTop: 4, color: subColor }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        {/* Recent deployments */}
        <div style={{ background: '#fff', border: '1px solid #E8E8F0', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #E8E8F0', fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>
            Recent Deployments
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FAFAFE' }}>
                {['Service', 'Env', 'Version', 'Status', 'Triggered by', 'When'].map(h => (
                  <th key={h} style={{ padding: '8px 16px', fontSize: 11, fontWeight: 600, color: '#A0A0B8', textAlign: 'left', borderBottom: '1px solid #E8E8F0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deployments.slice(0, 5).map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid #F0F0F8' }}>
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 500, color: '#1A1A2E' }}>{d.serviceName}</td>
                  <td style={{ padding: '10px 16px' }}><EnvBadge env={d.environment} /></td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#6B6B8A', fontFamily: 'monospace' }}>{d.version ?? '—'}</td>
                  <td style={{ padding: '10px 16px' }}><DeployBadge status={d.status} /></td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#6B6B8A' }}>{d.triggeredBy ?? '—'}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#A0A0B8' }}>{timeAgo(d.startedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Service health */}
        <div style={{ background: '#fff', border: '1px solid #E8E8F0', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #E8E8F0', fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>
            Service Health
          </div>
          <div style={{ padding: '6px 0' }}>
            {serviceStats.map(({ svc, latest, count, rate }) => (
              <div key={svc} style={{ padding: '10px 18px', borderBottom: '1px solid #F0F0F8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A2E', marginBottom: 2 }}>{svc}</div>
                  <div style={{ fontSize: 11, color: '#A0A0B8' }}>{count} deploys · last {latest ? timeAgo(latest.startedAt) : '—'}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                  {latest && <DeployBadge status={latest.status} />}
                  <div style={{ height: 3, width: 72, background: '#F0F0F8', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${rate}%`, background: rateColor(rate), borderRadius: 4 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Deployments Tab ───────────────────────────────────────────────
function DeploymentsTab({ deployments, onDeploy }: Readonly<{ deployments: Deployment[]; onDeploy: (d: Partial<Deployment>) => void }>) {
  const [filter, setFilter] = useState<string>('all')
  const [envFilter, setEnvFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ serviceName: '', version: '', environment: 'production', branch: 'main', commitMessage: '' })

  const filtered = deployments.filter(d => {
    const statusOk = filter === 'all' || d.status === filter
    const envOk = envFilter === 'all' || d.environment === envFilter
    return statusOk && envOk
  })

  function handleDeploy() {
    if (!form.serviceName) return
    onDeploy({ ...form, status: 'in_progress', triggeredBy: 'Preet R.', startedAt: new Date().toISOString() })
    setShowModal(false)
    setForm({ serviceName: '', version: '', environment: 'production', branch: 'main', commitMessage: '' })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'success', 'in_progress', 'failed', 'rolled_back'].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: filter === s ? 600 : 400, background: filter === s ? '#6C47FF' : '#F0F0F8', color: filter === s ? '#fff' : '#6B6B8A', border: 'none', cursor: 'pointer' }}>
              {statusFilterLabel(s)}
            </button>
          ))}
          <select value={envFilter} onChange={e => setEnvFilter(e.target.value)} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, background: '#F0F0F8', color: '#6B6B8A', border: 'none', cursor: 'pointer' }}>
            <option value="all">All Envs</option>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="dev">Dev</option>
          </select>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: '7px 14px', background: '#6C47FF', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          + Deploy
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E8E8F0', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#FAFAFE' }}>
              {['Service', 'Env', 'Version', 'Commit', 'Status', 'Triggered', 'Duration', 'When'].map(h => (
                <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#A0A0B8', textAlign: 'left', borderBottom: '1px solid #E8E8F0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#A0A0B8', fontSize: 13 }}>No deployments found</td></tr>
            )}
            {filtered.map(d => (
              <tr key={d.id} style={{ borderBottom: '1px solid #F0F0F8' }}>
                <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 500, color: '#1A1A2E' }}>{d.serviceName}</td>
                <td style={{ padding: '11px 16px' }}><EnvBadge env={d.environment} /></td>
                <td style={{ padding: '11px 16px', fontSize: 12, fontFamily: 'monospace', color: '#6B6B8A' }}>{d.version ?? '—'}</td>
                <td style={{ padding: '11px 16px' }}>
                  <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#6C47FF' }}>{shortSha(d.commitSha)}</div>
                  <div style={{ fontSize: 11, color: '#A0A0B8', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.commitMessage ?? ''}</div>
                </td>
                <td style={{ padding: '11px 16px' }}><DeployBadge status={d.status} /></td>
                <td style={{ padding: '11px 16px', fontSize: 12, color: '#6B6B8A' }}>{d.triggeredBy ?? '—'}</td>
                <td style={{ padding: '11px 16px', fontSize: 12, color: '#A0A0B8' }}>{durationLabel(d.startedAt, d.completedAt)}</td>
                <td style={{ padding: '11px 16px', fontSize: 12, color: '#A0A0B8' }}>{timeAgo(d.startedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="New Deployment" onClose={() => setShowModal(false)}>
          <FormField label="Service Name">
            <input style={inputStyle} value={form.serviceName} onChange={e => setForm(f => ({ ...f, serviceName: e.target.value }))} placeholder="e.g. api-service" />
          </FormField>
          <FormField label="Version">
            <input style={inputStyle} value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} placeholder="e.g. v2.4.2" />
          </FormField>
          <FormField label="Environment">
            <select style={inputStyle} value={form.environment} onChange={e => setForm(f => ({ ...f, environment: e.target.value }))}>
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="dev">Dev</option>
            </select>
          </FormField>
          <FormField label="Branch">
            <input style={inputStyle} value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} placeholder="main" />
          </FormField>
          <FormField label="Commit Message (optional)">
            <input style={inputStyle} value={form.commitMessage} onChange={e => setForm(f => ({ ...f, commitMessage: e.target.value }))} placeholder="What's in this deploy?" />
          </FormField>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #E8E8F0', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#6B6B8A' }}>Cancel</button>
            <button onClick={handleDeploy} disabled={!form.serviceName} style={{ padding: '8px 16px', borderRadius: 8, background: '#6C47FF', color: '#fff', border: 'none', fontSize: 13, fontWeight: 500, cursor: form.serviceName ? 'pointer' : 'not-allowed', opacity: form.serviceName ? 1 : 0.6 }}>
              Deploy
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Pull Requests Tab ─────────────────────────────────────────────
function PullRequestsTab({ prs }: Readonly<{ prs: PullRequest[] }>) {
  const [filter, setFilter] = useState<string>('open')
  const [search, setSearch] = useState('')

  const filtered = prs.filter(p => {
    const stateOk = filter === 'all' || p.state === filter
    const searchOk = search.length === 0 || p.title?.toLowerCase().includes(search.toLowerCase()) || p.repoName.toLowerCase().includes(search.toLowerCase())
    return stateOk && searchOk
  })

  const openCount = prs.filter(p => p.state === 'open').length
  const mergedCount = prs.filter(p => p.state === 'merged').length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[{ v: 'open', label: `Open (${openCount})` }, { v: 'merged', label: `Merged (${mergedCount})` }, { v: 'all', label: 'All' }].map(({ v, label }) => (
            <button key={v} onClick={() => setFilter(v)} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: filter === v ? 600 : 400, background: filter === v ? '#6C47FF' : '#F0F0F8', color: filter === v ? '#fff' : '#6B6B8A', border: 'none', cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
        <input
          placeholder="Search pull requests…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E8E8F0', fontSize: 13, color: '#1A1A2E', outline: 'none', width: 220 }}
        />
      </div>

      <div style={{ background: '#fff', border: '1px solid #E8E8F0', borderRadius: 12, overflow: 'hidden' }}>
        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: '#A0A0B8', fontSize: 13 }}>No pull requests found</div>
        )}
        {filtered.map((pr, i) => (
          <div key={pr.id} style={{ padding: '12px 18px', borderBottom: i < filtered.length - 1 ? '1px solid #F0F0F8' : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: prIconBg(pr.state), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 12 }}>{prIconSymbol(pr.state)}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1A2E' }}>{pr.title ?? `PR #${pr.prNumber}`}</span>
                <PRBadge state={pr.state} />
              </div>
              <div style={{ fontSize: 11, color: '#A0A0B8' }}>
                <span style={{ color: '#6C47FF', fontFamily: 'monospace' }}>{pr.repoName}</span>
                {' · '}
                <span style={{ fontFamily: 'monospace' }}>{pr.headBranch ?? '—'}</span>
                {' → '}
                <span style={{ fontFamily: 'monospace' }}>{pr.baseBranch ?? 'main'}</span>
                {' · '}
                {pr.author ?? 'unknown'}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6B6B8A' }}>#{pr.prNumber}</div>
              <div style={{ fontSize: 11, color: '#A0A0B8', marginTop: 2 }}>{prTimeLabel(pr)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Repositories Tab ──────────────────────────────────────────────
function RepositoriesTab({ repos }: Readonly<{ repos: Repository[] }>) {
  const [showConnect, setShowConnect] = useState(false)
  const [form, setForm] = useState({ repoName: '', githubUrl: '', defaultBranch: 'main' })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button onClick={() => setShowConnect(true)} style={{ padding: '7px 14px', background: '#6C47FF', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          + Connect Repository
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {repos.map(repo => (
          <div key={repo.id} style={{ background: '#fff', border: '1px solid #E8E8F0', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 2 }}>{repo.repoName}</div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#A0A0B8' }}>Branch: {repo.defaultBranch}</div>
              </div>
              {repo.lastDeployStatus && <DeployBadge status={repo.lastDeployStatus} />}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: '1px solid #F0F0F8' }}>
              <div style={{ fontSize: 11, color: '#A0A0B8' }}>
                {repo.lastDeployAt ? `Last deploy ${timeAgo(repo.lastDeployAt)}` : 'Never deployed'}
              </div>
              {repo.githubUrl ? (
                <span style={{ fontSize: 11, color: '#6C47FF', fontWeight: 500 }}>GitHub ↗</span>
              ) : (
                <span style={{ fontSize: 11, color: '#A0A0B8' }}>No GitHub URL</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {showConnect && (
        <Modal title="Connect Repository" onClose={() => setShowConnect(false)}>
          <FormField label="Repository Name">
            <input style={inputStyle} value={form.repoName} onChange={e => setForm(f => ({ ...f, repoName: e.target.value }))} placeholder="e.g. vyne/new-service" />
          </FormField>
          <FormField label="GitHub URL (optional)">
            <input style={inputStyle} value={form.githubUrl} onChange={e => setForm(f => ({ ...f, githubUrl: e.target.value }))} placeholder="https://github.com/..." />
          </FormField>
          <FormField label="Default Branch">
            <input style={inputStyle} value={form.defaultBranch} onChange={e => setForm(f => ({ ...f, defaultBranch: e.target.value }))} placeholder="main" />
          </FormField>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={() => setShowConnect(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #E8E8F0', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#6B6B8A' }}>Cancel</button>
            <button
              onClick={() => {
                if (form.repoName) {
                  try { codeApi.connectRepository({ repoName: form.repoName, githubUrl: form.githubUrl || undefined, defaultBranch: form.defaultBranch }) } catch { /* demo mode */ }
                  setShowConnect(false)
                  setForm({ repoName: '', githubUrl: '', defaultBranch: 'main' })
                }
              }}
              disabled={!form.repoName}
              style={{ padding: '8px 16px', borderRadius: 8, background: '#6C47FF', color: '#fff', border: 'none', fontSize: 13, fontWeight: 500, cursor: form.repoName ? 'pointer' : 'not-allowed', opacity: form.repoName ? 1 : 0.6 }}
            >
              Connect
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Main Code Page ────────────────────────────────────────────────
export default function CodePage() {
  const [tab, setTab] = useState<'overview' | 'deployments' | 'prs' | 'repos'>('overview')
  const [deployments, setDeployments] = useState<Deployment[]>(MOCK_DEPLOYMENTS)
  const [prs] = useState<PullRequest[]>(MOCK_PRS)
  const [repos] = useState<Repository[]>(MOCK_REPOS)

  useEffect(() => {
    codeApi.listDeployments({ limit: 50 })
      .then(res => { if (res.data?.length) setDeployments(res.data) })
      .catch(() => { /* use mock data */ })
  }, [])

  function handleDeploy(data: Partial<Deployment>) {
    const newDeploy: Deployment = {
      id: `d-${Date.now()}`,
      orgId: 'demo',
      serviceName: data.serviceName ?? '',
      version: data.version ?? null,
      environment: data.environment ?? 'production',
      status: 'in_progress',
      triggeredBy: data.triggeredBy ?? 'Preet R.',
      commitSha: null,
      commitMessage: data.commitMessage ?? null,
      branch: data.branch ?? 'main',
      startedAt: new Date().toISOString(),
      completedAt: null,
      metadata: {},
    }
    setDeployments(prev => [newDeploy, ...prev])
    try {
      codeApi.createDeployment({
        serviceName: newDeploy.serviceName,
        version: newDeploy.version ?? undefined,
        environment: newDeploy.environment,
        branch: newDeploy.branch ?? undefined,
        commitMessage: newDeploy.commitMessage ?? undefined,
        triggeredBy: newDeploy.triggeredBy ?? undefined,
      })
    } catch { /* demo mode */ }
  }

  const openPRs = prs.filter(p => p.state === 'open').length

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #E8E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E', margin: 0, letterSpacing: '-0.02em' }}>Code & DevOps</h1>
          <p style={{ fontSize: 12, color: '#A0A0B8', margin: '2px 0 0' }}>Deployments, pull requests, and repository management</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', color: '#B91C1C' }}>
            1 incident active
          </span>
          <span style={{ fontSize: 11, color: '#A0A0B8' }}>
            {openPRs} open PRs · {deployments.filter(d => d.status === 'in_progress').length} deploying
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '10px 24px', borderBottom: '1px solid #E8E8F0', display: 'flex', gap: 4, flexShrink: 0 }}>
        <TabBtn label="Overview" active={tab === 'overview'} onClick={() => setTab('overview')} />
        <TabBtn label="Deployments" active={tab === 'deployments'} onClick={() => setTab('deployments')} count={deployments.length} />
        <TabBtn label="Pull Requests" active={tab === 'prs'} onClick={() => setTab('prs')} count={openPRs} />
        <TabBtn label="Repositories" active={tab === 'repos'} onClick={() => setTab('repos')} count={repos.length} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {tab === 'overview' && <OverviewTab deployments={deployments} prs={prs} />}
        {tab === 'deployments' && <DeploymentsTab deployments={deployments} onDeploy={handleDeploy} />}
        {tab === 'prs' && <PullRequestsTab prs={prs} />}
        {tab === 'repos' && <RepositoriesTab repos={repos} />}
      </div>
    </div>
  )
}
