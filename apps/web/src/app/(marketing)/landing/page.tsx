'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import {
  MessageSquare,
  FolderKanban,
  FileText,
  Package,
  BarChart3,
  Bot,
  Check,
  ArrowRight,
  Zap,
  Shield,
  Globe,
  ChevronRight,
  Star,
  X,
  Menu,
} from 'lucide-react'

/* ─── Waitlist Form ──────────────────────────────────────────── */
function WaitlistForm({ variant = 'hero' }: { variant?: 'hero' | 'footer' }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus('loading')

    try {
      const res = await fetch('https://formspree.io/f/xpwdkpvl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, _subject: 'VYNE Waitlist Signup' }),
      })
      setStatus(res.ok ? 'success' : 'error')
      if (res.ok) setEmail('')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 20px',
          background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: 12,
          color: '#22C55E',
          fontWeight: 600,
        }}
      >
        <Check size={20} />
        You&apos;re on the list! We&apos;ll be in touch.
      </div>
    )
  }

  const isHero = variant === 'hero'

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, width: '100%', maxWidth: isHero ? 480 : 400 }}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        required
        style={{
          flex: 1,
          padding: '14px 18px',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.15)',
          background: isHero ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.06)',
          color: '#fff',
          fontSize: 15,
          outline: 'none',
          transition: 'border 0.2s',
        }}
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        style={{
          padding: '14px 28px',
          borderRadius: 12,
          border: 'none',
          background: 'linear-gradient(135deg, #6C47FF, #8B6BFF)',
          color: '#fff',
          fontWeight: 600,
          fontSize: 15,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'transform 0.15s, box-shadow 0.15s',
          boxShadow: '0 4px 15px rgba(108,71,255,0.4)',
        }}
      >
        {status === 'loading' ? 'Joining...' : 'Join Waitlist'}
      </button>
      {status === 'error' && (
        <span style={{ color: '#EF4444', fontSize: 13, alignSelf: 'center' }}>Something went wrong</span>
      )}
    </form>
  )
}

/* ─── Navigation ─────────────────────────────────────────────── */
function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(10,10,26,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #6C47FF, #8B6BFF)',
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
        <span style={{ fontWeight: 700, fontSize: 20, color: '#fff', letterSpacing: '-0.02em' }}>VYNE</span>
      </div>

      {/* Desktop links */}
      <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <a href="#features" style={{ color: '#A0A0B8', fontSize: 14, fontWeight: 500, transition: 'color 0.2s' }}>
          Features
        </a>
        <a href="#comparison" style={{ color: '#A0A0B8', fontSize: 14, fontWeight: 500 }}>
          Compare
        </a>
        <a href="#pricing" style={{ color: '#A0A0B8', fontSize: 14, fontWeight: 500 }}>
          Pricing
        </a>
        <Link
          href="/login"
          style={{
            padding: '8px 20px',
            borderRadius: 8,
            border: '1px solid rgba(108,71,255,0.5)',
            color: '#8B6BFF',
            fontSize: 14,
            fontWeight: 600,
            transition: 'all 0.2s',
          }}
        >
          Sign In
        </Link>
      </div>

      {/* Mobile menu button */}
      <button
        className="hide-desktop"
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div
          className="hide-desktop"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'rgba(10,10,26,0.97)',
            backdropFilter: 'blur(20px)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <a href="#features" onClick={() => setMobileOpen(false)} style={{ color: '#A0A0B8', fontSize: 16 }}>
            Features
          </a>
          <a href="#comparison" onClick={() => setMobileOpen(false)} style={{ color: '#A0A0B8', fontSize: 16 }}>
            Compare
          </a>
          <a href="#pricing" onClick={() => setMobileOpen(false)} style={{ color: '#A0A0B8', fontSize: 16 }}>
            Pricing
          </a>
          <Link href="/login" style={{ color: '#8B6BFF', fontSize: 16, fontWeight: 600 }}>
            Sign In
          </Link>
        </div>
      )}
    </nav>
  )
}

