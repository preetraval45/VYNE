'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Settings, LogOut } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth'
import { useUIStore, useTheme } from '@/lib/stores/ui'

// ── Vyne logo (exact SVG from prototype) ──────────────────────────
function VyneLogo({ size = 26 }: Readonly<{ size?: number }>) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="21" r="12" fill="#6C47FF" opacity="0.12" />
      <line x1="6" y1="8" x2="18" y2="28" stroke="#8B68FF" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="30" y1="8" x2="18" y2="28" stroke="#6C47FF" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="6" y1="8" x2="30" y2="8" stroke="#6C47FF" strokeWidth="1" strokeLinecap="round" opacity="0.25" />
      <circle cx="12" cy="18" r="1.8" fill="#6C47FF" opacity="0.45" />
      <circle cx="24" cy="18" r="1.8" fill="#6C47FF" opacity="0.45" />
      <circle cx="6" cy="8" r="3.3" fill="#8B68FF" />
      <circle cx="30" cy="8" r="3.3" fill="#8B68FF" />
      <circle cx="18" cy="28" r="5.2" fill="#6C47FF" />
      <circle cx="6" cy="8" r="1.3" fill="white" opacity="0.7" />
      <circle cx="30" cy="8" r="1.3" fill="white" opacity="0.7" />
      <circle cx="18" cy="28" r="2" fill="white" opacity="0.65" />
    </svg>
  )
}

// ── Presence dot ──────────────────────────────────────────────────
function Presence({ color }: Readonly<{ color: 'green' | 'amber' | 'gray' }>) {
  let bg = '#6B6B8A'
  if (color === 'green') bg = '#22C55E'
  else if (color === 'amber') bg = '#F59E0B'
  return (
    <span
      style={{
        width: 7, height: 7, borderRadius: '50%', background: bg, flexShrink: 0,
        border: '1.5px solid #1C1C2E', display: 'inline-block',
      }}
    />
  )
}

// ── Mini avatar ───────────────────────────────────────────────────
function MiniAvatar({ initials, gradient }: Readonly<{ initials: string; gradient: string }>) {
  return (
    <span
      style={{
        width: 22, height: 22, borderRadius: '50%', background: gradient,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 600, color: '#fff', flexShrink: 0,
      }}
    >
      {initials}
    </span>
  )
}

// ── Nav section label ─────────────────────────────────────────────
function SectionLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.22)',
      letterSpacing: '0.08em', padding: '8px 8px 3px', textTransform: 'uppercase',
    }}>
      {children}
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────────
function SbDivider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 0' }} />
}

// ── Nav item ──────────────────────────────────────────────────────
interface NavItemProps {
  readonly icon: string
  readonly label: string
  readonly badge?: number
  readonly badgeWarn?: boolean
  readonly active?: boolean
  readonly onClick: () => void
}

function NavItem({ icon, label, badge, badgeWarn, active, onClick }: NavItemProps) {
  const [hovered, setHovered] = useState(false)

  let color = 'rgba(255,255,255,0.45)'
  if (active) color = '#fff'
  else if (hovered) color = 'rgba(255,255,255,0.75)'

  let bg = 'transparent'
  if (active) bg = 'rgba(108,71,255,0.2)'
  else if (hovered) bg = 'rgba(255,255,255,0.06)'

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 8px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
        color, background: bg,
        border: 'none', marginBottom: 1, userSelect: 'none', transition: 'all 0.12s',
      }}
    >
      <span style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, opacity: active ? 1 : 0.7, flexShrink: 0 }}>
        {icon}
      </span>
      <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
      {badge !== undefined && (
        <span style={{
          background: badgeWarn ? '#E24B4A' : '#6C47FF', color: '#fff',
          borderRadius: 10, padding: '1px 6px', fontSize: 9, fontWeight: 600,
          minWidth: 16, textAlign: 'center',
        }}>
          {badge}
        </span>
      )}
    </button>
  )
}

