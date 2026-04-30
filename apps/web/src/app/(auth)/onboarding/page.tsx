'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Users,
  ArrowRight,
  ArrowLeft,
  Check,
  MessageSquare,
  FolderKanban,
  FileText,
  Package,
  BarChart3,
  Bot,
  Megaphone,
  Headphones,
  ShoppingCart,
  Factory,
  Receipt,
  Eye,
  Wrench,
  UserCircle,
  Sparkles,
  PartyPopper,
  X,
  Plus,
  Loader2,
} from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth'
import { orgsApi } from '@/lib/api/client'
import type { OrgFeatures } from '@/lib/api/client'

/* ─── Types ──────────────────────────────────────────────────── */
interface ModuleOption {
  id: string
  name: string
  desc: string
  icon: React.ElementType
  color: string
  recommended?: boolean
}

/* ─── Available Modules ──────────────────────────────────────── */
const modules: ModuleOption[] = [
  { id: 'chat', name: 'Messaging', desc: 'Team chat, channels, DMs', icon: MessageSquare, color: '#06B6D4', recommended: true },
  { id: 'projects', name: 'Projects', desc: 'Kanban, sprints, issues', icon: FolderKanban, color: '#3B82F6', recommended: true },
  { id: 'docs', name: 'Documents', desc: 'Wiki, notes, knowledge base', icon: FileText, color: '#22C55E', recommended: true },
  { id: 'erp', name: 'ERP / Inventory', desc: 'Stock, orders, suppliers', icon: Package, color: '#F59E0B' },
  { id: 'finance', name: 'Finance', desc: 'Accounting, P&L, expenses', icon: BarChart3, color: '#EF4444' },
  { id: 'crm', name: 'CRM', desc: 'Pipeline, deals, customers', icon: UserCircle, color: '#8B5CF6' },
  { id: 'ai', name: 'AI Assistant', desc: 'Smart alerts, AI agents', icon: Bot, color: '#22D3EE', recommended: true },
  { id: 'sales', name: 'Sales', desc: 'Quotes, orders, opportunities', icon: ShoppingCart, color: '#06B6D4' },
  { id: 'marketing', name: 'Marketing', desc: 'Campaigns, analytics', icon: Megaphone, color: '#EC4899' },
  { id: 'manufacturing', name: 'Manufacturing', desc: 'BOM, work orders', icon: Factory, color: '#F97316' },
  { id: 'invoicing', name: 'Invoicing', desc: 'Bills, payments, receipts', icon: Receipt, color: '#14B8A6' },
  { id: 'observe', name: 'Observability', desc: 'Metrics, logs, alerts', icon: Eye, color: '#64748B' },
  { id: 'hr', name: 'HR & People', desc: 'Team, payroll, leave', icon: Users, color: '#A855F7' },
  { id: 'maintenance', name: 'Maintenance', desc: 'Equipment, schedules', icon: Wrench, color: '#78716C' },
  { id: 'support', name: 'Support', desc: 'Tickets, SLA, knowledge', icon: Headphones, color: '#0EA5E9' },
]

const industries = [
  'Technology / SaaS',
  'E-commerce / Retail',
  'Manufacturing',
  'Professional Services',
  'Healthcare',
  'Real Estate',
  'Education',
  'Non-profit',
  'Other',
]

const companySizes = ['Just me', '2-10', '11-50', '51-200', '200+']

const useCases = [
  { id: 'run-company', label: 'Run my whole company on one tool' },
  { id: 'replace-stack', label: 'Replace Slack + Jira + Notion' },
  { id: 'erp-crm', label: 'Adopt a modern ERP / CRM' },
  { id: 'projects-only', label: 'Start with projects, expand later' },
  { id: 'evaluating', label: 'Just exploring / comparing tools' },
] as const

