'use client'

import { useState } from 'react'
import { Settings, Users, Package, DollarSign, Sliders, Shield, Bell, Plus, X, Check, Trash2 } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────
interface OrgMember { id: string; name: string; email: string; role: 'admin' | 'member' | 'viewer'; status: 'active' | 'invited'; joinedAt?: string }
interface CustomField { id: string; entity: string; label: string; type: 'text' | 'number' | 'select' | 'date' | 'boolean'; required: boolean }
interface TaxRate { id: string; name: string; rate: number; isDefault: boolean }

// ─── Mock data ────────────────────────────────────────────────────
const MOCK_MEMBERS: OrgMember[] = [
  { id: 'u1', name: 'Preet Raval', email: 'preet@vyne.ai', role: 'admin', status: 'active', joinedAt: '2024-01-01' },
  { id: 'u2', name: 'Sarah K.', email: 'sarah@vyne.ai', role: 'member', status: 'active', joinedAt: '2024-03-15' },
  { id: 'u3', name: 'Tony M.', email: 'tony@vyne.ai', role: 'member', status: 'active', joinedAt: '2024-04-01' },
  { id: 'u4', name: 'Alex R.', email: 'alex@vyne.ai', role: 'viewer', status: 'active', joinedAt: '2024-06-10' },
  { id: 'u5', name: 'Jordan B.', email: 'jordan@company.com', role: 'member', status: 'invited' },
]

const MOCK_CUSTOM_FIELDS: CustomField[] = [
  { id: 'cf1', entity: 'Product', label: 'Warranty Period', type: 'text', required: false },
  { id: 'cf2', entity: 'Order', label: 'PO Reference', type: 'text', required: false },
  { id: 'cf3', entity: 'Customer', label: 'Industry', type: 'select', required: false },
]

const MOCK_TAX_RATES: TaxRate[] = [
  { id: 't1', name: 'Standard VAT', rate: 20, isDefault: true },
  { id: 't2', name: 'Reduced VAT', rate: 5, isDefault: false },
  { id: 't3', name: 'Zero Rated', rate: 0, isDefault: false },
]

// ─── Shared UI ────────────────────────────────────────────────────
function SectionCard({ title, children, action }: Readonly<{ title: string; children: React.ReactNode; action?: React.ReactNode }>) {
  return (
    <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, marginBottom: 16, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>{title}</span>
        {action}
      </div>
      <div style={{ padding: '16px 18px' }}>{children}</div>
    </div>
  )
}

function FieldRow({ label, children, hint }: Readonly<{ label: string; children: React.ReactNode; hint?: string }>) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
      <div style={{ width: 200, flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1A2E' }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: '#A0A0B8', marginTop: 1 }}>{hint}</div>}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 10px', border: '1px solid #D8D8E8', borderRadius: 8, background: '#FAFAFE', outline: 'none', fontSize: 13, color: '#1A1A2E', boxSizing: 'border-box' }
const selectStyle: React.CSSProperties = { ...inputStyle }

function Toggle({ checked, onChange, label }: Readonly<{ checked: boolean; onChange: () => void; label?: string }>) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        onKeyDown={(e) => e.key === ' ' && onChange()}
        style={{ width: 36, height: 20, borderRadius: 10, background: checked ? '#6C47FF' : '#D8D8E8', position: 'relative', cursor: 'pointer', border: 'none', padding: 0, transition: 'background 0.2s', flexShrink: 0 }}
      >
        <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: checked ? 18 : 2, transition: 'left 0.2s' }} />
      </button>
      {label && <span style={{ fontSize: 12, color: '#1A1A2E' }}>{label}</span>}
    </div>
  )
}

function RoleBadge({ role }: Readonly<{ role: string }>) {
  const map: Record<string, { bg: string; color: string }> = {
    admin: { bg: 'rgba(108,71,255,0.1)', color: '#6C47FF' },
    member: { bg: '#EFF6FF', color: '#1E40AF' },
    viewer: { bg: '#F0F0F8', color: '#6B6B8A' },
  }
  const s = map[role] ?? map.viewer
  return <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: s.bg, color: s.color, textTransform: 'capitalize' }}>{role}</span>
}