/* ─── Hero Section ───────────────────────────────────────────── */
function Hero() {
  return (
    <section
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '120px 24px 80px',
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(108,71,255,0.25), transparent 70%), #0A0A1A',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Floating grid effect */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(108,71,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(108,71,255,0.03) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 70%)',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 800 }}>
        {/* Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            borderRadius: 999,
            border: '1px solid rgba(108,71,255,0.3)',
            background: 'rgba(108,71,255,0.08)',
            color: '#8B6BFF',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 32,
          }}
        >
          <Zap size={14} />
          AI-Native Company OS
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: 'clamp(36px, 6vw, 72px)',
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            color: '#fff',
            marginBottom: 24,
          }}
        >
          One workspace.
          <br />
          <span
            style={{
              background: 'linear-gradient(135deg, #6C47FF, #8B6BFF, #A78BFA)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Every tool replaced.
          </span>
        </h1>

        {/* Subheadline */}
        <p
          style={{
            fontSize: 'clamp(16px, 2vw, 20px)',
            lineHeight: 1.6,
            color: '#A0A0B8',
            maxWidth: 600,
            margin: '0 auto 40px',
          }}
        >
          VYNE replaces Slack, Jira, Notion, QuickBooks, and Salesforce with one AI-powered platform.
          Chat, projects, docs, ERP, and finance — all connected by intelligence.
        </p>

        {/* Waitlist */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <WaitlistForm variant="hero" />
        </div>

        {/* Social proof */}
        <p style={{ marginTop: 24, fontSize: 13, color: '#6B6B8A' }}>
          Join 200+ teams on the waitlist &middot; Free tier available
        </p>

        {/* Tool replacement badges */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 12,
            marginTop: 48,
          }}
        >
          {['Slack', 'Jira', 'Notion', 'QuickBooks', 'Salesforce', 'Datadog'].map((tool) => (
            <div
              key={tool}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                color: '#6B6B8A',
                fontSize: 13,
                fontWeight: 500,
                textDecoration: 'line-through',
                textDecorationColor: 'rgba(239,68,68,0.5)',
              }}
            >
              {tool}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Features Grid ──────────────────────────────────────────── */
const features = [
  {
    icon: MessageSquare,
    title: 'Team Messaging',
    desc: 'Channels, DMs, threads, and file sharing. Real-time with AI-powered thread summaries.',
    replaces: 'Replaces Slack',
    color: '#6C47FF',
  },
  {
    icon: FolderKanban,
    title: 'Project Management',
    desc: 'Kanban boards, sprints, issue tracking, and roadmaps. Built for engineering teams.',
    replaces: 'Replaces Jira',
    color: '#3B82F6',
  },
  {
    icon: FileText,
    title: 'Documents & Wiki',
    desc: 'Rich editor with slash commands, nested pages, and full-text search across your workspace.',
    replaces: 'Replaces Notion',
    color: '#22C55E',
  },
  {
    icon: Package,
    title: 'ERP & Operations',
    desc: 'Inventory, orders, suppliers, manufacturing, and CRM — all wired to your business data.',
    replaces: 'Replaces QuickBooks',
    color: '#F59E0B',
  },
  {
    icon: BarChart3,
    title: 'Finance & Accounting',
    desc: 'Revenue dashboards, expense tracking, invoicing, and real-time P&L statements.',
    replaces: 'Replaces Xero',
    color: '#EF4444',
  },
  {
    icon: Bot,
    title: 'AI Intelligence',
    desc: 'Cross-domain alerts, slash commands that execute real actions, and AI agents that reason across your business.',
    replaces: 'Nothing else does this',
    color: '#8B6BFF',
  },
]

function Features() {
  return (
    <section
      id="features"
      style={{
        padding: '100px 24px',
        background: '#0A0A1A',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h2
            style={{
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.02em',
              marginBottom: 16,
            }}
          >
            Six tools. One platform.
          </h2>
          <p style={{ fontSize: 17, color: '#A0A0B8', maxWidth: 500, margin: '0 auto' }}>
            Every module shares the same database, the same AI, and the same context.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 20,
          }}
        >
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                padding: 32,
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)',
                transition: 'border-color 0.3s, background 0.3s',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: `${f.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                }}
              >
                <f.icon size={22} color={f.color} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: '#A0A0B8', marginBottom: 16 }}>{f.desc}</p>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: f.color,
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: `${f.color}10`,
                }}
              >
                <ChevronRight size={12} />
                {f.replaces}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Comparison Table ───────────────────────────────────────── */
const comparisonRows = [
  { feature: 'Team Messaging', vyne: true, slack: true, jira: false, notion: false },
  { feature: 'Project Management', vyne: true, slack: false, jira: true, notion: 'Partial' },
  { feature: 'Documents & Wiki', vyne: true, slack: false, jira: false, notion: true },
  { feature: 'ERP / Inventory', vyne: true, slack: false, jira: false, notion: false },
  { feature: 'Finance & Invoicing', vyne: true, slack: false, jira: false, notion: false },
  { feature: 'AI Cross-Domain Alerts', vyne: true, slack: false, jira: false, notion: false },
  { feature: 'Single Sign-On', vyne: true, slack: 'Paid', jira: 'Paid', notion: 'Paid' },
  { feature: 'Cost (10 users/mo)', vyne: '$120', slack: '$88', jira: '$78', notion: '$100' },
  { feature: 'Total (all tools)', vyne: '$120', slack: '', jira: '', notion: '$366+' },
]

function CellValue({ value }: { value: boolean | string }) {
  if (value === true)
    return (
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Check size={18} color="#22C55E" />
      </div>
    )
  if (value === false)
    return (
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <X size={18} color="#6B6B8A" />
      </div>
    )
  return <span style={{ fontSize: 13, color: '#A0A0B8' }}>{value}</span>
}

function Comparison() {
  return (
    <section
      id="comparison"
      style={{
        padding: '100px 24px',
        background: 'linear-gradient(180deg, #0A0A1A 0%, #0F0F24 100%)',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2
            style={{
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.02em',
              marginBottom: 16,
            }}
          >
            Why pay for six tools?
          </h2>
          <p style={{ fontSize: 17, color: '#A0A0B8' }}>
            VYNE gives you everything in one subscription.
          </p>
        </div>

        <div
          style={{
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.06)',
            overflow: 'hidden',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 14,
            }}
          >
            <thead>
              <tr
                style={{
                  background: 'rgba(108,71,255,0.08)',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <th style={{ padding: '14px 20px', textAlign: 'left', color: '#A0A0B8', fontWeight: 600 }}>
                  Feature
                </th>
                <th
                  style={{
                    padding: '14px 16px',
                    textAlign: 'center',
                    color: '#8B6BFF',
                    fontWeight: 700,
                    fontSize: 15,
                  }}
                >
                  VYNE
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'center', color: '#A0A0B8', fontWeight: 600 }}>
                  Slack
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'center', color: '#A0A0B8', fontWeight: 600 }}>
                  Jira
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'center', color: '#A0A0B8', fontWeight: 600 }}>
                  Notion
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => (
                <tr
                  key={row.feature}
                  style={{
                    borderBottom: i < comparisonRows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}
                >
                  <td style={{ padding: '12px 20px', color: '#E8E8F0', fontWeight: 500 }}>{row.feature}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <CellValue value={row.vyne} />
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <CellValue value={row.slack} />
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <CellValue value={row.jira} />
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <CellValue value={row.notion} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

/* ─── Pricing ────────────────────────────────────────────────── */
const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    desc: 'For individuals and hobby projects',
    features: ['1 user', '1 GB storage', '50 AI queries/day', 'All core modules', 'Community support'],
    cta: 'Get Started Free',
    highlight: false,
  },
  {
    name: 'Starter',
    price: '$12',
    period: '/user/mo',
    desc: 'For growing teams that need real power',
    features: [
      'Unlimited users',
      '50 GB storage',
      '500 AI queries/day',
      'All modules + integrations',
      'Email support',
      'CSV import/export',
    ],
    cta: 'Join Waitlist',
    highlight: true,
  },
  {
    name: 'Business',
    price: '$24',
    period: '/user/mo',
    desc: 'For companies that run on VYNE',
    features: [
      'Unlimited users',
      '200 GB storage',
      'Unlimited AI queries',
      'Custom AI agents',
      'Priority support',
      'SSO / SAML',
      'Audit log',
    ],
    cta: 'Join Waitlist',
    highlight: false,
  },
]

function Pricing() {
  return (
    <section
      id="pricing"
      style={{
        padding: '100px 24px',
        background: '#0A0A1A',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h2
            style={{
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.02em',
              marginBottom: 16,
            }}
          >
            Simple, transparent pricing
          </h2>
          <p style={{ fontSize: 17, color: '#A0A0B8' }}>No per-module charges. One price, everything included.</p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
            alignItems: 'start',
          }}
        >
          {plans.map((plan) => (
            <div
              key={plan.name}
              style={{
                padding: 32,
                borderRadius: 20,
                border: plan.highlight
                  ? '2px solid rgba(108,71,255,0.5)'
                  : '1px solid rgba(255,255,255,0.06)',
                background: plan.highlight
                  ? 'linear-gradient(180deg, rgba(108,71,255,0.08) 0%, rgba(108,71,255,0.02) 100%)'
                  : 'rgba(255,255,255,0.02)',
                position: 'relative',
              }}
            >
              {plan.highlight && (
                <div
                  style={{
                    position: 'absolute',
                    top: -12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '4px 16px',
                    borderRadius: 999,
                    background: 'linear-gradient(135deg, #6C47FF, #8B6BFF)',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.03em',
                  }}
                >
                  MOST POPULAR
                </div>
              )}

              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{plan.name}</h3>
              <p style={{ fontSize: 13, color: '#6B6B8A', marginBottom: 20 }}>{plan.desc}</p>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                <span style={{ fontSize: 44, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{plan.price}</span>
                <span style={{ fontSize: 14, color: '#6B6B8A' }}>{plan.period}</span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {plan.features.map((feat) => (
                  <li key={feat} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#A0A0B8' }}>
                    <Check size={16} color="#22C55E" />
                    {feat}
                  </li>
                ))}
              </ul>

              <a
                href="#waitlist"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '12px 24px',
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  ...(plan.highlight
                    ? {
                        background: 'linear-gradient(135deg, #6C47FF, #8B6BFF)',
                        color: '#fff',
                        border: 'none',
                        boxShadow: '0 4px 15px rgba(108,71,255,0.3)',
                      }
                    : {
                        background: 'transparent',
                        color: '#8B6BFF',
                        border: '1px solid rgba(108,71,255,0.3)',
                      }),
                }}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── AI Differentiator Section ──────────────────────────────── */
function AIDifferentiator() {
  return (
    <section
      style={{
        padding: '100px 24px',
        background: 'linear-gradient(180deg, #0F0F24, #0A0A1A)',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            borderRadius: 999,
            border: '1px solid rgba(139,107,255,0.3)',
            background: 'rgba(139,107,255,0.08)',
            color: '#8B6BFF',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 32,
          }}
        >
          <Bot size={14} />
          The AI Advantage
        </div>

        <h2
          style={{
            fontSize: 'clamp(24px, 4vw, 40px)',
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.02em',
            marginBottom: 20,
            lineHeight: 1.2,
          }}
        >
          &ldquo;Deployment failed &rarr; 47 orders stuck &rarr;{' '}
          <span style={{ color: '#EF4444' }}>$12,400 at risk&rdquo;</span>
        </h2>
        <p style={{ fontSize: 17, lineHeight: 1.7, color: '#A0A0B8', maxWidth: 650, margin: '0 auto 40px' }}>
          VYNE&apos;s AI sees across every module. When a deploy breaks, it instantly calculates the
          business impact, alerts the right people, and suggests a fix — because your chat, code,
          orders, and finance all live in the same system.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 20,
            textAlign: 'left',
          }}
        >
          {[
            { icon: Zap, label: 'Cross-domain intelligence', desc: 'AI connects data across every module' },
            { icon: Shield, label: 'Real slash commands', desc: '/approve-order actually approves orders' },
            { icon: Globe, label: 'Business-aware alerts', desc: 'Revenue impact, not just error codes' },
            { icon: Star, label: 'Agent reasoning', desc: 'See exactly how AI reached its conclusion' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                padding: 24,
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <item.icon size={20} color="#8B6BFF" style={{ marginBottom: 12 }} />
              <h4 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{item.label}</h4>
              <p style={{ fontSize: 13, color: '#6B6B8A', lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── CTA / Waitlist Footer ──────────────────────────────────── */
function CTAFooter() {
  return (
    <section
      id="waitlist"
      style={{
        padding: '100px 24px',
        background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(108,71,255,0.15), transparent 70%), #0A0A1A',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h2
          style={{
            fontSize: 'clamp(28px, 4vw, 44px)',
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.02em',
            marginBottom: 16,
          }}
        >
          Ready to replace your stack?
        </h2>
        <p style={{ fontSize: 17, color: '#A0A0B8', marginBottom: 40 }}>
          Join the waitlist and be among the first to run your company on VYNE.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <WaitlistForm variant="footer" />
        </div>
      </div>
    </section>
  )
}

/* ─── Footer ─────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer
      style={{
        padding: '40px 24px',
        background: '#06060F',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: 'linear-gradient(135deg, #6C47FF, #8B6BFF)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 12,
            color: '#fff',
          }}
        >
          V
        </div>
        <span style={{ fontWeight: 600, fontSize: 14, color: '#6B6B8A' }}>VYNE</span>
      </div>
      <p style={{ fontSize: 13, color: '#4A4A6A' }}>&copy; {new Date().getFullYear()} VYNE. All rights reserved.</p>
    </footer>
  )
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div style={{ background: '#0A0A1A', minHeight: '100vh', color: '#fff' }}>
      <Nav />
      <Hero />
      <Features />
      <AIDifferentiator />
      <Comparison />
      <Pricing />
      <CTAFooter />
      <Footer />
    </div>
  )
}
