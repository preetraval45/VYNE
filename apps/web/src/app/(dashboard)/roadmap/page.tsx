'use client'

import { useState } from 'react'

type Status = 'live' | 'building' | 'planned' | 'gap'
type Category = 'all' | 'chat' | 'erp' | 'mrp' | 'hr' | 'ai' | 'devops' | 'platform'

interface Feature {
  id: string
  title: string
  description: string
  category: Category
  status: Status
  gap?: string        // what competitor is missing
  competitor?: string // which competitor this beats
  priority: 'critical' | 'high' | 'medium' | 'low'
}

const FEATURES: Feature[] = [
  // ── LIVE ──────────────────────────────────────────────────────────
  { id: 'f1', title: 'Real-time Messaging + Channels', description: 'Slack-like channels, DMs, threads, reactions, typing indicators, presence', category: 'chat', status: 'live', priority: 'critical' },
  { id: 'f2', title: 'Inventory Management', description: 'Products, SKUs, stock levels, adjustments, low-stock alerts, categories', category: 'erp', status: 'live', priority: 'critical' },
  { id: 'f3', title: 'Order Management', description: 'Sales orders, purchase orders, status workflows (draft→confirmed→shipped→delivered)', category: 'erp', status: 'live', priority: 'critical' },
  { id: 'f4', title: 'Manufacturing / BOM', description: 'Bills of Materials, work orders, production tracking', category: 'mrp', status: 'live', priority: 'critical' },
  { id: 'f5', title: 'Finance / Accounting', description: 'P&L statement, journal entries, chart of accounts, revenue/expense tracking', category: 'erp', status: 'live', priority: 'critical' },
  { id: 'f6', title: 'Projects + Issues (Jira replacement)', description: 'Kanban board, sprints, issue tracking, assignees, priorities', category: 'platform', status: 'live', priority: 'critical' },
  { id: 'f7', title: 'Docs (Notion replacement)', description: 'Block editor, nested pages, tree navigation, real-time save', category: 'platform', status: 'live', priority: 'critical' },
  { id: 'f8', title: 'Code + DevOps', description: 'Deployment tracking, PR management, repository connections, CI/CD visibility', category: 'devops', status: 'live', priority: 'high' },
  { id: 'f9', title: 'Observability + Monitoring', description: 'Service health, metrics, incidents, AI-correlated alerts', category: 'devops', status: 'live', priority: 'high' },
  { id: 'f10', title: 'Settings + Multi-tenant Admin', description: 'Org config, member management, role permissions, ERP config, custom fields, tax rates', category: 'platform', status: 'live', priority: 'high' },
  { id: 'f11', title: 'Light + Dark Mode', description: 'Full theme switching persisted per user, works across all modules', category: 'platform', status: 'live', priority: 'medium' },
  { id: 'f12', title: 'Mobile App (iOS + Android)', description: 'React Native app — Home, Chat, Projects, Profile, demo mode', category: 'platform', status: 'live', priority: 'high' },

  // ── BUILDING ───────────────────────────────────────────────────────
  { id: 'f13', title: 'AI Demand Forecasting', description: 'Predict stock needs based on sales patterns, seasonality, lead times', category: 'ai', status: 'building', gap: 'Odoo requires expensive ML add-ons', competitor: 'Odoo', priority: 'critical' },
  { id: 'f14', title: 'LangGraph Multi-step Agents', description: 'AI agents that autonomously investigate incidents, reorder stock, summarize meetings', category: 'ai', status: 'building', gap: 'No existing tool correlates ERP + DevOps + Chat in one AI agent', competitor: 'All', priority: 'critical' },
  { id: 'f15', title: 'Supplier Portal', description: 'External supplier login to confirm POs, update delivery status, upload invoices', category: 'erp', status: 'building', gap: 'Odoo portal is complex and ugly', competitor: 'Odoo', priority: 'high' },
  { id: 'f16', title: 'Customer Portal', description: 'Customers track orders, invoices, support tickets — branded to your company', category: 'erp', status: 'building', gap: 'Odoo portal lacks real-time updates', competitor: 'Odoo', priority: 'high' },

  // ── PLANNED — Chat Gaps (vs Slack) ────────────────────────────────
  { id: 'f17', title: 'Huddles / Voice Calls', description: 'One-click voice + video calls within channels and DMs', category: 'chat', status: 'planned', gap: 'Slack charges extra for Huddles; Teams is bloated', competitor: 'Slack', priority: 'critical' },
  { id: 'f18', title: 'AI Message Summaries', description: 'Auto-summarize long threads, catch up on missed channels, TL;DR on demand', category: 'chat', status: 'planned', gap: 'Slack AI costs $10/user/mo extra', competitor: 'Slack', priority: 'critical' },
  { id: 'f19', title: 'Smart Notifications (AI Priority Filter)', description: 'AI ranks your notifications so you only see what matters — no more noise', category: 'chat', status: 'planned', gap: 'Slack has no intelligent filtering', competitor: 'Slack', priority: 'high' },
  { id: 'f20', title: 'Message Scheduling', description: 'Schedule messages to send at a specific time or timezone', category: 'chat', status: 'planned', gap: 'Slack free tier removed this', competitor: 'Slack', priority: 'medium' },
  { id: 'f21', title: 'ERP-Connected Alerts in Chat', description: 'Low stock, overdue invoices, delayed orders post automatically to relevant channels', category: 'chat', status: 'planned', gap: 'Slack requires expensive Zapier/Make integrations', competitor: 'Slack', priority: 'critical' },
  { id: 'f22', title: 'Workflow Automation from Chat', description: 'Type /approve-order ORD-123 in chat → ERP updates automatically', category: 'chat', status: 'planned', gap: 'No tool connects chat commands to ERP actions natively', competitor: 'All', priority: 'critical' },
  { id: 'f23', title: 'External Guest Access (Slack Connect equiv.)', description: 'Invite external companies to shared channels — suppliers, clients, agencies', category: 'chat', status: 'planned', gap: 'Slack Connect is expensive per connection', competitor: 'Slack', priority: 'high' },
  { id: 'f24', title: 'Screen Recording Clips', description: 'Record short video clips to share async — like Loom but built-in', category: 'chat', status: 'planned', gap: 'Slack has no native screen recording', competitor: 'Slack', priority: 'medium' },

  // ── PLANNED — ERP Gaps (vs Odoo) ──────────────────────────────────
  { id: 'f25', title: 'CRM Pipeline', description: 'Sales pipeline, lead scoring, opportunity tracking, deal forecasting', category: 'erp', status: 'planned', gap: 'Odoo CRM is feature-rich but slow and unintuitive', competitor: 'Odoo/HubSpot', priority: 'critical' },
  { id: 'f26', title: 'HR Module', description: 'Employee directory, org chart, leave management, onboarding workflows', category: 'hr', status: 'planned', gap: 'Odoo HR is complex; standalone HR tools are expensive', competitor: 'Odoo/BambooHR', priority: 'high' },
  { id: 'f27', title: 'Payroll', description: 'Automated payroll calculation, tax deductions, payslips, compliance', category: 'hr', status: 'planned', gap: 'No mid-market tool integrates payroll + ERP seamlessly', competitor: 'Odoo/Rippling', priority: 'high' },
  { id: 'f28', title: 'Expense Reports', description: 'Employee expense submissions, manager approval, auto-sync to accounting', category: 'erp', status: 'planned', gap: 'Odoo expenses are clunky; Expensify is a separate tool', competitor: 'Odoo/Expensify', priority: 'high' },
  { id: 'f29', title: 'Asset Management', description: 'Track company assets, depreciation schedules, maintenance reminders', category: 'erp', status: 'planned', gap: 'Odoo requires a separate module and complex setup', competitor: 'Odoo', priority: 'medium' },
  { id: 'f30', title: 'Quality Control Module', description: 'Inspection checklists on incoming/outgoing goods, pass/fail tracking, supplier scorecards', category: 'mrp', status: 'planned', gap: 'Most ERPs bolt-on QC as an afterthought', competitor: 'Odoo/SAP', priority: 'high' },
  { id: 'f31', title: 'Subscription Billing', description: 'Recurring invoices, subscription plans, dunning management, revenue recognition', category: 'erp', status: 'planned', gap: 'Odoo subscription module is poorly designed', competitor: 'Odoo/Chargebee', priority: 'high' },
  { id: 'f32', title: 'Budget Management', description: 'Department budgets, spend tracking, variance analysis, approval workflows', category: 'erp', status: 'planned', gap: 'Odoo budgets are static; no real-time burn tracking', competitor: 'Odoo', priority: 'medium' },
  { id: 'f33', title: 'E-Invoicing + Tax Compliance', description: 'Auto-generate e-invoices, GST/VAT filing, country-specific compliance', category: 'erp', status: 'planned', gap: 'Odoo tax config is complex; small businesses struggle with it', competitor: 'Odoo/QuickBooks', priority: 'high' },
  { id: 'f34', title: 'Multi-Warehouse Management', description: 'Track inventory across multiple locations, inter-warehouse transfers', category: 'mrp', status: 'planned', gap: 'Odoo requires expensive Enterprise license for multi-warehouse', competitor: 'Odoo', priority: 'high' },
  { id: 'f35', title: 'Point of Sale (POS)', description: 'Retail POS that syncs inventory and accounting in real-time', category: 'erp', status: 'planned', gap: 'Odoo POS has frequent sync issues', competitor: 'Odoo/Square', priority: 'medium' },
  { id: 'f36', title: 'Fleet / Vehicle Management', description: 'Company vehicles, maintenance schedules, fuel tracking, driver assignments', category: 'erp', status: 'planned', gap: 'Rarely included in mid-market ERPs', competitor: 'Odoo', priority: 'low' },

  // ── PLANNED — AI / Platform Differentiators ────────────────────────
  { id: 'f37', title: 'AI Business Intelligence Dashboard', description: 'Natural language queries: "Which customers are at churn risk?" "What caused Q3 revenue drop?"', category: 'ai', status: 'planned', gap: 'Odoo analytics require BI tools; Slack has no business analytics', competitor: 'All', priority: 'critical' },
  { id: 'f38', title: 'Cross-Module AI Correlation Engine', description: '"Deployment failure → 47 orders stuck → $12,400 risk" — only Vyne does this', category: 'ai', status: 'planned', gap: 'No tool today connects DevOps + ERP + Chat in one AI brain', competitor: 'All', priority: 'critical' },
  { id: 'f39', title: 'AI Meeting Notes + Action Items', description: 'Join calls, transcribe, summarize, create tasks + orders automatically', category: 'ai', status: 'planned', gap: 'Otter.ai/Fireflies are separate tools with no ERP integration', competitor: 'Otter/Notion', priority: 'high' },
  { id: 'f40', title: 'White-Label / Custom Branding', description: 'Each customer sees their logo, colors, and domain — full white-label SaaS', category: 'platform', status: 'planned', gap: 'Odoo whitelabel requires Enterprise license ($$$)', competitor: 'Odoo', priority: 'critical' },
  { id: 'f41', title: 'Marketplace / App Store', description: 'Third-party integrations: Stripe, Shopify, Amazon, WooCommerce, QuickBooks sync', category: 'platform', status: 'planned', gap: 'Odoo app store is outdated; Slack app quality is inconsistent', competitor: 'Odoo/Slack', priority: 'high' },
  { id: 'f42', title: 'Granular RBAC + Field-Level Permissions', description: 'Control who sees what fields, records, modules — per role, per team, per client', category: 'platform', status: 'planned', gap: 'Odoo permissions are confusing; Slack has no record-level security', competitor: 'All', priority: 'high' },
]

