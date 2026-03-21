'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, LayoutGrid, FileText, MessageSquare, Code2, Activity,
  Package, ArrowRight, Hash, DollarSign, Users, Receipt, Target,
  Map, Shield, Sparkles, Zap, Settings, LogOut, Sun, Moon,
} from 'lucide-react'
import { useUIStore, useTheme } from '@/lib/stores/ui'
import { useAuthStore } from '@/lib/stores/auth'
import { cn } from '@/lib/utils'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  action: () => void
  category: string
  keywords?: string
}

export function CommandPalette() {
  const router = useRouter()
  const { commandPaletteOpen, setCommandPaletteOpen, toggleTheme } = useUIStore()
  const theme = useTheme()
  const { logout } = useAuthStore()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const allCommands: CommandItem[] = [
    // ── Navigate ────────────────────────────────────────────────
    { id: 'nav-home',        label: 'Go to Home',        description: 'Main dashboard',               icon: <LayoutGrid size={16} />,   action: () => router.push('/home'),        category: 'Navigate' },
    { id: 'nav-chat',        label: 'Go to Chat',        description: 'Messages and channels',        icon: <MessageSquare size={16} />, action: () => router.push('/chat'),       category: 'Navigate' },
    { id: 'nav-projects',    label: 'Go to Projects',    description: 'Project management',           icon: <Hash size={16} />,          action: () => router.push('/projects'),   category: 'Navigate' },
    { id: 'nav-crm',         label: 'Go to CRM',         description: 'Pipeline and deals',           icon: <Target size={16} />,        action: () => router.push('/crm'),        category: 'Navigate' },
    { id: 'nav-finance',     label: 'Go to Finance',     description: 'P&L, invoices, journal',       icon: <DollarSign size={16} />,    action: () => router.push('/finance'),    category: 'Navigate' },
    { id: 'nav-ops',         label: 'Go to Ops',         description: 'Inventory and ERP',            icon: <Package size={16} />,       action: () => router.push('/ops'),        category: 'Navigate' },
    { id: 'nav-hr',          label: 'Go to HR',          description: 'Employees, leave, payroll',    icon: <Users size={16} />,         action: () => router.push('/hr'),         category: 'Navigate' },
    { id: 'nav-expenses',    label: 'Go to Expenses',    description: 'Expense reports',              icon: <Receipt size={16} />,       action: () => router.push('/expenses'),   category: 'Navigate' },
    { id: 'nav-docs',        label: 'Go to Docs',        description: 'Documentation editor',         icon: <FileText size={16} />,      action: () => router.push('/docs'),       category: 'Navigate' },
    { id: 'nav-code',        label: 'Go to Code',        description: 'Deployments and PRs',          icon: <Code2 size={16} />,         action: () => router.push('/code'),       category: 'Navigate' },
    { id: 'nav-observe',     label: 'Go to Observe',     description: 'Metrics and monitoring',       icon: <Activity size={16} />,      action: () => router.push('/observe'),    category: 'Navigate' },
    { id: 'nav-ai',          label: 'Go to AI Assistant', description: 'Business intelligence',       icon: <Sparkles size={16} />,      action: () => router.push('/ai'),         category: 'Navigate' },
    { id: 'nav-automations', label: 'Go to Automations', description: 'Workflow builder',             icon: <Zap size={16} />,           action: () => router.push('/automations'), category: 'Navigate' },
    { id: 'nav-roadmap',     label: 'Go to Roadmap',     description: 'Feature gap analysis',         icon: <Map size={16} />,           action: () => router.push('/roadmap'),    category: 'Navigate' },
    { id: 'nav-admin',       label: 'Go to Admin',       description: 'Tenant and billing management',icon: <Shield size={16} />,        action: () => router.push('/admin'),      category: 'Navigate' },
    { id: 'nav-settings',    label: 'Go to Settings',    description: 'Organization settings',        icon: <Settings size={16} />,      action: () => router.push('/settings'),   category: 'Navigate' },
    // ── Create ──────────────────────────────────────────────────
    { id: 'create-project',  label: 'New Project',       description: 'Create a new project',         icon: <Hash size={16} />,          action: () => router.push('/projects'),   category: 'Create', keywords: 'add project' },
    { id: 'create-issue',    label: 'New Issue',         description: 'Create a task or bug',         icon: <Hash size={16} />,          action: () => router.push('/projects'),   category: 'Create', keywords: 'add task bug' },
    { id: 'create-invoice',  label: 'New Invoice',       description: 'Create a draft invoice',       icon: <Receipt size={16} />,       action: () => router.push('/finance'),    category: 'Create', keywords: 'bill payment' },
    { id: 'create-deal',     label: 'New CRM Deal',      description: 'Add a deal to the pipeline',   icon: <Target size={16} />,        action: () => router.push('/crm'),        category: 'Create', keywords: 'lead sale' },
    { id: 'create-expense',  label: 'New Expense',       description: 'Submit an expense report',     icon: <Receipt size={16} />,       action: () => router.push('/expenses'),   category: 'Create', keywords: 'report cost' },
    { id: 'create-doc',      label: 'New Document',      description: 'Create a new doc or page',     icon: <FileText size={16} />,      action: () => router.push('/docs'),       category: 'Create', keywords: 'wiki page note' },
    { id: 'create-channel',  label: 'New Channel',       description: 'Create a chat channel',        icon: <MessageSquare size={16} />, action: () => router.push('/chat'),       category: 'Create', keywords: 'slack message' },
    { id: 'create-automation', label: 'New Automation',  description: 'Build a workflow rule',        icon: <Zap size={16} />,           action: () => router.push('/automations'), category: 'Create', keywords: 'workflow rule trigger' },
    // ── Actions ─────────────────────────────────────────────────
    { id: 'toggle-theme',    label: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode', description: 'Toggle color scheme', icon: theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />, action: toggleTheme, category: 'Actions' },
    { id: 'logout',          label: 'Sign Out',          description: 'Log out of VYNE',              icon: <LogOut size={16} />,        action: () => { logout(); router.push('/login') }, category: 'Actions' },
  ]

  const filtered = query
    ? allCommands.filter((cmd) => {
        const q = query.toLowerCase()
        return (
          cmd.label.toLowerCase().includes(q) ||
          (cmd.description?.toLowerCase().includes(q) ?? false) ||
          (cmd.keywords?.toLowerCase().includes(q) ?? false)
        )
      })
    : allCommands

  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = []
    acc[cmd.category].push(cmd)
    return acc
  }, {})

  useEffect(() => { setSelectedIndex(0) }, [query])

  useEffect(() => {
    if (commandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
    }
  }, [commandPaletteOpen])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(!commandPaletteOpen)
      }
      if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false)
      }
    }
    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [commandPaletteOpen, setCommandPaletteOpen])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && filtered[selectedIndex]) { filtered[selectedIndex].action(); setCommandPaletteOpen(false) }
  }

  function runCommand(cmd: CommandItem) {
    cmd.action()
    setCommandPaletteOpen(false)
  }

  const flatFiltered = Object.values(grouped).flat()

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setCommandPaletteOpen(false)}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed top-[18vh] left-1/2 -translate-x-1/2 z-50 w-full max-w-[580px] rounded-xl overflow-hidden"
            style={{
              background: '#1C1C2E',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(108,71,255,0.15)',
            }}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <Search size={16} style={{ color: '#6B6B8A', flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search pages, actions, create…"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-[#4A4A6A] focus:outline-none"
              />
              {query.length > 0 && (
                <button
                  onClick={() => setQuery('')}
                  style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 4, padding: '2px 6px', color: '#6B6B8A', cursor: 'pointer', fontSize: 11 }}
                >
                  Clear
                </button>
              )}
              <kbd className="text-xs px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)', color: '#6B6B8A', fontFamily: 'var(--font-geist-mono)' }}>
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[400px] overflow-y-auto content-scroll py-2">
              {flatFiltered.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm" style={{ color: '#6B6B8A' }}>
                  No results for &quot;{query}&quot;
                </div>
              ) : (
                Object.entries(grouped).map(([category, items]) => (
                  <div key={category}>
                    <div className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: '#4A4A6A' }}>
                      {category}
                    </div>
                    {items.map((cmd) => {
                      const globalIndex = flatFiltered.indexOf(cmd)
                      const isSelected = globalIndex === selectedIndex
                      return (
                        <button
                          key={cmd.id}
                          onClick={() => runCommand(cmd)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={cn('w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left')}
                          style={{ background: isSelected ? 'rgba(108,71,255,0.15)' : 'transparent', color: isSelected ? '#FFFFFF' : '#A0A0B8' }}
                        >
                          <span className="flex-shrink-0" style={{ color: isSelected ? '#8B6BFF' : '#6B6B8A' }}>
                            {cmd.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{cmd.label}</div>
                            {cmd.description && (
                              <div className="text-xs truncate" style={{ color: '#6B6B8A' }}>{cmd.description}</div>
                            )}
                          </div>
                          {isSelected && <ArrowRight size={14} style={{ color: '#6C47FF', flexShrink: 0 }} />}
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-4 px-4 py-2.5 text-xs" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: '#4A4A6A' }}>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.08)', fontFamily: 'var(--font-geist-mono)' }}>↑↓</kbd>
                {' '}Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.08)', fontFamily: 'var(--font-geist-mono)' }}>↵</kbd>
                {' '}Select
              </span>
              <span className="flex items-center gap-1 ml-auto">
                <kbd className="px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.08)', fontFamily: 'var(--font-geist-mono)' }}>⌘K</kbd>
                {' '}Toggle
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
