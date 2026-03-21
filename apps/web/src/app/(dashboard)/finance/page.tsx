'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, DollarSign, FileText, Plus, X, ChevronUp, ChevronDown } from 'lucide-react'
import { erpApi, type ERPJournalEntry } from '@/lib/api/client'

// ─── Mock data ────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const MOCK_MONTHLY: Array<{ month: string; revenue: number; expenses: number }> = [
  { month: 'Oct', revenue: 84200, expenses: 61400 },
  { month: 'Nov', revenue: 91500, expenses: 64200 },
  { month: 'Dec', revenue: 112000, expenses: 71000 },
  { month: 'Jan', revenue: 78400, expenses: 58900 },
  { month: 'Feb', revenue: 89600, expenses: 62100 },
  { month: 'Mar', revenue: 96800, expenses: 67300 },
]

const MOCK_JOURNAL: ERPJournalEntry[] = [
  { id: 'j1', entryNumber: 'JE-001', description: 'Sales revenue — March batch', postingDate: new Date(Date.now() - 86400000).toISOString(), status: 'posted', totalDebits: 96800 },
  { id: 'j2', entryNumber: 'JE-002', description: 'COGS — Product shipments', postingDate: new Date(Date.now() - 172800000).toISOString(), status: 'posted', totalDebits: 43200 },
  { id: 'j3', entryNumber: 'JE-003', description: 'Payroll — March', postingDate: new Date(Date.now() - 259200000).toISOString(), status: 'posted', totalDebits: 18400 },
  { id: 'j4', entryNumber: 'JE-004', description: 'AWS infrastructure invoice', postingDate: new Date(Date.now() - 345600000).toISOString(), status: 'posted', totalDebits: 5700 },
  { id: 'j5', entryNumber: 'JE-005', description: 'Marketing spend — Q1', postingDate: new Date(Date.now() - 432000000).toISOString(), status: 'draft', totalDebits: 12000 },
]

const MOCK_ACCOUNTS = [
  { code: '1001', name: 'Cash & Bank', type: 'Asset', balance: 284600 },
  { code: '1100', name: 'Accounts Receivable', type: 'Asset', balance: 47200 },
  { code: '1500', name: 'Inventory', type: 'Asset', balance: 156800 },
  { code: '2001', name: 'Accounts Payable', type: 'Liability', balance: 28400 },
  { code: '2100', name: 'Accrued Expenses', type: 'Liability', balance: 14200 },
  { code: '3001', name: 'Owner Equity', type: 'Equity', balance: 312000 },
  { code: '4001', name: 'Revenue', type: 'Revenue', balance: 96800 },
  { code: '5001', name: 'COGS', type: 'Expense', balance: 43200 },
  { code: '5100', name: 'Operating Expenses', type: 'Expense', balance: 24100 },
]

// ─── Helpers ──────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

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

// ─── Bar chart (CSS-only) ─────────────────────────────────────────
function BarChart({ data }: Readonly<{ data: Array<{ month: string; revenue: number; expenses: number }> }>) {
  const maxVal = Math.max(...data.flatMap((d) => [d.revenue, d.expenses]))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140, padding: '0 4px' }}>
      {data.map((d) => (
        <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 120, width: '100%' }}>
            <div style={{ flex: 1, background: '#6C47FF', borderRadius: '3px 3px 0 0', height: `${(d.revenue / maxVal) * 100}%`, opacity: 0.85 }} title={`Revenue: ${fmt(d.revenue)}`} />
            <div style={{ flex: 1, background: '#EF4444', borderRadius: '3px 3px 0 0', height: `${(d.expenses / maxVal) * 100}%`, opacity: 0.7 }} title={`Expenses: ${fmt(d.expenses)}`} />
          </div>
          <span style={{ fontSize: 10, color: '#A0A0B8' }}>{d.month}</span>
        </div>
      ))}
    </div>
  )
}