// ─── General Settings tab ─────────────────────────────────────────
function GeneralTab() {
  const [org, setOrg] = useState({ name: 'Vyne HQ', website: 'https://vyne.ai', timezone: 'America/New_York', currency: 'USD', fiscalYearStart: '1' })
  const [saved, setSaved] = useState(false)

  function save() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <SectionCard title="Organisation">
        <FieldRow label="Company Name" hint="Displayed across the platform">
          <input id="org-name" value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} style={inputStyle} />
        </FieldRow>
        <FieldRow label="Website">
          <input id="org-website" value={org.website} onChange={(e) => setOrg({ ...org, website: e.target.value })} style={inputStyle} />
        </FieldRow>
        <FieldRow label="Timezone">
          <select id="org-tz" value={org.timezone} onChange={(e) => setOrg({ ...org, timezone: e.target.value })} style={selectStyle}>
            {['America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Kolkata', 'Asia/Tokyo'].map((tz) => (
              <option key={tz}>{tz}</option>
            ))}
          </select>
        </FieldRow>
      </SectionCard>

      <SectionCard title="Finance Defaults">
        <FieldRow label="Currency" hint="Default currency for orders & invoices">
          <select id="org-currency" value={org.currency} onChange={(e) => setOrg({ ...org, currency: e.target.value })} style={{ ...selectStyle, maxWidth: 200 }}>
            {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </FieldRow>
        <FieldRow label="Fiscal Year Start" hint="Month the financial year begins">
          <select id="org-fy" value={org.fiscalYearStart} onChange={(e) => setOrg({ ...org, fiscalYearStart: e.target.value })} style={{ ...selectStyle, maxWidth: 200 }}>
            {['January','February','March','April','July','October'].map((m, i) => (
              <option key={m} value={String([1,2,3,4,7,10][i])}>{m}</option>
            ))}
          </select>
        </FieldRow>
      </SectionCard>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={save} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, border: 'none', background: '#6C47FF', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
          {saved ? <><Check size={14} /> Saved!</> : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

// ─── Members tab ──────────────────────────────────────────────────
function MembersTab() {
  const [members, setMembers] = useState<OrgMember[]>(MOCK_MEMBERS)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'viewer'>('member')

  function invite() {
    const newMember: OrgMember = {
      id: `u${Date.now()}`, name: inviteEmail.split('@')[0], email: inviteEmail,
      role: inviteRole, status: 'invited',
    }
    setMembers([...members, newMember])
    setInviteOpen(false)
    setInviteEmail('')
  }

  function changeRole(id: string, role: OrgMember['role']) {
    setMembers(members.map((m) => m.id === id ? { ...m, role } : m))
  }

  function removeMember(id: string) {
    setMembers(members.filter((m) => m.id !== id))
  }

  return (
    <div>
      <SectionCard
        title={`Members (${members.length})`}
        action={
          <button onClick={() => setInviteOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: 'none', background: '#6C47FF', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
            <Plus size={12} /> Invite
          </button>
        }
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Member', 'Email', 'Role', 'Status', ''].map((h) => (
                <th key={h} style={{ padding: '6px 0', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                <td style={{ padding: '10px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: `hsl(${m.name.charCodeAt(0) * 12 % 360}, 60%, 55%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1A2E' }}>{m.name}</span>
                  </div>
                </td>
                <td style={{ padding: '10px 12px', fontSize: 12, color: '#6B6B8A' }}>{m.email}</td>
                <td style={{ padding: '10px 12px' }}>
                  {m.role === 'admin' ? <RoleBadge role="admin" /> : (
                    <select
                      value={m.role}
                      onChange={(e) => changeRole(m.id, e.target.value as OrgMember['role'])}
                      style={{ padding: '3px 8px', borderRadius: 7, border: '1px solid #D8D8E8', background: '#fff', fontSize: 12, color: '#1A1A2E', cursor: 'pointer', outline: 'none' }}
                    >
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  )}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: m.status === 'active' ? '#F0FDF4' : '#FFFBEB', color: m.status === 'active' ? '#166534' : '#92400E' }}>
                    {m.status === 'active' ? 'Active' : 'Invited'}
                  </span>
                </td>
                <td style={{ padding: '10px 0', textAlign: 'right' }}>
                  {m.role !== 'admin' && (
                    <button onClick={() => removeMember(m.id)} style={{ padding: '4px 6px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#A0A0B8', display: 'flex', alignItems: 'center' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#EF4444' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#A0A0B8' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {inviteOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 400, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E' }}>Invite Team Member</span>
              <button onClick={() => setInviteOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#A0A0B8', padding: 4, borderRadius: 6, display: 'flex' }}><X size={16} /></button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="invite-email" style={{ fontSize: 11, fontWeight: 600, color: '#6B6B8A', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email Address</label>
              <input id="invite-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@company.com" style={{ width: '100%', padding: '8px 10px', border: '1px solid #D8D8E8', borderRadius: 8, background: '#FAFAFE', outline: 'none', fontSize: 13, color: '#1A1A2E', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="invite-role" style={{ fontSize: 11, fontWeight: 600, color: '#6B6B8A', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Role</label>
              <select id="invite-role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'member' | 'viewer')} style={{ width: '100%', padding: '8px 10px', border: '1px solid #D8D8E8', borderRadius: 8, background: '#FAFAFE', outline: 'none', fontSize: 13, color: '#1A1A2E', boxSizing: 'border-box' }}>
                <option value="member">Member — Can view & edit</option>
                <option value="viewer">Viewer — Read only</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setInviteOpen(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D8D8E8', background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#6B6B8A' }}>Cancel</button>
              <button onClick={invite} disabled={!inviteEmail} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: inviteEmail ? '#6C47FF' : '#E8E8F0', color: inviteEmail ? '#fff' : '#A0A0B8', cursor: inviteEmail ? 'pointer' : 'default', fontSize: 13, fontWeight: 500 }}>Send Invite</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ERP Config tab ───────────────────────────────────────────────
function ERPConfigTab() {
  const [taxRates, setTaxRates] = useState<TaxRate[]>(MOCK_TAX_RATES)
  const [customFields, setCustomFields] = useState<CustomField[]>(MOCK_CUSTOM_FIELDS)
  const [newTaxName, setNewTaxName] = useState('')
  const [newTaxRate, setNewTaxRate] = useState('')
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldEntity, setNewFieldEntity] = useState('Product')
  const [newFieldType, setNewFieldType] = useState<CustomField['type']>('text')
  const [inventory, setInventory] = useState({ lowStockThreshold: '10', autoReorder: true, defaultUOM: 'pcs' })

  function addTaxRate() {
    if (!newTaxName || !newTaxRate) return
    const t: TaxRate = { id: `t${Date.now()}`, name: newTaxName, rate: Number.parseFloat(newTaxRate), isDefault: false }
    setTaxRates([...taxRates, t])
    setNewTaxName(''); setNewTaxRate('')
  }

  function addCustomField() {
    if (!newFieldLabel) return
    const f: CustomField = { id: `cf${Date.now()}`, entity: newFieldEntity, label: newFieldLabel, type: newFieldType, required: false }
    setCustomFields([...customFields, f])
    setNewFieldLabel('')
  }

  function setDefault(id: string) {
    setTaxRates(taxRates.map((t) => ({ ...t, isDefault: t.id === id })))
  }

  return (
    <div>
      {/* Inventory settings */}
      <SectionCard title="Inventory Settings">
        <FieldRow label="Low Stock Threshold" hint="Alert when stock falls below this qty">
          <input id="inv-threshold" type="number" value={inventory.lowStockThreshold} onChange={(e) => setInventory({ ...inventory, lowStockThreshold: e.target.value })} style={{ ...inputStyle, maxWidth: 120 }} />
        </FieldRow>
        <FieldRow label="Auto Reorder" hint="Automatically create POs when stock is low">
          <Toggle checked={inventory.autoReorder} onChange={() => setInventory({ ...inventory, autoReorder: !inventory.autoReorder })} label={inventory.autoReorder ? 'Enabled' : 'Disabled'} />
        </FieldRow>
        <FieldRow label="Default UOM">
          <select id="inv-uom" value={inventory.defaultUOM} onChange={(e) => setInventory({ ...inventory, defaultUOM: e.target.value })} style={{ ...selectStyle, maxWidth: 180 }}>
            {['pcs', 'kg', 'litre', 'box', 'dozen', 'metre'].map((u) => <option key={u}>{u}</option>)}
          </select>
        </FieldRow>
      </SectionCard>

      {/* Tax Rates */}
      <SectionCard title="Tax Rates">
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
          <thead>
            <tr>
              {['Name', 'Rate', 'Default', ''].map((h) => (
                <th key={h} style={{ padding: '5px 0', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {taxRates.map((t) => (
              <tr key={t.id} style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                <td style={{ padding: '9px 0', fontSize: 13, color: '#1A1A2E' }}>{t.name}</td>
                <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 500, color: '#1A1A2E' }}>{t.rate}%</td>
                <td style={{ padding: '9px 12px' }}>
                  {t.isDefault
                    ? <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(108,71,255,0.1)', color: '#6C47FF', fontWeight: 500 }}>Default</span>
                    : <button onClick={() => setDefault(t.id)} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, border: '1px solid #D8D8E8', background: 'transparent', cursor: 'pointer', color: '#6B6B8A' }}>Set default</button>
                  }
                </td>
                <td style={{ padding: '9px 0', textAlign: 'right' }}>
                  <button onClick={() => setTaxRates(taxRates.filter((r) => r.id !== t.id))} style={{ padding: '3px 6px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#A0A0B8', display: 'flex', alignItems: 'center' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#EF4444' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#A0A0B8' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input id="tax-name" value={newTaxName} onChange={(e) => setNewTaxName(e.target.value)} placeholder="Tax name" style={{ ...inputStyle, flex: 1 }} />
          <input id="tax-rate" type="number" value={newTaxRate} onChange={(e) => setNewTaxRate(e.target.value)} placeholder="%" style={{ ...inputStyle, width: 70, flex: 'none' }} />
          <button onClick={addTaxRate} style={{ padding: '7px 12px', borderRadius: 8, border: 'none', background: '#6C47FF', color: '#fff', cursor: 'pointer', fontSize: 12, flexShrink: 0, fontWeight: 500 }}>Add</button>
        </div>
      </SectionCard>

      {/* Custom Fields */}
      <SectionCard title="Custom Fields">
        <p style={{ fontSize: 12, color: '#6B6B8A', marginBottom: 12 }}>Add custom attributes to Products, Orders, Customers, or Suppliers.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {customFields.map((f) => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#F7F7FB', borderRadius: 8 }}>
              <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 6, background: '#E8E8F0', color: '#6B6B8A', flexShrink: 0 }}>{f.entity}</span>
              <span style={{ fontSize: 13, color: '#1A1A2E', flex: 1 }}>{f.label}</span>
              <span style={{ fontSize: 11, color: '#A0A0B8' }}>{f.type}</span>
              <button onClick={() => setCustomFields(customFields.filter((c) => c.id !== f.id))} style={{ padding: '3px 6px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#A0A0B8', display: 'flex', alignItems: 'center' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#EF4444' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#A0A0B8' }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select id="cf-entity" value={newFieldEntity} onChange={(e) => setNewFieldEntity(e.target.value)} style={{ ...selectStyle, width: 130, flex: 'none' }}>
            {['Product', 'Order', 'Customer', 'Supplier'].map((e) => <option key={e}>{e}</option>)}
          </select>
          <input id="cf-label" value={newFieldLabel} onChange={(e) => setNewFieldLabel(e.target.value)} placeholder="Field label" style={{ ...inputStyle, flex: 1 }} />
          <select id="cf-type" value={newFieldType} onChange={(e) => setNewFieldType(e.target.value as CustomField['type'])} style={{ ...selectStyle, width: 110, flex: 'none' }}>
            {['text', 'number', 'select', 'date', 'boolean'].map((t) => <option key={t}>{t}</option>)}
          </select>
          <button onClick={addCustomField} style={{ padding: '7px 12px', borderRadius: 8, border: 'none', background: '#6C47FF', color: '#fff', cursor: 'pointer', fontSize: 12, flexShrink: 0, fontWeight: 500 }}>Add Field</button>
        </div>
      </SectionCard>
    </div>
  )
}

// ─── Notifications tab ────────────────────────────────────────────
function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    incidentAlerts: true, deploymentAlerts: true, lowStockAlerts: true,
    orderUpdates: true, weeklyDigest: false, mentionNotifications: true,
    emailNotifications: true, pushNotifications: false,
  })

  type PrefKey = keyof typeof prefs

  const groups: Array<{ title: string; items: Array<{ key: PrefKey; label: string; hint: string }> }> = [
    {
      title: 'Alerts & Incidents',
      items: [
        { key: 'incidentAlerts', label: 'Incident alerts', hint: 'Get notified when Vyne AI detects an incident' },
        { key: 'deploymentAlerts', label: 'Deployment notifications', hint: 'Success/failure alerts for deployments' },
        { key: 'lowStockAlerts', label: 'Low stock alerts', hint: 'Alert when product stock falls below threshold' },
      ],
    },
    {
      title: 'Business',
      items: [
        { key: 'orderUpdates', label: 'Order status updates', hint: 'Notifications when orders change status' },
        { key: 'weeklyDigest', label: 'Weekly digest email', hint: 'Summary of activity every Monday' },
      ],
    },
    {
      title: 'Collaboration',
      items: [
        { key: 'mentionNotifications', label: '@Mention notifications', hint: 'When someone mentions you in chat or comments' },
      ],
    },
    {
      title: 'Delivery Channels',
      items: [
        { key: 'emailNotifications', label: 'Email notifications', hint: 'Send notifications via email' },
        { key: 'pushNotifications', label: 'Push notifications', hint: 'Browser or mobile push notifications' },
      ],
    },
  ]

  return (
    <div>
      {groups.map(({ title, items }) => (
        <SectionCard key={title} title={title}>
          {items.map(({ key, label, hint }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A2E' }}>{label}</div>
                <div style={{ fontSize: 11, color: '#A0A0B8', marginTop: 1 }}>{hint}</div>
              </div>
              <Toggle checked={prefs[key]} onChange={() => setPrefs({ ...prefs, [key]: !prefs[key] })} />
            </div>
          ))}
        </SectionCard>
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────
const TABS = [
  { id: 'general', label: 'General', icon: <Settings size={14} /> },
  { id: 'members', label: 'Members', icon: <Users size={14} /> },
  { id: 'erp', label: 'ERP Config', icon: <Package size={14} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={14} /> },
] as const

type TabId = typeof TABS[number]['id']

export default function SettingsPage() {
  const [tab, setTab] = useState<TabId>('general')

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
      {/* Side nav */}
      <aside style={{ width: 200, minWidth: 200, borderRight: '1px solid rgba(0,0,0,0.08)', background: '#FAFAFE', padding: '16px 10px', flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#A0A0B8', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '0 8px', marginBottom: 8 }}>Settings</div>
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
              background: tab === id ? 'rgba(108,71,255,0.1)' : 'transparent',
              color: tab === id ? '#6C47FF' : '#6B6B8A',
              fontWeight: tab === id ? 500 : 400,
              marginBottom: 2, transition: 'all 0.12s',
            }}
            onMouseEnter={(e) => { if (tab !== id) (e.currentTarget as HTMLElement).style.background = '#F0F0F8' }}
            onMouseLeave={(e) => { if (tab !== id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            {icon} {label}
          </button>
        ))}

        <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '12px 0' }} />

        <div style={{ fontSize: 11, fontWeight: 600, color: '#A0A0B8', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '0 8px', marginBottom: 8 }}>More</div>
        {[
          { id: 'security', label: 'Security', icon: <Shield size={14} /> },
          { id: 'billing', label: 'Billing', icon: <DollarSign size={14} /> },
          { id: 'integrations', label: 'Integrations', icon: <Sliders size={14} /> },
        ].map(({ id, label, icon }) => (
          <button
            key={id}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, background: 'transparent', color: '#6B6B8A', marginBottom: 2 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F0F0F8' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            {icon} {label}
          </button>
        ))}
      </aside>

      {/* Content */}
      <div className="content-scroll" style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {tab === 'general' && <GeneralTab />}
        {tab === 'members' && <MembersTab />}
        {tab === 'erp' && <ERPConfigTab />}
        {tab === 'notifications' && <NotificationsTab />}
      </div>
    </div>
  )
}
