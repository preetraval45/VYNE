'use client'

import { useState } from 'react'
import { Plus, X, Search, Edit2, Check, XCircle } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────
type Stage = 'Lead' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost'
type Source = 'website' | 'referral' | 'outbound' | 'inbound'

interface Deal {
  id: string
  company: string
  contactName: string
  email: string
  stage: Stage
  value: number
  probability: number
  assignee: string
  lastActivity: string   // ISO date string
  nextAction: string
  source: Source
  notes: string
}

// ─── Mock Data ────────────────────────────────────────────────────
const NOW = Date.now()
const daysAgo = (d: number) => new Date(NOW - d * 86400000).toISOString()

const INITIAL_DEALS: Deal[] = [
  {
    id: 'd1', company: 'Acme Corp', contactName: 'Sarah Johnson', email: 'sarah@acme.com',
    stage: 'Lead', value: 45000, probability: 15, assignee: 'Alex',
    lastActivity: daysAgo(2), nextAction: 'Send intro email', source: 'website',
    notes: 'Found us via blog post. Interested in enterprise plan.',
  },
  {
    id: 'd2', company: 'TechStart Inc', contactName: 'Marcus Chen', email: 'marcus@techstart.io',
    stage: 'Qualified', value: 120000, probability: 35, assignee: 'Priya',
    lastActivity: daysAgo(5), nextAction: 'Discovery call scheduled', source: 'referral',
    notes: 'Referred by CloudOps team. Strong budget signal.',
  },
  {
    id: 'd3', company: 'Global Retail', contactName: 'Emma Davis', email: 'emma@globalretail.com',
    stage: 'Proposal', value: 28000, probability: 55, assignee: 'Alex',
    lastActivity: daysAgo(1), nextAction: 'Follow up on proposal doc', source: 'inbound',
    notes: 'Sent proposal v2 last week. Awaiting procurement review.',
  },
  {
    id: 'd4', company: 'DataFlow Ltd', contactName: 'James Wilson', email: 'james@dataflow.co',
    stage: 'Negotiation', value: 89000, probability: 75, assignee: 'Sam',
    lastActivity: daysAgo(10), nextAction: 'Counter-proposal on pricing', source: 'outbound',
    notes: 'Pushing back on contract length. Flexible on price.',
  },
  {
    id: 'd5', company: 'ManuCo', contactName: 'Olivia Park', email: 'olivia@manuco.com',
    stage: 'Won', value: 156000, probability: 100, assignee: 'Priya',
    lastActivity: daysAgo(3), nextAction: 'Kick off onboarding', source: 'referral',
    notes: 'Signed 2-year contract. Champion is VP of Ops.',
  },
  {
    id: 'd6', company: 'RetailPlus', contactName: 'Dan Nguyen', email: 'dan@retailplus.com',
    stage: 'Lost', value: 34000, probability: 0, assignee: 'Alex',
    lastActivity: daysAgo(14), nextAction: 'Re-engage in Q3', source: 'outbound',
    notes: 'Went with competitor. Price was the main objection.',
  },
  {
    id: 'd7', company: 'FinServe', contactName: 'Clara Osei', email: 'clara@finserve.com',
    stage: 'Proposal', value: 67000, probability: 60, assignee: 'Sam',
    lastActivity: daysAgo(4), nextAction: 'Legal review of MSA', source: 'inbound',
    notes: 'Compliance team involved. Slow moving but committed.',
  },
  {
    id: 'd8', company: 'CloudOps', contactName: 'Ryan Torres', email: 'ryan@cloudops.dev',
    stage: 'Negotiation', value: 200000, probability: 80, assignee: 'Priya',
    lastActivity: daysAgo(8), nextAction: 'Final pricing call', source: 'referral',
    notes: 'Largest deal in pipeline. Executive sponsor confirmed.',
  },
]

const STAGES: Stage[] = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost']
const ASSIGNEES = ['Alex', 'Priya', 'Sam']
const SOURCES: Source[] = ['website', 'referral', 'outbound', 'inbound']