// ── Channel item ──────────────────────────────────────────────────
function ChannelItem({ name, unread, isAI, onClick }: Readonly<{ name: string; unread?: boolean; isAI?: boolean; onClick?: () => void }>) {
  const [hovered, setHovered] = useState(false)

  let color = 'rgba(255,255,255,0.45)'
  if (unread) color = 'rgba(255,255,255,0.85)'
  else if (hovered) color = 'rgba(255,255,255,0.7)'

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 7,
        padding: '3px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 11,
        color, fontWeight: unread ? 500 : 400,
        background: hovered ? 'rgba(255,255,255,0.06)' : 'transparent',
        border: 'none', marginBottom: 1, transition: 'all 0.12s',
      }}
    >
      {unread
        ? <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6C47FF', flexShrink: 0 }} />
        : <span style={{ fontSize: 11, opacity: 0.4, width: 12 }}>#</span>
      }
      <span style={{ flex: 1, textAlign: 'left' }}>{name}</span>
      {isAI && (
        <span style={{ fontSize: 9, color: '#8B68FF', background: 'rgba(108,71,255,0.15)', padding: '1px 4px', borderRadius: 3, fontWeight: 500 }}>
          AI
        </span>
      )}
    </button>
  )
}

// ── DM item ───────────────────────────────────────────────────────
function DMItem({ name, initials, gradient, presence, badge, onClick }: Readonly<{
  name: string; initials: string; gradient: string;
  presence: 'green' | 'amber' | 'gray'; badge?: number; onClick?: () => void
}>) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 7,
        padding: '3px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 11,
        color: hovered ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.45)',
        background: hovered ? 'rgba(255,255,255,0.06)' : 'transparent',
        border: 'none', marginBottom: 1, transition: 'all 0.12s',
      }}
    >
      <span style={{ position: 'relative', flexShrink: 0 }}>
        <MiniAvatar initials={initials} gradient={gradient} />
        <span style={{ position: 'absolute', bottom: -1, right: -1 }}>
          <Presence color={presence} />
        </span>
      </span>
      <span style={{ flex: 1, textAlign: 'left' }}>{name}</span>
      {badge && (
        <span style={{
          background: '#6C47FF', color: '#fff', borderRadius: 10,
          padding: '1px 6px', fontSize: 9, fontWeight: 600,
        }}>
          {badge}
        </span>
      )}
    </button>
  )
}