/* ─── Confetti Effect ────────────────────────────────────────── */
function Confetti() {
  const [pieces, setPieces] = useState<Array<{ id: number; x: number; delay: number; color: string; size: number }>>([])

  useEffect(() => {
    const colors = ['#06B6D4', '#22D3EE', '#22C55E', '#F59E0B', '#3B82F6', '#EF4444', '#EC4899']
    const newPieces = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
    }))
    setPieces(newPieces)
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100, overflow: 'hidden' }}>
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: -20,
            width: p.size,
            height: p.size,
            borderRadius: p.size > 8 ? '50%' : 2,
            background: p.color,
            animation: `confetti-fall 3s ease-in ${p.delay}s forwards`,
            opacity: 0,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

/* ─── Step Components ────────────────────────────────────────── */

interface CompanyData {
  companyName: string
  industry: string
  size: string
  useCase: string
}

function StepCompany({
  data,
  onChange,
}: {
  data: CompanyData
  onChange: (d: Partial<typeof data>) => void
}) {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <Building2 size={28} color="var(--vyne-accent, #06B6D4)" />
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
          Tell us about your company
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
          This helps us tailor your workspace.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Company name
          </label>
          <input
            type="text"
            value={data.companyName}
            onChange={(e) => onChange({ companyName: e.target.value })}
            placeholder="Acme Corp"
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 10,
              border: '1px solid var(--content-border)',
              background: 'var(--content-bg)',
              color: 'var(--text-primary)',
              fontSize: 15,
              outline: 'none',
              transition: 'border 0.2s',
            }}
          />
        </div>

        <div>
          <label htmlFor="onboarding-industry" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Industry
          </label>
          <select
            id="onboarding-industry"
            aria-label="Industry"
            value={data.industry}
            onChange={(e) => onChange({ industry: e.target.value })}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 10,
              border: '1px solid var(--content-border)',
              background: 'var(--content-bg)',
              color: 'var(--text-primary)',
              fontSize: 15,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">Select industry...</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Company size
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {companySizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onChange({ size })}
                style={{
                  padding: '10px 18px',
                  borderRadius: 10,
                  border: `1.5px solid ${data.size === size ? '#06B6D4' : 'var(--content-border)'}`,
                  background: data.size === size ? 'rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.08)' : 'var(--content-bg)',
                  color: data.size === size ? '#06B6D4' : 'var(--text-primary)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
            What brings you to VYNE?
          </label>
          <div
            role="radiogroup"
            aria-label="Primary use case"
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            {useCases.map((uc) => {
              const active = data.useCase === uc.id
              return (
                <button
                  key={uc.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChange({ useCase: uc.id })}
                  style={{
                    textAlign: 'left',
                    padding: '11px 14px',
                    borderRadius: 10,
                    border: `1.5px solid ${active ? '#06B6D4' : 'var(--content-border)'}`,
                    background: active ? 'rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.08)' : 'var(--content-bg)',
                    color: active ? '#06B6D4' : 'var(--text-primary)',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {uc.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function StepModules({
  selected,
  onToggle,
}: {
  selected: Set<string>
  onToggle: (id: string) => void
}) {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <Sparkles size={28} color="var(--vyne-accent, #06B6D4)" />
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
          Choose your modules
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
          You can always add or remove modules later.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 12,
        }}
      >
        {modules.map((mod) => {
          const isSelected = selected.has(mod.id)
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => onToggle(mod.id)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: 16,
                borderRadius: 12,
                border: `1.5px solid ${isSelected ? mod.color : 'var(--content-border)'}`,
                background: isSelected ? `${mod.color}08` : 'var(--content-bg)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                textAlign: 'left',
                position: 'relative',
              }}
            >
              {isSelected && (
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    background: mod.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Check size={12} color="#fff" strokeWidth={3} />
                </div>
              )}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `${mod.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <mod.icon size={18} color={mod.color} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{mod.name}</span>
                  {mod.recommended && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#06B6D4',
                        background: 'rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.1)',
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                    >
                      REC
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{mod.desc}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StepInvite({
  emails,
  onAdd,
  onRemove,
  onChangeEmail,
  onSkip,
}: {
  emails: string[]
  onAdd: () => void
  onRemove: (i: number) => void
  onChangeEmail: (i: number, val: string) => void
  onSkip: () => void
}) {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <Users size={28} color="var(--vyne-accent, #06B6D4)" />
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
          Invite your team
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
          You can always invite more people later.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {emails.map((email, i) => (
          <div key={i} style={{ display: 'flex', gap: 8 }}>
            <input
              type="email"
              value={email}
              onChange={(e) => onChangeEmail(i, e.target.value)}
              placeholder={`teammate${i + 1}@company.com`}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 10,
                border: '1px solid var(--content-border)',
                background: 'var(--content-bg)',
                color: 'var(--text-primary)',
                fontSize: 14,
                outline: 'none',
              }}
            />
            {emails.length > 1 && (
              <button
                type="button"
                onClick={() => onRemove(i)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  border: '1px solid var(--content-border)',
                  background: 'var(--content-bg)',
                  color: 'var(--text-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  alignSelf: 'center',
                }}
                aria-label="Remove email"
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={onAdd}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px dashed var(--content-border)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <Plus size={14} />
          Add another
        </button>
      </div>

      <button
        type="button"
        onClick={onSkip}
        style={{
          display: 'block',
          margin: '24px auto 0',
          background: 'none',
          border: 'none',
          color: 'var(--text-tertiary)',
          fontSize: 13,
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
      >
        Skip for now
      </button>
    </div>
  )
}

function StepDone({ companyName }: { companyName: string }) {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
      <Confetti />
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: 'linear-gradient(135deg, var(--vyne-accent, #06B6D4), var(--vyne-accent-light, #22D3EE))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 8px 30px rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.3)',
        }}
      >
        <PartyPopper size={36} color="#fff" />
      </div>
      <h2 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>
        You&apos;re all set!
      </h2>
      <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>
        <strong>{companyName || 'Your workspace'}</strong> is ready to go.
      </p>
      <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 40 }}>
        Your modules are active and your team has been invited.
      </p>
    </div>
  )
}

/* ─── Main Wizard ────────────────────────────────────────────── */
export default function OnboardingPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [step, setStep] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [company, setCompany] = useState<CompanyData>({ companyName: '', industry: '', size: '', useCase: '' })
  const [selectedModules, setSelectedModules] = useState<Set<string>>(
    new Set(['chat', 'projects', 'docs', 'ai'])
  )
  const [inviteEmails, setInviteEmails] = useState([''])

  const steps = [
    { label: 'Company', icon: Building2 },
    { label: 'Modules', icon: Sparkles },
    { label: 'Team', icon: Users },
    { label: 'Done', icon: Check },
  ]

  function toggleModule(id: string) {
    setSelectedModules((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function canAdvance() {
    if (step === 0) return company.companyName.trim().length > 0
    if (step === 1) return selectedModules.size > 0
    return true
  }

  // Build feature flags from selected module set
  function buildFeatureFlags(): Partial<OrgFeatures> {
    const s = selectedModules
    return {
      chat: s.has('chat'),
      projects: s.has('projects'),
      docs: s.has('docs'),
      ai: s.has('ai'),
      erp: s.has('erp'),
      finance: s.has('finance'),
      crm: s.has('crm'),
      sales: s.has('sales'),
      invoicing: s.has('invoicing'),
      manufacturing: s.has('manufacturing'),
      purchase: s.has('purchase'),
      hr: s.has('hr'),
      marketing: s.has('marketing'),
      maintenance: s.has('maintenance'),
      support: s.has('support'),
      observability: s.has('observe'),
    }
  }

  const handleNext = useCallback(async () => {
    if (step < 3) {
      setStep(step + 1)
      return
    }

    // Step 3 → Done: persist onboarding data
    setIsSaving(true)

    // Always persist to localStorage for demo-mode / offline use
    const onboardingData = {
      company,
      modules: Array.from(selectedModules),
      invites: inviteEmails.filter(Boolean),
    }
    localStorage.setItem('vyne-onboarded', 'true')
    localStorage.setItem('vyne-onboarding', JSON.stringify(onboardingData))
    // Store enabled modules for sidebar filtering
    localStorage.setItem('vyne-modules', JSON.stringify(Array.from(selectedModules)))

    // If we have a real org ID, persist to backend
    if (user?.orgId) {
      try {
        await orgsApi.update(user.orgId, {
          name: company.companyName.trim() || undefined,
          settings: {
            features: buildFeatureFlags(),
          },
        })
      } catch {
        // Non-fatal: local state already saved
      }
    }

    setIsSaving(false)
    router.push('/home')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, company, selectedModules, inviteEmails, user, router])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--content-bg)',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--content-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, var(--vyne-accent, #06B6D4), var(--vyne-accent-light, #22D3EE))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 16,
              color: '#fff',
            }}
          >
            V
          </div>
          <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>VYNE</span>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {steps.map((s, i) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: i <= step ? '#06B6D4' : 'var(--content-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s',
                }}
              >
                {i < step ? (
                  <Check size={14} color="#fff" strokeWidth={3} />
                ) : (
                  <s.icon size={14} color={i === step ? '#fff' : 'var(--text-tertiary)'} />
                )}
              </div>
              {i < steps.length - 1 && (
                <div
                  style={{
                    width: 24,
                    height: 2,
                    borderRadius: 1,
                    background: i < step ? '#06B6D4' : 'var(--content-border)',
                    transition: 'background 0.3s',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        <div style={{ width: 82 }} /> {/* Spacer for alignment */}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 24px' }}>
        {step === 0 && <StepCompany data={company} onChange={(d) => setCompany((prev) => ({ ...prev, ...d }))} />}
        {step === 1 && <StepModules selected={selectedModules} onToggle={toggleModule} />}
        {step === 2 && (
          <StepInvite
            emails={inviteEmails}
            onAdd={() => setInviteEmails((prev) => [...prev, ''])}
            onRemove={(i) => setInviteEmails((prev) => prev.filter((_, idx) => idx !== i))}
            onChangeEmail={(i, val) =>
              setInviteEmails((prev) => prev.map((e, idx) => (idx === i ? val : e)))
            }
            onSkip={() => setStep(3)}
          />
        )}
        {step === 3 && <StepDone companyName={company.companyName} />}
      </div>

      {/* Bottom navigation */}
      <div
        style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--content-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          onClick={() => step > 0 && setStep(step - 1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 20px',
            borderRadius: 10,
            border: '1px solid var(--content-border)',
            background: 'var(--content-bg)',
            color: 'var(--text-secondary)',
            fontSize: 14,
            fontWeight: 500,
            cursor: step > 0 ? 'pointer' : 'default',
            opacity: step > 0 ? 1 : 0,
            transition: 'opacity 0.2s',
          }}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
          Step {step + 1} of {steps.length}
        </span>

        <button
          type="button"
          onClick={handleNext}
          disabled={!canAdvance() || isSaving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 24px',
            borderRadius: 10,
            border: 'none',
            background: (canAdvance() && !isSaving) ? 'linear-gradient(135deg, var(--vyne-accent, #06B6D4), var(--vyne-accent-light, #22D3EE))' : 'var(--content-secondary)',
            color: (canAdvance() && !isSaving) ? '#fff' : 'var(--text-tertiary)',
            fontSize: 14,
            fontWeight: 600,
            cursor: (canAdvance() && !isSaving) ? 'pointer' : 'default',
            transition: 'all 0.2s',
            boxShadow: (canAdvance() && !isSaving) ? '0 4px 12px rgba(var(--vyne-accent-rgb, 6, 182, 212), 0.3)' : 'none',
          }}
        >
          {isSaving ? (
            <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
          ) : (
            <>{step === 3 ? 'Go to Dashboard' : step === 2 ? 'Finish Setup' : 'Continue'}<ArrowRight size={16} /></>
          )}
        </button>
      </div>
    </div>
  )
}