// ─── Helper Functions (no nested ternaries) ───────────────────────
function stageColor(stage: Stage): string {
  const map: Record<Stage, string> = {
    Lead:        '#6B6B8A',
    Qualified:   '#3B82F6',
    Proposal:    '#F59E0B',
    Negotiation: '#8B5CF6',
    Won:         '#22C55E',
    Lost:        '#EF4444',
  }
  return map[stage]
}

function stageBg(stage: Stage): string {
  const map: Record<Stage, string> = {
    Lead:        '#F4F4F8',
    Qualified:   '#EFF6FF',
    Proposal:    '#FFFBEB',
    Negotiation: '#F5F3FF',
    Won:         '#F0FDF4',
    Lost:        '#FEF2F2',
  }
  return map[stage]
}

function priorityFromDays(days: number): 'urgent' | 'normal' | 'cold' {
  if (days > 14) return 'cold'
  if (days > 7) return 'urgent'
  return 'normal'
}

function priorityColor(priority: 'urgent' | 'normal' | 'cold'): string {
  if (priority === 'urgent') return '#F97316'
  if (priority === 'cold') return '#A0A0B8'
  return '#1A1A2E'
}

function probabilityColor(prob: number): string {
  if (prob >= 75) return '#22C55E'
  if (prob >= 40) return '#F59E0B'
  if (prob === 0) return '#EF4444'
  return '#3B82F6'
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}

function daysSince(isoDate: string): number {
  return Math.floor((NOW - new Date(isoDate).getTime()) / 86400000)
}

function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

// ─── Shared UI ────────────────────────────────────────────────────
function TabBtn({ label, active, onClick }: Readonly<{ label: string; active: boolean; onClick: () => void }>) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
        background: 'transparent', color: active ? '#6C47FF' : '#6B6B8A',
        borderBottom: active ? '2px solid #6C47FF' : '2px solid transparent',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}

function StagePill({ stage }: Readonly<{ stage: Stage }>) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: stageBg(stage), color: stageColor(stage), whiteSpace: 'nowrap',
    }}>
      {stage}
    </span>
  )
}

// ─── Deal Detail Modal ────────────────────────────────────────────
const MOCK_ACTIVITIES = [
  { time: daysAgo(1), text: 'Discovery call completed — strong interest in analytics features' },
  { time: daysAgo(4), text: 'Proposal document sent via email' },
  { time: daysAgo(9), text: 'Initial outreach — left voicemail' },
  { time: daysAgo(12), text: 'Lead created from website form submission' },
]

