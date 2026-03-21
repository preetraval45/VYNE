'use client'

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────
type Plan = 'Starter' | 'Growth' | 'Enterprise'
type TenantStatus = 'Active' | 'Trial' | 'Churned'
type AdminTab = 'tenants' | 'billing' | 'usage' | 'settings'
type PaymentStatus = 'Paid' | 'Due' | 'Overdue'

interface Tenant {
  id: string
  name: string
  plan: Plan
  members: number
  mrr: number
  status: TenantStatus
  trialDaysLeft?: number
  nextBilling: string
  paymentStatus: PaymentStatus
  adminEmail: string
  messagesThisMonth: number
  docsCreated: number
  deployments: number
  apiCalls: number
}

interface NewTenantForm {
  companyName: string
  adminEmail: string
  plan: Plan
  trialDays: string
}

interface TenantConfig {
  companyName: string
  primaryColor: string
  logoUrl: string
  modules: Record<string, boolean>
}

// ─── Mock data ────────────────────────────────────────────────────
const MOCK_TENANTS: Tenant[] = [
  {
    id: 't1', name: 'Acme Manufacturing', plan: 'Enterprise', members: 47, mrr: 2400,
    status: 'Active', nextBilling: 'Apr 1, 2026', paymentStatus: 'Paid',
    adminEmail: 'admin@acme.com',
    messagesThisMonth: 18400, docsCreated: 312, deployments: 28, apiCalls: 142000,
  },
  {
    id: 't2', name: 'TechStart Inc', plan: 'Growth', members: 12, mrr: 480,
    status: 'Active', nextBilling: 'Apr 5, 2026', paymentStatus: 'Paid',
    adminEmail: 'admin@techstart.io',
    messagesThisMonth: 4200, docsCreated: 87, deployments: 14, apiCalls: 31000,
  },
  {
    id: 't3', name: 'Global Retail Ltd', plan: 'Growth', members: 28, mrr: 840,
    status: 'Active', nextBilling: 'Apr 8, 2026', paymentStatus: 'Paid',
    adminEmail: 'admin@globalretail.com',
    messagesThisMonth: 9800, docsCreated: 155, deployments: 9, apiCalls: 67000,
  },
  {
    id: 't4', name: 'DataFlow Analytics', plan: 'Starter', members: 5, mrr: 99,
    status: 'Trial', trialDaysLeft: 18, nextBilling: 'Apr 8, 2026', paymentStatus: 'Due',
    adminEmail: 'admin@dataflow.ai',
    messagesThisMonth: 620, docsCreated: 14, deployments: 3, apiCalls: 4100,
  },
  {
    id: 't5', name: 'RetailPlus Corp', plan: 'Enterprise', members: 63, mrr: 3200,
    status: 'Active', nextBilling: 'Apr 12, 2026', paymentStatus: 'Paid',
    adminEmail: 'admin@retailplus.com',
    messagesThisMonth: 24100, docsCreated: 490, deployments: 41, apiCalls: 198000,
  },
]

const MODULES = ['Chat', 'Projects', 'Docs', 'ERP', 'Finance', 'Code', 'HR', 'CRM', 'AI']

const DEFAULT_TENANT_CONFIG: TenantConfig = {
  companyName: '',
  primaryColor: '#6C47FF',
  logoUrl: '',
  modules: Object.fromEntries(MODULES.map((m) => [m, true])),
}

// ─── Helpers ──────────────────────────────────────────────────────
function fmtMrr(n: number): string {
  return `$${n.toLocaleString()}/mo`
}

function fmtNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
  return String(n)
}

// ─── Plan badge ───────────────────────────────────────────────────
function PlanBadge({ plan }: Readonly<{ plan: Plan }>) {
  const styles: Record<Plan, { bg: string; color: string }> = {
    Starter: { bg: 'rgba(59,130,246,0.1)', color: '#1E40AF' },
    Growth: { bg: 'rgba(34,197,94,0.1)', color: '#166534' },
    Enterprise: { bg: 'rgba(108,71,255,0.12)', color: '#5B21B6' },
  }
  const s = styles[plan]
  return (
    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
      {plan}
    </span>
  )
}