// ── Main Sidebar ──────────────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { toggleCommandPalette, toggleTheme } = useUIStore()
  const theme = useTheme()
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false)

  function isActive(href: string) {
    return pathname.startsWith(href)
  }

  function go(href: string) {
    router.push(href)
  }

  const userName = user?.name ?? 'Preet Raval'
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <aside
      className="sidebar-scroll"
      style={{
        width: 224, minWidth: 224, background: '#1C1C2E',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', flexDirection: 'column', height: '100%',
        overflow: 'hidden', flexShrink: 0, position: 'relative', zIndex: 10,
      }}
    >
      {/* ── Workspace ─────────────────────────────── */}
      <div style={{ padding: '10px 10px 6px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <button
          onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 8px', borderRadius: 8, cursor: 'pointer',
            background: workspaceMenuOpen ? 'rgba(255,255,255,0.06)' : 'transparent',
            border: 'none', transition: 'background 0.1s',
          }}
          onMouseEnter={(e) => { if (!workspaceMenuOpen) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
          onMouseLeave={(e) => { if (!workspaceMenuOpen) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <VyneLogo size={26} />
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>Vyne HQ</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>Business · 14 members</div>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginLeft: 'auto' }}>⌄</span>
        </button>

        {workspaceMenuOpen && (
          <div style={{
            marginTop: 4, background: '#252538', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, padding: '4px 0', overflow: 'hidden',
          }}>
            <button
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 12, color: '#A0A0B8', background: 'transparent', border: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
            >
              <Settings size={13} /> Workspace settings
            </button>
            <button
              onClick={() => logout()}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 12, color: '#EF4444', background: 'transparent', border: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
            >
              <LogOut size={13} /> Sign out
            </button>
          </div>
        )}
      </div>

      {/* ── Search / ⌘K ───────────────────────────── */}
      <button
        onClick={toggleCommandPalette}
        style={{
          margin: '6px 10px', background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
          padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 7,
          cursor: 'pointer', transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'
          ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.14)'
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'
          ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'
        }}
      >
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>🔍</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', flex: 1, textAlign: 'left' }}>Search Vyne...</span>
        <kbd style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace' }}>⌘K</kbd>
      </button>

      {/* ── Nav ───────────────────────────────────── */}
      <div className="sidebar-scroll" style={{ padding: '4px 8px', flex: 1, overflowY: 'auto' }}>
        <NavItem icon="◈" label="Home" active={pathname === '/home' || pathname === '/'} onClick={() => go('/home')} />
        <NavItem icon="📥" label="Inbox" active={isActive('/inbox')} badge={5} onClick={() => go('/inbox')} />

        <SbDivider />
        <SectionLabel>Work</SectionLabel>
        <NavItem icon="💬" label="Chat" active={isActive('/chat')} badge={3} onClick={() => go('/chat')} />
        <NavItem icon="◷" label="Projects" active={isActive('/projects')} badge={2} badgeWarn onClick={() => go('/projects')} />
        <NavItem icon="📄" label="Docs" active={isActive('/docs')} onClick={() => go('/docs')} />

        <SbDivider />
        <SectionLabel>DevOps + AI</SectionLabel>
        <NavItem icon="⌨" label="Code" active={isActive('/code')} onClick={() => go('/code')} />
        <NavItem icon="📊" label="Observe" active={isActive('/observe')} badge={1} badgeWarn onClick={() => go('/observe')} />

        <SbDivider />
        <SectionLabel>Business</SectionLabel>
        <NavItem icon="📦" label="Ops" active={isActive('/ops')} onClick={() => go('/ops')} />
        <NavItem icon="💰" label="Finance" active={isActive('/finance')} onClick={() => go('/finance')} />
        <NavItem icon="🎯" label="CRM" active={isActive('/crm')} onClick={() => go('/crm')} />
        <NavItem icon="👥" label="HR" active={isActive('/hr')} onClick={() => go('/hr')} />
        <NavItem icon="🧾" label="Expenses" active={isActive('/expenses')} onClick={() => go('/expenses')} />

        <SbDivider />
        <SectionLabel>Intelligence</SectionLabel>
        <NavItem icon="🧠" label="AI Assistant" active={isActive('/ai')} onClick={() => go('/ai')} />
        <NavItem icon="⚡" label="Automations" active={isActive('/automations')} onClick={() => go('/automations')} />
        <NavItem icon="📡" label="Observe" active={isActive('/observe')} onClick={() => go('/observe')} />
        <NavItem icon="🗺" label="Roadmap" active={isActive('/roadmap')} onClick={() => go('/roadmap')} />
        <NavItem icon="⚙" label="Settings" active={isActive('/settings')} onClick={() => go('/settings')} />
        <NavItem icon="🛡" label="Admin Panel" active={isActive('/admin')} onClick={() => go('/admin')} />

        <SbDivider />
        <SectionLabel>Channels</SectionLabel>
        <ChannelItem name="general" onClick={() => go('/chat')} />
        <ChannelItem name="alerts" unread isAI onClick={() => go('/chat')} />
        <ChannelItem name="deployments" isAI onClick={() => go('/chat')} />
        <ChannelItem name="eng-team" unread onClick={() => go('/chat')} />
        <ChannelItem name="inventory" isAI onClick={() => go('/chat')} />

        <SectionLabel>Direct Messages</SectionLabel>
        <DMItem name="Sarah K." initials="S" gradient="linear-gradient(135deg,#9B59B6,#8E44AD)" presence="green" onClick={() => go('/chat')} />
        <DMItem name="Tony M." initials="T" gradient="linear-gradient(135deg,#E67E22,#F39C12)" presence="green" badge={2} onClick={() => go('/chat')} />
        <DMItem name="Alex R." initials="A" gradient="linear-gradient(135deg,#27AE60,#1ABC9C)" presence="amber" onClick={() => go('/chat')} />
      </div>

      {/* ── User footer ───────────────────────────── */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg,#6C47FF,#9B59B6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 600, color: '#fff', flexShrink: 0,
          }}>
            {userInitials}
          </div>
          <span style={{ position: 'absolute', bottom: -1, right: -1 }}>
            <Presence color="green" />
          </span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>{userName}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)' }}>Active now</div>
        </div>
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 4, borderRadius: 6, fontSize: 14 }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#fff')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)')}
        >
          {theme === 'dark' ? '☀' : '🌙'}
        </button>
      </div>
    </aside>
  )
}