function DealModal({ deal, onClose, onUpdate }: Readonly<{
  deal: Deal
  onClose: () => void
  onUpdate: (updated: Deal) => void
}>) {
  const [stage, setStage] = useState<Stage>(deal.stage)
  const [nextAction, setNextAction] = useState(deal.nextAction)
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function handleConvert() {
    showToast('Order created in Ops module')
  }

  function handleWon() {
    onUpdate({ ...deal, stage: 'Won', probability: 100 })
    onClose()
  }

  function handleLost() {
    onUpdate({ ...deal, stage: 'Lost', probability: 0 })
    onClose()
  }

  function handleSave() {
    onUpdate({ ...deal, stage, nextAction })
    onClose()
  }

  const days = daysSince(deal.lastActivity)
  const priority = priorityFromDays(days)
  const actColor = priorityColor(priority)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
      <div style={{ background: '#fff', borderRadius: 14, width: 580, maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}>
        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>{deal.company}</div>
            <div style={{ fontSize: 12, color: '#6B6B8A' }}>{deal.contactName} · {deal.email}</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#A0A0B8', padding: 4, borderRadius: 6, display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          {/* Value + Probability */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            <div style={{ flex: 1, background: '#FAFAFE', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(0,0,0,0.07)' }}>
              <div style={{ fontSize: 11, color: '#A0A0B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Deal Value</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', letterSpacing: '-0.03em' }}>{fmt(deal.value)}</div>
            </div>
            <div style={{ flex: 1, background: '#FAFAFE', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(0,0,0,0.07)' }}>
              <div style={{ fontSize: 11, color: '#A0A0B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Probability</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: probabilityColor(deal.probability), letterSpacing: '-0.03em' }}>{deal.probability}%</div>
              <div style={{ marginTop: 8, height: 6, borderRadius: 3, background: '#E8E8F0', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${deal.probability}%`, background: probabilityColor(deal.probability), borderRadius: 3, transition: 'width 0.4s' }} />
              </div>
            </div>
            <div style={{ flex: 1, background: '#FAFAFE', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(0,0,0,0.07)' }}>
              <div style={{ fontSize: 11, color: '#A0A0B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Last Activity</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: actColor }}>{days}d ago</div>
              <div style={{ fontSize: 11, color: '#A0A0B8', marginTop: 2 }}>Source: {deal.source}</div>
            </div>
          </div>

          {/* Stage selector */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Stage</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {STAGES.map((s) => {
                const isActive = stage === s
                return (
                  <button
                    key={s}
                    onClick={() => setStage(s)}
                    style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: isActive ? `2px solid ${stageColor(s)}` : '2px solid transparent',
                      background: isActive ? stageBg(s) : '#F4F4F8',
                      color: isActive ? stageColor(s) : '#6B6B8A',
                      transition: 'all 0.15s',
                    }}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Next Action */}
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="modal-next-action" style={{ fontSize: 11, fontWeight: 600, color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Next Action</label>
            <input
              id="modal-next-action"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #D8D8E8', borderRadius: 8, background: '#FAFAFE', outline: 'none', fontSize: 13, color: '#1A1A2E', boxSizing: 'border-box' }}
            />
          </div>

          {/* Notes */}
          {deal.notes && (
            <div style={{ marginBottom: 20, padding: '12px 14px', background: '#FFFBEB', borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#92400E', marginBottom: 4 }}>Notes</div>
              <div style={{ fontSize: 12, color: '#78350F' }}>{deal.notes}</div>
            </div>
          )}

          {/* Activity Timeline */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Activity Timeline</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {MOCK_ACTIVITIES.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6C47FF', flexShrink: 0, marginTop: 4 }} />
                    {i < MOCK_ACTIVITIES.length - 1 && (
                      <div style={{ width: 1, flex: 1, background: '#E8E8F0', marginTop: 4 }} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#1A1A2E', marginBottom: 2 }}>{a.text}</div>
                    <div style={{ fontSize: 10, color: '#A0A0B8' }}>{new Date(a.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid rgba(0,0,0,0.07)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={handleConvert} style={{ flex: 1, padding: '8px 14px', borderRadius: 8, border: '1px solid #6C47FF', background: 'transparent', color: '#6C47FF', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            Convert to Order
          </button>
          <button onClick={handleWon} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#22C55E', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Check size={13} /> Mark Won
          </button>
          <button onClick={handleLost} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#EF4444', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
            <XCircle size={13} /> Mark Lost
          </button>
          <button onClick={handleSave} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#6C47FF', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            Save
          </button>
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: '#1A1A2E', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500, zIndex: 400, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  )
}

// ─── Add Deal Modal ───────────────────────────────────────────────
interface AddDealForm {
  company: string
  contactName: string
  email: string
  value: string
  stage: Stage
  source: Source
  assignee: string
  notes: string
}

const EMPTY_FORM: AddDealForm = {
  company: '', contactName: '', email: '', value: '', stage: 'Lead', source: 'website', assignee: 'Alex', notes: '',
}

function AddDealModal({ defaultStage, onClose, onAdd }: Readonly<{
  defaultStage: Stage
  onClose: () => void
  onAdd: (deal: Deal) => void
}>) {
  const [form, setForm] = useState<AddDealForm>({ ...EMPTY_FORM, stage: defaultStage })

  function handleAdd() {
    if (!form.company || !form.contactName) return
    const deal: Deal = {
      id: `d${Date.now()}`,
      company: form.company,
      contactName: form.contactName,
      email: form.email,
      stage: form.stage,
      value: Number.parseInt(form.value, 10) || 0,
      probability: 15,
      assignee: form.assignee,
      lastActivity: new Date().toISOString(),
      nextAction: '',
      source: form.source,
      notes: form.notes,
    }
    onAdd(deal)
    onClose()
  }

  function field(label: string, id: string, node: React.ReactNode) {
    return (
      <div style={{ marginBottom: 14 }}>
        <label htmlFor={id} style={{ fontSize: 11, fontWeight: 600, color: '#6B6B8A', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
        {node}
      </div>
    )
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', border: '1px solid #D8D8E8', borderRadius: 8,
    background: '#FAFAFE', outline: 'none', fontSize: 13, color: '#1A1A2E', boxSizing: 'border-box',
  }
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
      <div style={{ background: '#fff', borderRadius: 14, width: 480, maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E' }}>Add New Deal</span>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#A0A0B8', padding: 4, borderRadius: 6, display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              {field('Company Name', 'add-company',
                <input id="add-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Acme Corp" style={inputStyle} />
              )}
            </div>
            {field('Contact Name', 'add-contact',
              <input id="add-contact" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder="Jane Smith" style={inputStyle} />
            )}
            {field('Email', 'add-email',
              <input id="add-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@company.com" style={inputStyle} />
            )}
            {field('Deal Value ($)', 'add-value',
              <input id="add-value" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="50000" style={inputStyle} />
            )}
            {field('Stage', 'add-stage',
              <select id="add-stage" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as Stage })} style={selectStyle}>
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            {field('Source', 'add-source',
              <select id="add-source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as Source })} style={selectStyle}>
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            {field('Assignee', 'add-assignee',
              <select id="add-assignee" value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} style={selectStyle}>
                {ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            )}
            <div style={{ gridColumn: '1 / -1' }}>
              {field('Notes', 'add-notes',
                <textarea id="add-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Add context about this deal..." rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid rgba(0,0,0,0.07)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D8D8E8', background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#6B6B8A' }}>Cancel</button>
          <button onClick={handleAdd} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#6C47FF', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Add Deal</button>
        </div>
      </div>
    </div>
  )
}

// ─── Pipeline Tab (Kanban) ────────────────────────────────────────
function PipelineTab({ deals, onDealClick, onAddDeal }: Readonly<{
  deals: Deal[]
  onDealClick: (deal: Deal) => void
  onAddDeal: (stage: Stage) => void
}>) {
  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
      {STAGES.map((stage) => {
        const stageDeals = deals.filter((d) => d.stage === stage)
        const stageTotal = stageDeals.reduce((s, d) => s + d.value, 0)
        const color = stageColor(stage)

        return (
          <div key={stage} style={{ minWidth: 240, maxWidth: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Column header */}
            <div style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1A2E' }}>{stage}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#A0A0B8', background: '#F4F4F8', padding: '1px 7px', borderRadius: 20 }}>{stageDeals.length}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color }}>
                {fmt(stageTotal)}
              </div>
            </div>

            {/* Deal cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {stageDeals.map((deal) => {
                const days = daysSince(deal.lastActivity)
                const priority = priorityFromDays(days)
                const daysColor = priorityColor(priority)
                const showOrange = priority === 'urgent'

                return (
                  <button
                    key={deal.id}
                    onClick={() => onDealClick(deal)}
                    style={{
                      background: '#fff', borderRadius: 10, padding: '12px 13px',
                      border: showOrange ? '1px solid rgba(249,115,22,0.3)' : '1px solid rgba(0,0,0,0.08)',
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                      transition: 'box-shadow 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A2E', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {deal.company}
                    </div>
                    <div style={{ fontSize: 11, color: '#6B6B8A', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {deal.contactName}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>{fmt(deal.value)}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: probabilityColor(deal.probability) }}>{deal.probability}%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(108,71,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#6C47FF' }}>
                        {initials(deal.assignee)}
                      </div>
                      <span style={{ fontSize: 10, color: daysColor, fontWeight: priority !== 'normal' ? 600 : 400 }}>
                        {days}d ago
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Add deal button */}
            <button
              onClick={() => onAddDeal(stage)}
              style={{
                width: '100%', padding: '8px', borderRadius: 8, border: '1px dashed rgba(0,0,0,0.18)',
                background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#A0A0B8',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                transition: 'all 0.15s',
              }}
            >
              <Plus size={12} /> Add Deal
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── Deals Table Tab ──────────────────────────────────────────────
type SortKey = 'company' | 'value' | 'stage' | 'lastActivity'
type SortDir = 'asc' | 'desc'

function DealsTableTab({ deals, onDealClick, onMarkWon, onMarkLost }: Readonly<{
  deals: Deal[]
  onDealClick: (deal: Deal) => void
  onMarkWon: (id: string) => void
  onMarkLost: (id: string) => void
}>) {
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<Stage | 'All'>('All')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('All')
  const [sortKey, setSortKey] = useState<SortKey>('value')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const filtered = deals
    .filter((d) => {
      const matchSearch = d.company.toLowerCase().includes(search.toLowerCase()) ||
        d.contactName.toLowerCase().includes(search.toLowerCase())
      const matchStage = stageFilter === 'All' || d.stage === stageFilter
      const matchAssignee = assigneeFilter === 'All' || d.assignee === assigneeFilter
      return matchSearch && matchStage && matchAssignee
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortKey === 'company') cmp = a.company.localeCompare(b.company)
      else if (sortKey === 'value') cmp = a.value - b.value
      else if (sortKey === 'stage') cmp = STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage)
      else if (sortKey === 'lastActivity') cmp = new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime()
      return sortDir === 'asc' ? cmp : -cmp
    })

  const sortArrow = (key: SortKey) => sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  const thStyle: React.CSSProperties = {
    padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#6B6B8A',
    textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', whiteSpace: 'nowrap',
    userSelect: 'none',
  }

  return (
    <div>
      {/* Filters row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#A0A0B8' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deals..."
            style={{ width: '100%', padding: '7px 10px 7px 30px', border: '1px solid #D8D8E8', borderRadius: 8, background: '#fff', outline: 'none', fontSize: 12, color: '#1A1A2E', boxSizing: 'border-box' }}
          />
        </div>

        {/* Stage filter pills */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {(['All', ...STAGES] as Array<Stage | 'All'>).map((s) => {
            const isActive = stageFilter === s
            const pillColor = s === 'All' ? '#6C47FF' : stageColor(s)
            return (
              <button
                key={s}
                onClick={() => setStageFilter(s)}
                style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: isActive ? `1.5px solid ${pillColor}` : '1.5px solid transparent',
                  background: isActive ? (s === 'All' ? 'rgba(108,71,255,0.1)' : stageBg(s as Stage)) : '#F4F4F8',
                  color: isActive ? pillColor : '#6B6B8A',
                  transition: 'all 0.15s',
                }}
              >
                {s}
              </button>
            )
          })}
        </div>

        {/* Assignee filter */}
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #D8D8E8', borderRadius: 8, background: '#fff', outline: 'none', fontSize: 12, color: '#6B6B8A', cursor: 'pointer' }}
        >
          <option value="All">All Assignees</option>
          {ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F7F7FB' }}>
              <th style={thStyle} onClick={() => toggleSort('company')}>Company{sortArrow('company')}</th>
              <th style={{ ...thStyle, cursor: 'default' }}>Contact</th>
              <th style={thStyle} onClick={() => toggleSort('value')}>Value{sortArrow('value')}</th>
              <th style={thStyle} onClick={() => toggleSort('stage')}>Stage{sortArrow('stage')}</th>
              <th style={{ ...thStyle, cursor: 'default' }}>Source</th>
              <th style={{ ...thStyle, cursor: 'default' }}>Assignee</th>
              <th style={thStyle} onClick={() => toggleSort('lastActivity')}>Last Activity{sortArrow('lastActivity')}</th>
              <th style={{ ...thStyle, cursor: 'default' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((deal) => {
              const days = daysSince(deal.lastActivity)
              const priority = priorityFromDays(days)
              const daysColor = priorityColor(priority)

              return (
                <tr
                  key={deal.id}
                  style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}
                  onMouseEnter={(ev) => { (ev.currentTarget as HTMLTableRowElement).style.background = '#FAFAFE' }}
                  onMouseLeave={(ev) => { (ev.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                >
                  <td style={{ padding: '10px 14px' }}>
                    <button
                      onClick={() => onDealClick(deal)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#6C47FF', padding: 0, textAlign: 'left' }}
                    >
                      {deal.company}
                    </button>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B6B8A' }}>{deal.contactName}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#1A1A2E', whiteSpace: 'nowrap' }}>{fmt(deal.value)}</td>
                  <td style={{ padding: '10px 14px' }}><StagePill stage={deal.stage} /></td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: '#A0A0B8', textTransform: 'capitalize' }}>{deal.source}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(108,71,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#6C47FF' }}>
                        {initials(deal.assignee)}
                      </div>
                      <span style={{ fontSize: 12, color: '#1A1A2E' }}>{deal.assignee}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: daysColor, fontWeight: priority !== 'normal' ? 600 : 400, whiteSpace: 'nowrap' }}>
                    {days}d ago
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button
                        onClick={() => onDealClick(deal)}
                        title="Edit"
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.12)', background: 'transparent', cursor: 'pointer', color: '#6B6B8A', display: 'flex', alignItems: 'center' }}
                      >
                        <Edit2 size={11} />
                      </button>
                      <button
                        onClick={() => onMarkWon(deal.id)}
                        title="Mark Won"
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.06)', cursor: 'pointer', color: '#22C55E', display: 'flex', alignItems: 'center' }}
                      >
                        <Check size={11} />
                      </button>
                      <button
                        onClick={() => onMarkLost(deal.id)}
                        title="Mark Lost"
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center' }}
                      >
                        <XCircle size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', fontSize: 13, color: '#A0A0B8' }}>
            No deals match your filters.
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Forecasting Tab ──────────────────────────────────────────────
function ForecastingTab({ deals }: Readonly<{ deals: Deal[] }>) {
  const totalPipeline = deals.filter((d) => d.stage !== 'Lost').reduce((s, d) => s + d.value, 0)
  const expectedClose = deals
    .filter((d) => d.stage !== 'Lost' && d.stage !== 'Won')
    .reduce((s, d) => s + d.value * (d.probability / 100), 0)
  const wonDeals = deals.filter((d) => d.stage === 'Won')
  const closedDeals = deals.filter((d) => d.stage === 'Won' || d.stage === 'Lost')
  const winRate = closedDeals.length > 0 ? (wonDeals.length / closedDeals.length) * 100 : 0

  const stageData = STAGES.filter((s) => s !== 'Lost').map((stage) => {
    const stageDeals = deals.filter((d) => d.stage === stage)
    const total = stageDeals.reduce((s, d) => s + d.value, 0)
    return { stage, total, count: stageDeals.length }
  })

  const maxBarVal = Math.max(...stageData.map((s) => s.total), 1)

  const topDeals = [...deals]
    .filter((d) => d.stage !== 'Lost')
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {[
          { label: 'Pipeline Total', value: fmt(totalPipeline), sub: 'active deals excl. lost', color: '#6C47FF', bg: 'rgba(108,71,255,0.08)' },
          { label: 'Expected Close (This Month)', value: fmt(Math.round(expectedClose)), sub: 'probability-weighted', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
          { label: 'Win Rate (90 Days)', value: `${winRate.toFixed(0)}%`, sub: `${wonDeals.length} won of ${closedDeals.length} closed`, color: '#22C55E', bg: 'rgba(34,197,94,0.08)' },
        ].map(({ label, value, sub, color, bg }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid rgba(0,0,0,0.08)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: color }} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1A1A2E', letterSpacing: '-0.04em' }}>{value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A2E', marginTop: 4 }}>{label}</div>
            <div style={{ fontSize: 11, color: '#A0A0B8', marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Bar chart by stage */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', marginBottom: 16 }}>Pipeline by Stage</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {stageData.map(({ stage, total, count }) => {
              const pct = maxBarVal > 0 ? (total / maxBarVal) * 100 : 0
              return (
                <div key={stage}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: stageColor(stage) }} />
                      <span style={{ fontSize: 12, color: '#1A1A2E', fontWeight: 500 }}>{stage}</span>
                      <span style={{ fontSize: 11, color: '#A0A0B8' }}>({count})</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1A2E' }}>{fmt(total)}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: '#F0F0F8', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: stageColor(stage), borderRadius: 4, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top deals */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', marginBottom: 16 }}>Top Deals by Value</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {topDeals.map((deal, i) => (
              <div key={deal.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(0,0,0,0.05)' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#A0A0B8', width: 18, textAlign: 'center' }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A2E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{deal.company}</div>
                  <div style={{ fontSize: 11, color: '#A0A0B8', marginTop: 1 }}>{deal.contactName}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>{fmt(deal.value)}</div>
                  <StagePill stage={deal.stage} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────
export default function CRMPage() {
  const [deals, setDeals] = useState<Deal[]>(INITIAL_DEALS)
  const [tab, setTab] = useState<'pipeline' | 'table' | 'forecasting'>('pipeline')
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [addStage, setAddStage] = useState<Stage | null>(null)
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function handleUpdateDeal(updated: Deal) {
    setDeals((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
    showToast(`Deal updated: ${updated.company}`)
  }

  function handleAddDeal(deal: Deal) {
    setDeals((prev) => [deal, ...prev])
    showToast(`Deal added: ${deal.company}`)
  }

  function handleMarkWon(id: string) {
    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, stage: 'Won', probability: 100 } : d)))
    const deal = deals.find((d) => d.id === id)
    showToast(`Marked Won: ${deal?.company ?? ''}`)
  }

  function handleMarkLost(id: string) {
    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, stage: 'Lost', probability: 0 } : d)))
    const deal = deals.find((d) => d.id === id)
    showToast(`Marked Lost: ${deal?.company ?? ''}`)
  }

  const totalPipeline = deals.filter((d) => d.stage !== 'Lost').reduce((s, d) => s + d.value, 0)
  const activeCount = deals.filter((d) => d.stage !== 'Won' && d.stage !== 'Lost').length

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px 0', borderBottom: '1px solid rgba(0,0,0,0.08)', background: '#fff', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E', margin: 0 }}>CRM Pipeline</h1>
            <p style={{ fontSize: 12, color: '#A0A0B8', margin: '2px 0 0' }}>
              {activeCount} active deals · {fmt(totalPipeline)} pipeline
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: 'rgba(34,197,94,0.1)', color: '#166534' }}>
              {deals.filter((d) => d.stage === 'Won').length} won
            </span>
            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', color: '#991B1B' }}>
              {deals.filter((d) => d.stage === 'Lost').length} lost
            </span>
            <button
              onClick={() => setAddStage('Lead')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#6C47FF', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              <Plus size={13} /> Add Deal
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <TabBtn label="Pipeline" active={tab === 'pipeline'} onClick={() => setTab('pipeline')} />
          <TabBtn label="Deals Table" active={tab === 'table'} onClick={() => setTab('table')} />
          <TabBtn label="Forecasting" active={tab === 'forecasting'} onClick={() => setTab('forecasting')} />
        </div>
      </div>

      {/* Content */}
      <div
        className="content-scroll"
        style={{ flex: 1, overflowY: tab === 'pipeline' ? 'hidden' : 'auto', overflowX: tab === 'pipeline' ? 'auto' : 'hidden', padding: 20 }}
      >
        {tab === 'pipeline' && (
          <PipelineTab
            deals={deals}
            onDealClick={setSelectedDeal}
            onAddDeal={setAddStage}
          />
        )}
        {tab === 'table' && (
          <DealsTableTab
            deals={deals}
            onDealClick={setSelectedDeal}
            onMarkWon={handleMarkWon}
            onMarkLost={handleMarkLost}
          />
        )}
        {tab === 'forecasting' && (
          <ForecastingTab deals={deals} />
        )}
      </div>

      {/* Deal Detail Modal */}
      {selectedDeal !== null && (
        <DealModal
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onUpdate={(updated) => {
            handleUpdateDeal(updated)
            setSelectedDeal(null)
          }}
        />
      )}

      {/* Add Deal Modal */}
      {addStage !== null && (
        <AddDealModal
          defaultStage={addStage}
          onClose={() => setAddStage(null)}
          onAdd={handleAddDeal}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: '#1A1A2E', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500, zIndex: 400, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