const STATUS_CONFIG: Record<Status, { label: string; bg: string; color: string; dot: string }> = {
  live:     { label: 'Live',     bg: '#F0FDF4', color: '#166534', dot: '#22C55E' },
  building: { label: 'Building', bg: '#EFF6FF', color: '#1E40AF', dot: '#3B82F6' },
  planned:  { label: 'Planned',  bg: '#F5F3FF', color: '#5B21B6', dot: '#8B5CF6' },
  gap:      { label: 'Gap',      bg: '#FEF2F2', color: '#991B1B', dot: '#EF4444' },
}

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#EF4444',
  high: '#F59E0B',
  medium: '#3B82F6',
  low: '#A0A0B8',
}

const CATEGORY_LABELS: Record<Category, string> = {
  all: 'All Features',
  chat: 'Chat / Messaging',
  erp: 'ERP / Finance',
  mrp: 'Manufacturing / MRP',
  hr: 'HR / Payroll',
  ai: 'AI Features',
  devops: 'DevOps / Code',
  platform: 'Platform',
}

function StatusBadge({ status }: Readonly<{ status: Status }>) {
  const s = STATUS_CONFIG[status]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: s.bg, color: s.color }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
      {s.label}
    </span>
  )
}

export default function RoadmapPage() {
  const [cat, setCat] = useState<Category>('all')
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all')
  const [search, setSearch] = useState('')

  const filtered = FEATURES.filter(f => {
    const catOk = cat === 'all' || f.category === cat
    const statusOk = statusFilter === 'all' || f.status === statusFilter
    const searchOk = search.length === 0 ||
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      f.description.toLowerCase().includes(search.toLowerCase()) ||
      (f.gap ?? '').toLowerCase().includes(search.toLowerCase())
    return catOk && statusOk && searchOk
  })

  const counts = {
    live: FEATURES.filter(f => f.status === 'live').length,
    building: FEATURES.filter(f => f.status === 'building').length,
    planned: FEATURES.filter(f => f.status === 'planned').length,
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--content-bg, #fff)' }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid var(--content-border, #E8E8F0)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #1A1A2E)', margin: 0, letterSpacing: '-0.03em' }}>VYNE Roadmap</h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary, #6B6B8A)', margin: '4px 0 0' }}>
              Every feature that makes VYNE better than Slack + Odoo + Notion + Jira combined
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {([['live', 'Live'], ['building', 'Building'], ['planned', 'Planned']] as const).map(([s, l]) => (
              <div key={s} style={{ textAlign: 'center', padding: '8px 16px', borderRadius: 10, background: STATUS_CONFIG[s].bg }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: STATUS_CONFIG[s].color }}>{counts[s]}</div>
                <div style={{ fontSize: 11, color: STATUS_CONFIG[s].color, fontWeight: 500 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="Search features…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--content-border, #E8E8F0)', fontSize: 13, outline: 'none', width: 200, background: 'var(--content-secondary, #F7F7FB)', color: 'var(--text-primary, #1A1A2E)' }}
          />
          {(['all', 'live', 'building', 'planned'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: statusFilter === s ? 600 : 400, background: statusFilter === s ? '#6C47FF' : 'var(--content-secondary, #F0F0F8)', color: statusFilter === s ? '#fff' : 'var(--text-secondary, #6B6B8A)', border: 'none', cursor: 'pointer' }}>
              {s === 'all' ? 'All Status' : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {/* Category sidebar */}
        <div style={{ width: 190, borderRight: '1px solid var(--content-border, #E8E8F0)', padding: '12px 8px', overflowY: 'auto', flexShrink: 0 }}>
          {(Object.keys(CATEGORY_LABELS) as Category[]).map(c => {
            const count = c === 'all' ? FEATURES.length : FEATURES.filter(f => f.category === c).length
            return (
              <button key={c} onClick={() => setCat(c)} style={{
                width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 8, fontSize: 12,
                fontWeight: cat === c ? 600 : 400,
                background: cat === c ? 'rgba(108,71,255,0.1)' : 'transparent',
                color: cat === c ? '#6C47FF' : 'var(--text-secondary, #6B6B8A)',
                border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1,
              }}>
                <span>{CATEGORY_LABELS[c]}</span>
                <span style={{ fontSize: 10, fontWeight: 500, color: cat === c ? '#6C47FF' : 'var(--text-tertiary, #A0A0B8)' }}>{count}</span>
              </button>
            )
          })}
        </div>

        {/* Feature list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-tertiary, #A0A0B8)', fontSize: 14 }}>No features match your filters</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(f => (
              <div key={f.id} style={{
                background: 'var(--content-bg, #fff)',
                border: '1px solid var(--content-border, #E8E8F0)',
                borderRadius: 12, padding: '14px 18px',
                display: 'flex', alignItems: 'flex-start', gap: 14,
              }}>
                {/* Priority dot */}
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLOR[f.priority], flexShrink: 0, marginTop: 5 }} title={`${f.priority} priority`} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1A1A2E)' }}>{f.title}</span>
                    <StatusBadge status={f.status} />
                    <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 4, background: 'rgba(108,71,255,0.08)', color: '#6C47FF' }}>
                      {CATEGORY_LABELS[f.category]}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary, #6B6B8A)', margin: 0, marginBottom: f.gap ? 6 : 0, lineHeight: 1.5 }}>{f.description}</p>
                  {f.gap && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '6px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.06)', borderLeft: '3px solid #EF4444' }}>
                      <span style={{ fontSize: 11, color: '#991B1B', fontWeight: 500 }}>Gap vs {f.competitor}:</span>
                      <span style={{ fontSize: 11, color: '#991B1B' }}>{f.gap}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