// ─── P&L tab ──────────────────────────────────────────────────────
function PLTab() {
  const current = MOCK_MONTHLY[MOCK_MONTHLY.length - 1]
  const prev = MOCK_MONTHLY[MOCK_MONTHLY.length - 2]
  const profit = current.revenue - current.expenses
  const prevProfit = prev.revenue - prev.expenses
  const profitDelta = ((profit - prevProfit) / prevProfit) * 100
  const margin = (profit / current.revenue) * 100

  const rows = [
    { label: 'Revenue', value: current.revenue, bold: true, indent: 0 },
    { label: 'Cost of Goods Sold', value: -43200, indent: 1 },
    { label: 'Gross Profit', value: current.revenue - 43200, bold: true, indent: 0 },
    { label: 'Operating Expenses', value: -24100, indent: 1 },
    { label: 'EBITDA', value: current.revenue - 43200 - 24100, bold: true, indent: 0 },
    { label: 'Depreciation & Amortization', value: -0, indent: 1 },
    { label: 'Net Profit', value: profit, bold: true, indent: 0, highlight: true },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(0, 320px)', gap: 16 }}>
      {/* P&L Statement */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>Profit & Loss — March 2026</span>
          <button style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.12)', background: 'transparent', cursor: 'pointer', fontSize: 11, color: '#6B6B8A', display: 'flex', alignItems: 'center', gap: 5 }}>
            <FileText size={12} /> Export
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {rows.map(({ label, value, bold, indent, highlight }) => (
              <tr key={label} style={{ borderTop: '1px solid rgba(0,0,0,0.04)', background: highlight ? (value >= 0 ? '#F0FDF4' : '#FEF2F2') : 'transparent' }}>
                <td style={{ padding: '10px 18px', fontSize: 12, color: bold ? '#1A1A2E' : '#6B6B8A', fontWeight: bold ? 600 : 400, paddingLeft: 18 + indent * 20 }}>
                  {label}
                </td>
                <td style={{ padding: '10px 18px', fontSize: 12, fontWeight: bold ? 700 : 400, textAlign: 'right', color: value < 0 ? '#EF4444' : highlight ? '#166534' : '#1A1A2E' }}>
                  {value < 0 ? `-${fmt(Math.abs(value))}` : fmt(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* KPI sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { label: 'Net Profit', value: fmt(profit), delta: `${profitDelta >= 0 ? '+' : ''}${profitDelta.toFixed(1)}% vs last month`, up: profitDelta >= 0, icon: <DollarSign size={16} style={{ color: '#22C55E' }} />, bg: 'rgba(34,197,94,0.08)' },
          { label: 'Profit Margin', value: `${margin.toFixed(1)}%`, delta: 'of revenue', up: true, icon: <TrendingUp size={16} style={{ color: '#6C47FF' }} />, bg: 'rgba(108,71,255,0.08)' },
          { label: 'Total Expenses', value: fmt(current.expenses), delta: 'this month', up: false, icon: <TrendingDown size={16} style={{ color: '#EF4444' }} />, bg: 'rgba(239,68,68,0.08)' },
        ].map(({ label, value, delta, up, icon, bg }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>{icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', letterSpacing: '-0.03em' }}>{value}</div>
            <div style={{ fontSize: 11, color: '#6B6B8A', marginTop: 2 }}>{label}</div>
            <div style={{ fontSize: 10, color: up ? '#22C55E' : '#EF4444', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
              {up ? <ChevronUp size={10} /> : <ChevronDown size={10} />} {delta}
            </div>
          </div>
        ))}

        {/* Mini chart */}
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A2E', marginBottom: 12 }}>6-Month Trend</div>
          <BarChart data={MOCK_MONTHLY} />
          <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#6B6B8A' }}><div style={{ width: 10, height: 10, borderRadius: 2, background: '#6C47FF' }} /> Revenue</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#6B6B8A' }}><div style={{ width: 10, height: 10, borderRadius: 2, background: '#EF4444' }} /> Expenses</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Journal Entries tab ──────────────────────────────────────────
function JournalTab() {
  const [entries, setEntries] = useState<ERPJournalEntry[]>(MOCK_JOURNAL)
  const [newOpen, setNewOpen] = useState(false)
  const [form, setForm] = useState({ description: '', totalDebits: '' })

  useEffect(() => {
    erpApi.listJournalEntries().then((r) => setEntries(r.data)).catch(() => {})
  }, [])

  function createEntry() {
    const entry: ERPJournalEntry = {
      id: `j${Date.now()}`,
      entryNumber: `JE-${String(entries.length + 1).padStart(3, '0')}`,
      description: form.description,
      postingDate: new Date().toISOString(),
      status: 'draft',
      totalDebits: Number.parseFloat(form.totalDebits) || 0,
    }
    setEntries([entry, ...entries])
    setNewOpen(false)
    setForm({ description: '', totalDebits: '' })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button onClick={() => setNewOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#6C47FF', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
          <Plus size={13} /> New Entry
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F7F7FB' }}>
              {['Entry #', 'Description', 'Date', 'Amount (Dr)', 'Status'].map((h) => (
                <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}
                onMouseEnter={(ev) => { (ev.currentTarget as HTMLTableRowElement).style.background = '#FAFAFE' }}
                onMouseLeave={(ev) => { (ev.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
              >
                <td style={{ padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#6C47FF' }}>{e.entryNumber}</td>
                <td style={{ padding: '10px 16px', fontSize: 12, color: '#1A1A2E' }}>{e.description}</td>
                <td style={{ padding: '10px 16px', fontSize: 11, color: '#A0A0B8' }}>{new Date(e.postingDate).toLocaleDateString()}</td>
                <td style={{ padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#1A1A2E' }}>{fmt(e.totalDebits)}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: e.status === 'posted' ? '#F0FDF4' : '#FFFBEB', color: e.status === 'posted' ? '#166534' : '#92400E' }}>
                    {e.status === 'posted' ? 'Posted' : 'Draft'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {newOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 420, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E' }}>New Journal Entry</span>
              <button onClick={() => setNewOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#A0A0B8', padding: 4, borderRadius: 6, display: 'flex' }}><X size={16} /></button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="je-desc" style={{ fontSize: 11, fontWeight: 600, color: '#6B6B8A', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</label>
              <input id="je-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Sales revenue batch" style={{ width: '100%', padding: '8px 10px', border: '1px solid #D8D8E8', borderRadius: 8, background: '#FAFAFE', outline: 'none', fontSize: 13, color: '#1A1A2E', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="je-amount" style={{ fontSize: 11, fontWeight: 600, color: '#6B6B8A', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Debits ($)</label>
              <input id="je-amount" type="number" value={form.totalDebits} onChange={(e) => setForm({ ...form, totalDebits: e.target.value })} placeholder="10000" style={{ width: '100%', padding: '8px 10px', border: '1px solid #D8D8E8', borderRadius: 8, background: '#FAFAFE', outline: 'none', fontSize: 13, color: '#1A1A2E', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setNewOpen(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D8D8E8', background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#6B6B8A' }}>Cancel</button>
              <button onClick={createEntry} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#6C47FF', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Create Entry</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Chart of Accounts tab ────────────────────────────────────────
function AccountsTab() {
  const groups = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']
  const typeColor: Record<string, string> = { Asset: '#3B82F6', Liability: '#EF4444', Equity: '#8B5CF6', Revenue: '#22C55E', Expense: '#F59E0B' }

  return (
    <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, overflow: 'hidden' }}>
      {groups.map((group) => {
        const accts = MOCK_ACCOUNTS.filter((a) => a.type === group)
        const total = accts.reduce((s, a) => s + a.balance, 0)
        return (
          <div key={group}>
            <div style={{ padding: '10px 16px', background: '#F7F7FB', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: typeColor[group], flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{group}</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: '#1A1A2E' }}>{fmt(total)}</span>
            </div>
            {accts.map((a) => (
              <div key={a.code} style={{ display: 'flex', alignItems: 'center', padding: '9px 16px 9px 32px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#A0A0B8', width: 48, flexShrink: 0 }}>{a.code}</span>
                <span style={{ fontSize: 12, color: '#1A1A2E', flex: 1 }}>{a.name}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1A2E' }}>{fmt(a.balance)}</span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────
export default function FinancePage() {
  const [tab, setTab] = useState<'pl' | 'journal' | 'accounts'>('pl')

  const now = new Date()
  const currentMonth = MOCK_MONTHLY[MOCK_MONTHLY.length - 1]
  const profit = currentMonth.revenue - currentMonth.expenses

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px 0', borderBottom: '1px solid rgba(0,0,0,0.08)', background: '#fff', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E', margin: 0 }}>Finance</h1>
            <p style={{ fontSize: 12, color: '#A0A0B8', margin: '2px 0 0' }}>
              {MONTHS[now.getMonth()]} {now.getFullYear()} · Profit: {fmt(profit)}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: 'rgba(34,197,94,0.1)', color: '#166534' }}>
              Revenue {fmt(currentMonth.revenue)}
            </span>
            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', color: '#991B1B' }}>
              Expenses {fmt(currentMonth.expenses)}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <TabBtn label="P&L Statement" active={tab === 'pl'} onClick={() => setTab('pl')} />
          <TabBtn label="Journal Entries" active={tab === 'journal'} onClick={() => setTab('journal')} />
          <TabBtn label="Chart of Accounts" active={tab === 'accounts'} onClick={() => setTab('accounts')} />
        </div>
      </div>

      <div className="content-scroll" style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {tab === 'pl' && <PLTab />}
        {tab === 'journal' && <JournalTab />}
        {tab === 'accounts' && <AccountsTab />}
      </div>
    </div>
  )
}