// ─── Status badge ─────────────────────────────────────────────────
function StatusBadge({ tenant }: Readonly<{ tenant: Tenant }>) {
  if (tenant.status === 'Active') {
    return (
      <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: '#F0FDF4', color: '#166534' }}>
        Active
      </span>
    )
  }
  if (tenant.status === 'Trial') {
    return (
      <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: '#FFFBEB', color: '#92400E' }}>
        Trial · {tenant.trialDaysLeft}d left
      </span>
    )
  }
  return (
    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: '#FEF2F2', color: '#991B1B' }}>
      Churned
    </span>
  )
}

// ─── Tab button ───────────────────────────────────────────────────
function TabBtn({ label, active, onClick }: Readonly<{ label: string; active: boolean; onClick: () => void }>) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '9px 16px',
        border: 'none',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 500,
        background: 'transparent',
        color: active ? '#6C47FF' : '#9090B0',
        borderBottom: active ? '2px solid #6C47FF' : '2px solid transparent',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

// ─── Input helper ─────────────────────────────────────────────────
function Field({
  id, label, value, onChange, type = 'text', placeholder,
}: Readonly<{ id: string; label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }>) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        htmlFor={id}
        style={{ fontSize: 11, fontWeight: 600, color: '#9090B0', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '8px 10px',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.06)',
          outline: 'none',
          fontSize: 13,
          color: '#E8E8F8',
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

// ─── Tenant side panel ────────────────────────────────────────────
function TenantSidePanel({
  tenant,
  config,
  onConfigChange,
  onClose,
  onSave,
}: Readonly<{
  tenant: Tenant
  config: TenantConfig
  onConfigChange: (c: TenantConfig) => void
  onClose: () => void
  onSave: () => void
}>) {
  function toggleModule(mod: string) {
    onConfigChange({
      ...config,
      modules: { ...config.modules, [mod]: !config.modules[mod] },
    })
  }

  return (
    <div
      style={{
        width: 380,
        background: '#13131F',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflowY: 'auto',
      }}
    >
      {/* Panel header */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E8E8F8' }}>{tenant.name}</div>
          <div style={{ fontSize: 11, color: '#9090B0', marginTop: 2 }}>{tenant.adminEmail}</div>
        </div>
        <button
          onClick={onClose}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: '#9090B0',
            fontSize: 18,
            padding: '4px 8px',
            borderRadius: 6,
            lineHeight: 1,
          }}
        >
          &#10005;
        </button>
      </div>

      <div style={{ padding: '18px', flex: 1 }}>
        {/* Branding section */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9090B0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Branding
          </div>
          <Field
            id={`company-${tenant.id}`}
            label="Company Name"
            value={config.companyName}
            onChange={(v) => onConfigChange({ ...config, companyName: v })}
            placeholder={tenant.name}
          />
          <div style={{ marginBottom: 14 }}>
            <label
              htmlFor={`color-${tenant.id}`}
              style={{ fontSize: 11, fontWeight: 600, color: '#9090B0', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}
            >
              Primary Color
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                id={`color-${tenant.id}`}
                type="color"
                value={config.primaryColor}
                onChange={(e) => onConfigChange({ ...config, primaryColor: e.target.value })}
                style={{ width: 40, height: 36, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, cursor: 'pointer', background: 'transparent', padding: 2 }}
              />
              <span style={{ fontSize: 12, color: '#9090B0', fontFamily: 'monospace' }}>{config.primaryColor}</span>
            </div>
          </div>
          <Field
            id={`logo-${tenant.id}`}
            label="Logo URL"
            value={config.logoUrl}
            onChange={(v) => onConfigChange({ ...config, logoUrl: v })}
            placeholder="https://..."
          />
        </div>

        {/* Active modules */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9090B0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Active Modules
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {MODULES.map((mod) => (
              <div
                key={mod}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <span style={{ fontSize: 13, color: '#C8C8E0' }}>{mod}</span>
                <button
                  onClick={() => toggleModule(mod)}
                  style={{
                    width: 40,
                    height: 22,
                    borderRadius: 11,
                    border: 'none',
                    cursor: 'pointer',
                    background: config.modules[mod] ? '#6C47FF' : 'rgba(255,255,255,0.12)',
                    position: 'relative',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 3,
                      left: config.modules[mod] ? 21 : 3,
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 0.2s',
                    }}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save button */}
      <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={onSave}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: 8,
            border: 'none',
            background: '#6C47FF',
            color: '#fff',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Save Changes
        </button>
      </div>
    </div>
  )
}

// ─── New Tenant Modal ─────────────────────────────────────────────
function NewTenantModal({
  onClose,
  onCreate,
}: Readonly<{ onClose: () => void; onCreate: (f: NewTenantForm) => void }>) {
  const [form, setForm] = useState<NewTenantForm>({
    companyName: '',
    adminEmail: '',
    plan: 'Starter',
    trialDays: '14',
  })

  function handleSubmit() {
    if (!form.companyName || !form.adminEmail) return
    onCreate(form)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
      }}
    >
      <div
        style={{
          background: '#1A1A2E',
          borderRadius: 14,
          width: 460,
          padding: 28,
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#E8E8F8' }}>New Tenant</span>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9090B0', fontSize: 18, padding: '2px 6px', borderRadius: 6, lineHeight: 1 }}
          >
            &#10005;
          </button>
        </div>

        <Field
          id="nt-name"
          label="Company Name"
          value={form.companyName}
          onChange={(v) => setForm({ ...form, companyName: v })}
          placeholder="Acme Corp"
        />
        <Field
          id="nt-email"
          label="Admin Email"
          value={form.adminEmail}
          onChange={(v) => setForm({ ...form, adminEmail: v })}
          type="email"
          placeholder="admin@company.com"
        />

        <div style={{ marginBottom: 14 }}>
          <label
            htmlFor="nt-plan"
            style={{ fontSize: 11, fontWeight: 600, color: '#9090B0', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            Plan
          </label>
          <select
            id="nt-plan"
            value={form.plan}
            onChange={(e) => setForm({ ...form, plan: e.target.value as Plan })}
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.06)',
              color: '#E8E8F8',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          >
            <option value="Starter" style={{ background: '#1A1A2E' }}>Starter — $99/mo</option>
            <option value="Growth" style={{ background: '#1A1A2E' }}>Growth — $480/mo</option>
            <option value="Enterprise" style={{ background: '#1A1A2E' }}>Enterprise — Custom</option>
          </select>
        </div>

        <div style={{ marginBottom: 22 }}>
          <label
            htmlFor="nt-trial"
            style={{ fontSize: 11, fontWeight: 600, color: '#9090B0', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            Trial Days
          </label>
          <input
            id="nt-trial"
            type="number"
            min="0"
            max="90"
            value={form.trialDays}
            onChange={(e) => setForm({ ...form, trialDays: String(Number.parseInt(e.target.value, 10) || 0) })}
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.06)',
              color: '#E8E8F8',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#9090B0' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#6C47FF', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            Create Tenant
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tenants tab ──────────────────────────────────────────────────
function TenantsTab({
  tenants,
  onAddTenant,
}: Readonly<{ tenants: Tenant[]; onAddTenant: (f: NewTenantForm) => void }>) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [configs, setConfigs] = useState<Record<string, TenantConfig>>(
    Object.fromEntries(tenants.map((t) => [t.id, { ...DEFAULT_TENANT_CONFIG, companyName: t.name }]))
  )
  const [saveToast, setSaveToast] = useState(false)

  const selected = tenants.find((t) => t.id === selectedId) ?? null

  function handleSave() {
    setSaveToast(true)
    setTimeout(() => setSaveToast(false), 2000)
  }

  function handleCreate(f: NewTenantForm) {
    onAddTenant(f)
    setShowModal(false)
  }

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Main table area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#E8E8F8', margin: 0 }}>Customer Organizations</h2>
            <p style={{ fontSize: 12, color: '#9090B0', margin: '3px 0 0' }}>{tenants.length} tenants</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#6C47FF',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            + New Tenant
          </button>
        </div>

        <div style={{ background: '#13131F', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                {['Name', 'Plan', 'Members', 'MRR', 'Status', 'Actions'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '11px 16px',
                      textAlign: 'left',
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#6060A0',
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setSelectedId(selectedId === t.id ? null : t.id)}
                  style={{
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    background: selectedId === t.id ? 'rgba(108,71,255,0.12)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(ev) => {
                    if (selectedId !== t.id) {
                      (ev.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.03)'
                    }
                  }}
                  onMouseLeave={(ev) => {
                    if (selectedId !== t.id) {
                      (ev.currentTarget as HTMLTableRowElement).style.background = 'transparent'
                    }
                  }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#E8E8F8' }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: '#9090B0', marginTop: 1 }}>{t.adminEmail}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}><PlanBadge plan={t.plan} /></td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#C8C8E0' }}>{t.members}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#E8E8F8' }}>{fmtMrr(t.mrr)}</td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge tenant={t} /></td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedId(t.id)
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'transparent',
                        color: '#9090B0',
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      Configure
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side panel */}
      {selected !== null && (
        <TenantSidePanel
          tenant={selected}
          config={configs[selected.id] ?? { ...DEFAULT_TENANT_CONFIG, companyName: selected.name }}
          onConfigChange={(c) => setConfigs({ ...configs, [selected.id]: c })}
          onClose={() => setSelectedId(null)}
          onSave={handleSave}
        />
      )}

      {/* Save toast */}
      {saveToast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#22C55E',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(34,197,94,0.3)',
            zIndex: 400,
          }}
        >
          Changes saved successfully
        </div>
      )}

      {showModal && (
        <NewTenantModal onClose={() => setShowModal(false)} onCreate={handleCreate} />
      )}
    </div>
  )
}

// ─── Billing tab ──────────────────────────────────────────────────
function BillingTab({ tenants }: Readonly<{ tenants: Tenant[] }>) {
  const totalMrr = tenants.reduce((s, t) => s + t.mrr, 0)
  const activeTenants = tenants.filter((t) => t.status === 'Active').length
  const trialTenants = tenants.filter((t) => t.status === 'Trial').length
  const arpa = Math.round(totalMrr / tenants.length)

  const planCounts: Record<Plan, number> = { Starter: 0, Growth: 0, Enterprise: 0 }
  tenants.forEach((t) => { planCounts[t.plan]++ })
  const maxPlanCount = Math.max(...Object.values(planCounts))

  const planColors: Record<Plan, string> = {
    Starter: '#3B82F6',
    Growth: '#22C55E',
    Enterprise: '#6C47FF',
  }

  const summaryCards = [
    { label: 'Total MRR', value: `$${totalMrr.toLocaleString()}`, sub: 'monthly recurring revenue', color: '#6C47FF' },
    { label: 'Active Tenants', value: String(activeTenants), sub: 'paying customers', color: '#22C55E' },
    { label: 'Trial Tenants', value: String(trialTenants), sub: 'evaluating platform', color: '#F59E0B' },
    { label: 'Avg Revenue / Account', value: `$${arpa.toLocaleString()}`, sub: 'ARPA', color: '#EC4899' },
  ]

  return (
    <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {summaryCards.map(({ label, value, sub, color }) => (
          <div
            key={label}
            style={{
              background: '#13131F',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '18px 20px',
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, marginBottom: 10 }} />
            <div style={{ fontSize: 26, fontWeight: 700, color: '#E8E8F8', letterSpacing: '-0.04em' }}>{value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#C8C8E0', marginTop: 4 }}>{label}</div>
            <div style={{ fontSize: 11, color: '#6060A0', marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
        {/* Revenue table */}
        <div style={{ background: '#13131F', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#E8E8F8' }}>Revenue Overview</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                {['Tenant', 'Plan', 'Seats', 'MRR', 'Next Billing', 'Payment'].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6060A0', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: '#E8E8F8' }}>{t.name}</td>
                  <td style={{ padding: '11px 14px' }}><PlanBadge plan={t.plan} /></td>
                  <td style={{ padding: '11px 14px', fontSize: 13, color: '#C8C8E0' }}>{t.members}</td>
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#E8E8F8' }}>${t.mrr.toLocaleString()}</td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: '#9090B0' }}>{t.nextBilling}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 500,
                        background: t.paymentStatus === 'Paid' ? 'rgba(34,197,94,0.12)' : t.paymentStatus === 'Due' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                        color: t.paymentStatus === 'Paid' ? '#4ADE80' : t.paymentStatus === 'Due' ? '#FCD34D' : '#F87171',
                      }}
                    >
                      {t.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Plan distribution */}
        <div style={{ background: '#13131F', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E8E8F8', marginBottom: 18 }}>Plan Distribution</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {(Object.entries(planCounts) as [Plan, number][]).map(([plan, count]) => (
              <div key={plan}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#C8C8E0' }}>{plan}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#E8E8F8' }}>{count}</span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(count / maxPlanCount) * 100}%`,
                      background: planColors[plan],
                      borderRadius: 4,
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 11, color: '#6060A0', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Totals</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#9090B0' }}>Total seats</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#E8E8F8' }}>{tenants.reduce((s, t) => s + t.members, 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#9090B0' }}>ARR</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#6C47FF' }}>${(totalMrr * 12).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Usage tab ────────────────────────────────────────────────────
function UsageTab({ tenants }: Readonly<{ tenants: Tenant[] }>) {
  const featureTotals = [
    { label: 'Messages Sent', value: tenants.reduce((s, t) => s + t.messagesThisMonth, 0), color: '#6C47FF' },
    { label: 'Docs Created', value: tenants.reduce((s, t) => s + t.docsCreated, 0), color: '#3B82F6' },
    { label: 'Deployments', value: tenants.reduce((s, t) => s + t.deployments, 0), color: '#22C55E' },
    { label: 'API Calls', value: tenants.reduce((s, t) => s + t.apiCalls, 0), color: '#F59E0B' },
  ]
  const maxFeature = Math.max(...featureTotals.map((f) => f.value))

  return (
    <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
        {/* Per-tenant table */}
        <div style={{ background: '#13131F', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#E8E8F8' }}>Usage This Month</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                {['Tenant', 'Messages', 'Docs', 'Deployments', 'API Calls'].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6060A0', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: '#E8E8F8' }}>{t.name}</td>
                  <td style={{ padding: '11px 14px', fontSize: 13, color: '#C8C8E0' }}>{fmtNum(t.messagesThisMonth)}</td>
                  <td style={{ padding: '11px 14px', fontSize: 13, color: '#C8C8E0' }}>{t.docsCreated}</td>
                  <td style={{ padding: '11px 14px', fontSize: 13, color: '#C8C8E0' }}>{t.deployments}</td>
                  <td style={{ padding: '11px 14px', fontSize: 13, color: '#C8C8E0' }}>{fmtNum(t.apiCalls)}</td>
                </tr>
              ))}
              {/* Totals */}
              <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
                <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#E8E8F8' }}>Total</td>
                <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#6C47FF' }}>{fmtNum(tenants.reduce((s, t) => s + t.messagesThisMonth, 0))}</td>
                <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#6C47FF' }}>{tenants.reduce((s, t) => s + t.docsCreated, 0)}</td>
                <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#6C47FF' }}>{tenants.reduce((s, t) => s + t.deployments, 0)}</td>
                <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#6C47FF' }}>{fmtNum(tenants.reduce((s, t) => s + t.apiCalls, 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Top features */}
        <div style={{ background: '#13131F', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E8E8F8', marginBottom: 18 }}>Feature Usage (All Tenants)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {featureTotals.map(({ label, value, color }) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#C8C8E0' }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#E8E8F8' }}>{fmtNum(value)}</span>
                </div>
                <div style={{ height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 5, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(value / maxFeature) * 100}%`,
                      background: color,
                      borderRadius: 5,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Settings tab ─────────────────────────────────────────────────
function SettingsTab() {
  const [defaultPlan, setDefaultPlan] = useState<Plan>('Starter')
  const [trialDuration, setTrialDuration] = useState('14')
  const [stripeKey, setStripeKey] = useState('pk_live_••••••••••••••••••••••4X2Z')
  const [supportEmail, setSupportEmail] = useState('support@vyne.io')
  const [maintenance, setMaintenance] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: '#9090B0',
    display: 'block',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.05)',
    color: '#E8E8F8',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
      <div style={{ maxWidth: 600 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#E8E8F8', margin: '0 0 6px' }}>Platform Settings</h2>
        <p style={{ fontSize: 12, color: '#6060A0', margin: '0 0 24px' }}>Configure global defaults for the VYNE platform</p>

        <div
          style={{
            background: '#13131F',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Default plan */}
          <div>
            <label htmlFor="s-default-plan" style={labelStyle}>Default Plan for New Signups</label>
            <select
              id="s-default-plan"
              value={defaultPlan}
              onChange={(e) => setDefaultPlan(e.target.value as Plan)}
              style={{ ...inputStyle }}
            >
              <option value="Starter" style={{ background: '#13131F' }}>Starter — $99/mo</option>
              <option value="Growth" style={{ background: '#13131F' }}>Growth — $480/mo</option>
              <option value="Enterprise" style={{ background: '#13131F' }}>Enterprise — Custom</option>
            </select>
          </div>

          {/* Trial duration */}
          <div>
            <label htmlFor="s-trial" style={labelStyle}>Trial Duration (days)</label>
            <input
              id="s-trial"
              type="number"
              min="0"
              max="90"
              value={trialDuration}
              onChange={(e) => setTrialDuration(String(Number.parseInt(e.target.value, 10) || 0))}
              style={inputStyle}
            />
          </div>

          {/* Stripe key */}
          <div>
            <label htmlFor="s-stripe" style={labelStyle}>Stripe Publishable Key</label>
            <input
              id="s-stripe"
              type="text"
              value={stripeKey}
              onChange={(e) => setStripeKey(e.target.value)}
              style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.04em' }}
            />
            <div style={{ fontSize: 11, color: '#6060A0', marginTop: 5 }}>Last 4 chars visible. Full key stored encrypted.</div>
          </div>

          {/* Support email */}
          <div>
            <label htmlFor="s-email" style={labelStyle}>Support Email</label>
            <input
              id="s-email"
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Maintenance mode */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              background: maintenance ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${maintenance ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: maintenance ? '#FCA5A5' : '#E8E8F8' }}>Maintenance Mode</div>
              <div style={{ fontSize: 11, color: '#6060A0', marginTop: 2 }}>Disables all tenant logins and shows a maintenance banner</div>
            </div>
            <button
              onClick={() => setMaintenance(!maintenance)}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                background: maintenance ? '#EF4444' : 'rgba(255,255,255,0.12)',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 4,
                  left: maintenance ? 24 : 4,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                }}
              />
            </button>
          </div>

          <button
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: saved ? '#22C55E' : '#6C47FF',
              color: '#fff',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'background 0.2s',
              alignSelf: 'flex-start',
            }}
          >
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main admin page ──────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('tenants')
  const [tenants, setTenants] = useState<Tenant[]>(MOCK_TENANTS)

  function addTenant(f: NewTenantForm) {
    const newTenant: Tenant = {
      id: `t${Date.now()}`,
      name: f.companyName,
      plan: f.plan,
      members: 1,
      mrr: f.plan === 'Enterprise' ? 2400 : f.plan === 'Growth' ? 480 : 99,
      status: Number.parseInt(f.trialDays, 10) > 0 ? 'Trial' : 'Active',
      trialDaysLeft: Number.parseInt(f.trialDays, 10) > 0 ? Number.parseInt(f.trialDays, 10) : undefined,
      nextBilling: 'May 1, 2026',
      paymentStatus: 'Due',
      adminEmail: f.adminEmail,
      messagesThisMonth: 0,
      docsCreated: 0,
      deployments: 0,
      apiCalls: 0,
    }
    setTenants([...tenants, newTenant])
  }

  const tabLabels: { key: AdminTab; label: string }[] = [
    { key: 'tenants', label: 'Tenants' },
    { key: 'billing', label: 'Billing' },
    { key: 'usage', label: 'Usage' },
    { key: 'settings', label: 'Settings' },
  ]

  return (
    <div style={{ height: 'calc(100vh - 52px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Sub-nav tabs */}
      <div
        style={{
          background: '#13131F',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          flexShrink: 0,
        }}
      >
        {tabLabels.map(({ key, label }) => (
          <TabBtn key={key} label={label} active={tab === key} onClick={() => setTab(key)} />
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'tenants' && <TenantsTab tenants={tenants} onAddTenant={addTenant} />}
        {tab === 'billing' && <BillingTab tenants={tenants} />}
        {tab === 'usage' && <UsageTab tenants={tenants} />}
        {tab === 'settings' && <SettingsTab />}
      </div>
    </div>
  )
}
