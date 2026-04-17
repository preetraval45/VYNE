'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, FolderKanban, FileText, Package, BarChart3, Bot,
  Check, Zap, Shield, Globe, ChevronRight, Star, X, Menu,
  Loader2, Github, Twitter, Linkedin,
} from 'lucide-react'
import { VyneLogo } from '@/components/brand/VyneLogo'

// ── Brand palette (marketing page is always dark) ─────────────────
const C = {
  bg:           '#09071A',
  bgDeep:       '#05040F',
  bgMid:        '#0D0B20',
  purple:       '#7C5CFF',
  purpleLight:  '#9B80FF',
  purpleDim:    'rgba(124,92,255,0.08)',
  purpleBorder: 'rgba(124,92,255,0.3)',
  text:         '#E8E8F0',
  textSub:      '#9490B8',
  textMuted:    '#5E5A7A',
  border:       'rgba(255,255,255,0.06)',
  success:      '#22C55E',
  danger:       '#EF4444',
} as const

/* ─── Waitlist Form ──────────────────────────────────────────── */
function WaitlistForm({ variant = 'hero' }: { variant?: 'hero' | 'footer' }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    setErrorMessage('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: variant }),
      })
      if (res.ok) {
        setStatus('success')
        setEmail('')
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setErrorMessage(data.error ?? 'Something went wrong')
        setStatus('error')
      }
    } catch {
      setErrorMessage('Network error — please try again')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 20px', background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12,
          color: C.success, fontWeight: 600,
        }}
      >
        <Check size={20} />
        You&apos;re on the list! We&apos;ll be in touch.
      </motion.div>
    )
  }

  const isHero = variant === 'hero'

  return (
    <div style={{ width: '100%', maxWidth: isHero ? 480 : 400 }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, width: '100%' }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          aria-label="Email address for waitlist"
          required
          className="waitlist-input"
          style={{
            flex: 1, padding: '14px 18px', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.15)',
            background: isHero ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.06)',
            color: '#fff', fontSize: 15, outline: 'none', transition: 'border 0.2s',
          }}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          style={{
            padding: '14px 28px', borderRadius: 12, border: 'none',
            background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`,
            color: '#fff', fontWeight: 600, fontSize: 15,
            cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap', transition: 'transform 0.15s, box-shadow 0.15s',
            boxShadow: '0 4px 15px rgba(124,92,255,0.4)',
            display: 'flex', alignItems: 'center', gap: 8,
            opacity: status === 'loading' ? 0.8 : 1,
          }}
        >
          {status === 'loading' ? (
            <><Loader2 size={16} className="animate-spin" />Joining...</>
          ) : 'Join Waitlist'}
        </button>
      </form>
      <AnimatePresence>
        {status === 'error' && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ color: C.danger, fontSize: 13, marginTop: 8 }}
          >
            {errorMessage || 'Something went wrong'}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Navigation ─────────────────────────────────────────────── */
function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '16px 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(9,7,26,0.88)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <VyneLogo variant="horizontal" markSize={28} />

      {/* Desktop links */}
      <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        {([['#features','Features'],['#comparison','Compare'],['#pricing','Pricing']] as const).map(([href, label]) => (
          <a
            key={href}
            href={href}
            style={{ color: C.textSub, fontSize: 14, fontWeight: 500, transition: 'color 0.2s' }}
            onMouseEnter={(e) => { (e.target as HTMLAnchorElement).style.color = '#fff' }}
            onMouseLeave={(e) => { (e.target as HTMLAnchorElement).style.color = C.textSub }}
          >
            {label}
          </a>
        ))}
        <Link
          href="/login"
          style={{
            padding: '8px 20px', borderRadius: 8,
            border: `1px solid ${C.purpleBorder}`,
            color: C.purpleLight, fontSize: 14, fontWeight: 600,
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
        style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile dropdown with animation */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="hide-desktop"
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: 'rgba(9,7,26,0.97)', backdropFilter: 'blur(20px)',
              padding: 24, display: 'flex', flexDirection: 'column', gap: 20,
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {[['#features','Features'],['#comparison','Compare'],['#pricing','Pricing']].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMobileOpen(false)} style={{ color: C.textSub, fontSize: 16 }}>
                {label}
              </a>
            ))}
            <Link href="/login" style={{ color: C.purpleLight, fontSize: 16, fontWeight: 600 }}>
              Sign In
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

/* ─── Hero Section ───────────────────────────────────────────── */
function Hero() {
  return (
    <section
      style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        padding: '120px 24px 80px', position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute', top: '25%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 700, height: 700, borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(124,92,255,0.16) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      {/* Grid */}
      <div
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(124,92,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(124,92,255,0.03) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 70%)',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 800 }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 999,
            border: `1px solid ${C.purpleBorder}`,
            background: C.purpleDim, color: C.purpleLight,
            fontSize: 13, fontWeight: 600, marginBottom: 32,
          }}
        >
          <Zap size={14} />
          AI-Native Company OS
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 800,
            lineHeight: 1.05, letterSpacing: '-0.03em', color: '#fff', marginBottom: 24,
          }}
        >
          One workspace.
          <br />
          <span style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight}, #A78BFA)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Every tool replaced.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ fontSize: 'clamp(16px, 2vw, 20px)', lineHeight: 1.6, color: C.textSub, maxWidth: 600, margin: '0 auto 40px' }}
        >
          VYNE replaces Slack, Jira, Notion, QuickBooks, and Salesforce with one AI-powered platform.
          Chat, projects, docs, ERP, and finance — all connected by intelligence.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{ display: 'flex', justifyContent: 'center' }}
        >
          <WaitlistForm variant="hero" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{ marginTop: 24, fontSize: 13, color: C.textMuted }}
        >
          Early access · Free tier available · No credit card required
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 48 }}
        >
          {['Slack', 'Jira', 'Notion', 'QuickBooks', 'Salesforce', 'Datadog'].map((tool) => (
            <div
              key={tool}
              style={{
                padding: '8px 16px', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                color: C.textMuted, fontSize: 13, fontWeight: 500,
                textDecoration: 'line-through', textDecorationColor: 'rgba(239,68,68,0.5)',
              }}
            >
              {tool}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Features Grid ──────────────────────────────────────────── */
const features = [
  { icon: MessageSquare, title: 'Team Messaging',     desc: 'Channels, DMs, threads, and file sharing. Real-time with AI-powered thread summaries.',       replaces: 'Replaces Slack',       color: '#7C5CFF' },
  { icon: FolderKanban,  title: 'Project Management', desc: 'Kanban boards, sprints, issue tracking, and roadmaps. Built for engineering teams.',           replaces: 'Replaces Jira',        color: '#6366F1' },
  { icon: FileText,      title: 'Documents & Wiki',   desc: 'Rich text editor, nested pages, databases, and templates. Search across everything.',          replaces: 'Replaces Notion',      color: '#06B6D4' },
  { icon: Package,       title: 'ERP & Inventory',    desc: 'Purchase orders, vendors, stock levels, and fulfillment — with real-time alerts.',             replaces: 'Replaces NetSuite',    color: '#F59E0B' },
  { icon: BarChart3,     title: 'Finance & Invoicing', desc: 'General ledger, invoicing, expenses, and financial reports in one place.',                   replaces: 'Replaces QuickBooks',  color: '#22C55E' },
  { icon: Bot,           title: 'AI Command Center',  desc: 'Cross-domain intelligence that connects chat, tasks, code, and revenue data.',                 replaces: 'Replaces Datadog',     color: '#EC4899' },
]

function Features() {
  return (
    <section id="features" style={{ padding: '100px 24px', background: C.bgMid }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 16 }}>
            Six tools. One platform.
          </h2>
          <p style={{ fontSize: 17, color: C.textSub, maxWidth: 500, margin: '0 auto' }}>
            Every module shares the same database, the same AI, and the same context.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: i * 0.07 }}
              style={{
                padding: 32, borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${f.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <f.icon size={22} color={f.color} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: C.textSub, marginBottom: 16 }}>{f.desc}</p>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: f.color, padding: '4px 10px', borderRadius: 6, background: `${f.color}10` }}>
                <ChevronRight size={12} />
                {f.replaces}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Comparison Table ───────────────────────────────────────── */
const comparisonRows = [
  { feature: 'Team Messaging',        vyne: true,   slack: true,    jira: false,    notion: false   },
  { feature: 'Project Management',    vyne: true,   slack: false,   jira: true,     notion: 'Partial' },
  { feature: 'Documents & Wiki',      vyne: true,   slack: false,   jira: false,    notion: true    },
  { feature: 'ERP / Inventory',       vyne: true,   slack: false,   jira: false,    notion: false   },
  { feature: 'Finance & Invoicing',   vyne: true,   slack: false,   jira: false,    notion: false   },
  { feature: 'AI Cross-Domain Alerts',vyne: true,   slack: false,   jira: false,    notion: false   },
  { feature: 'Single Sign-On',        vyne: true,   slack: 'Paid',  jira: 'Paid',   notion: 'Paid'  },
  { feature: 'Cost (10 users/mo)',    vyne: '$120', slack: '$88',   jira: '$78',    notion: '$100'  },
  { feature: 'Total (all tools)',     vyne: '$120', slack: '',      jira: '',       notion: '$366+' },
]

function CellValue({ value }: { value: boolean | string }) {
  if (value === true)  return <div style={{ display: 'flex', justifyContent: 'center' }}><Check size={18} color="#22C55E" /></div>
  if (value === false) return <div style={{ display: 'flex', justifyContent: 'center' }}><X size={18} color="#4A4A6A" /></div>
  return <span style={{ fontSize: 13, color: C.textSub }}>{value}</span>
}

function Comparison() {
  return (
    <section id="comparison" style={{ padding: '100px 24px', background: `linear-gradient(180deg, ${C.bgMid} 0%, ${C.bg} 100%)` }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 16 }}>
            Why pay for six tools?
          </h2>
          <p style={{ fontSize: 17, color: C.textSub }}>VYNE gives you everything in one subscription.</p>
        </div>
        <div style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: C.purpleDim, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th style={{ padding: '14px 20px', textAlign: 'left', color: C.textSub, fontWeight: 600 }}>Feature</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', color: C.purpleLight, fontWeight: 700, fontSize: 15 }}>VYNE</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', color: C.textSub, fontWeight: 600 }}>Slack</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', color: C.textSub, fontWeight: 600 }}>Jira</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', color: C.textSub, fontWeight: 600 }}>Notion</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => (
                <tr
                  key={row.feature}
                  style={{ borderBottom: i < comparisonRows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}
                >
                  <td style={{ padding: '12px 20px', color: C.text, fontWeight: 500 }}>{row.feature}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}><CellValue value={row.vyne} /></td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}><CellValue value={row.slack} /></td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}><CellValue value={row.jira} /></td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}><CellValue value={row.notion} /></td>
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
    name: 'Free', price: '$0', period: 'forever',
    desc: 'For individuals and hobby projects',
    features: ['1 user', '1 GB storage', '50 AI queries/day', 'All core modules', 'Community support'],
    cta: 'Get Started Free', highlight: false,
  },
  {
    name: 'Starter', price: '$12', period: '/user/mo',
    desc: 'For growing teams that need real power',
    features: ['Unlimited users', '50 GB storage', '500 AI queries/day', 'All modules + integrations', 'Email support', 'CSV import/export'],
    cta: 'Join Waitlist', highlight: true,
  },
  {
    name: 'Business', price: '$24', period: '/user/mo',
    desc: 'For companies that run on VYNE',
    features: ['Unlimited users', '200 GB storage', 'Unlimited AI queries', 'Custom AI agents', 'Priority support', 'SSO / SAML', 'Audit log'],
    cta: 'Join Waitlist', highlight: false,
  },
]

function Pricing() {
  return (
    <section id="pricing" style={{ padding: '100px 24px', background: C.bg }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 16 }}>
            Simple, transparent pricing
          </h2>
          <p style={{ fontSize: 17, color: C.textSub }}>No per-module charges. One price, everything included.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'start' }}>
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              style={{
                padding: 32, borderRadius: 20, position: 'relative',
                border: plan.highlight ? `2px solid ${C.purpleBorder}` : '1px solid rgba(255,255,255,0.06)',
                background: plan.highlight ? `linear-gradient(180deg, ${C.purpleDim} 0%, transparent 100%)` : 'rgba(255,255,255,0.02)',
              }}
            >
              {plan.highlight && (
                <div
                  style={{
                    position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                    padding: '5px 18px', borderRadius: 999,
                    background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`,
                    color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                    boxShadow: '0 4px 12px rgba(124,92,255,0.45)', whiteSpace: 'nowrap',
                  }}
                >
                  ✦ MOST POPULAR
                </div>
              )}

              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{plan.name}</h3>
              <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 20 }}>{plan.desc}</p>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                <span style={{ fontSize: 44, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{plan.price}</span>
                <span style={{ fontSize: 14, color: C.textMuted }}>{plan.period}</span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {plan.features.map((feat) => (
                  <li key={feat} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: C.textSub }}>
                    <Check size={16} color={C.success} />
                    {feat}
                  </li>
                ))}
              </ul>

              <a
                href="#waitlist"
                aria-label={`${plan.cta} — ${plan.name} plan`}
                style={{
                  display: 'block', textAlign: 'center', padding: '12px 24px',
                  borderRadius: 10, fontWeight: 600, fontSize: 14, transition: 'all 0.2s',
                  ...(plan.highlight
                    ? { background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, color: '#fff', border: 'none', boxShadow: '0 4px 15px rgba(124,92,255,0.3)' }
                    : { background: 'transparent', color: C.purpleLight, border: `1px solid ${C.purpleBorder}` }),
                }}
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── AI Differentiator Section ──────────────────────────────── */
function AIDifferentiator() {
  return (
    <section style={{ padding: '100px 24px', background: `linear-gradient(180deg, ${C.bg}, ${C.bgMid})` }}>
      <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 999, border: `1px solid ${C.purpleBorder}`, background: C.purpleDim, color: C.purpleLight, fontSize: 13, fontWeight: 600, marginBottom: 32 }}>
          <Bot size={14} />
          The AI Advantage
        </div>

        <h2 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 20, lineHeight: 1.2 }}>
          &ldquo;Deployment failed &rarr; 47 orders stuck &rarr;{' '}
          <span style={{ color: C.danger }}>$12,400 at risk&rdquo;</span>
        </h2>
        <p style={{ fontSize: 17, lineHeight: 1.7, color: C.textSub, maxWidth: 650, margin: '0 auto 40px' }}>
          VYNE&apos;s AI sees across every module. When a deploy breaks, it instantly calculates the
          business impact, alerts the right people, and suggests a fix — because your chat, code,
          orders, and finance all live in the same system.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, textAlign: 'left' }}>
          {[
            { icon: Zap,    label: 'Cross-domain intelligence', desc: 'AI connects data across every module' },
            { icon: Shield, label: 'Real slash commands',       desc: '/approve-order actually approves orders' },
            { icon: Globe,  label: 'Business-aware alerts',     desc: 'Revenue impact, not just error codes' },
            { icon: Star,   label: 'Agent reasoning',           desc: 'See exactly how AI reached its conclusion' },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              style={{ padding: 24, borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
            >
              <item.icon size={20} color={C.purpleLight} style={{ marginBottom: 12 }} />
              <h4 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{item.label}</h4>
              <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>{item.desc}</p>
            </motion.div>
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
        background: `radial-gradient(ellipse 80% 60% at 50% 100%, rgba(124,92,255,0.15), transparent 70%), ${C.bg}`,
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 16 }}>
          Ready to replace your stack?
        </h2>
        <p style={{ fontSize: 17, color: C.textSub, marginBottom: 40 }}>
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
  const socials = [
    { href: 'https://github.com/preetraval45/VYNE', label: 'GitHub',   Icon: Github   },
    { href: 'https://twitter.com/vyneapp',          label: 'Twitter',  Icon: Twitter  },
    { href: 'https://linkedin.com/company/vyne-app',label: 'LinkedIn', Icon: Linkedin },
  ]

  return (
    <footer style={{ padding: '40px 24px', background: C.bgDeep, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
        <VyneLogo variant="mark" markSize={24} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {[{ label: 'Developers', href: '/developers' }, { label: 'Changelog', href: '/changelog' }, { label: 'Status', href: '/status' }].map((l) => (
            <Link key={l.href} href={l.href} style={{ fontSize: 12, color: C.textSub, fontWeight: 500 }}>
              {l.label}
            </Link>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {socials.map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              aria-label={label}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: C.textMuted, transition: 'color 0.2s' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = C.textSub }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = C.textMuted }}
            >
              <Icon size={16} />
            </a>
          ))}
        </div>

        <p style={{ fontSize: 12, color: C.textMuted }}>
          &copy; {new Date().getFullYear()} VYNE. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: '#fff' }}>
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
