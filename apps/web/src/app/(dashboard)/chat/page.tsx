'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Hash, Lock, Plus, Search, MoreHorizontal, Send, Smile,
  Paperclip, AtSign, X, ChevronDown, MessageSquare, Settings,
  Bold, Italic, Code, Sparkles, Zap, Clock,
} from 'lucide-react'
import { getInitials, stringToColor, formatRelativeTime } from '@/lib/utils'
import { useChannels, useMessages } from '@/hooks/useMessages'
import type { MsgMessage } from '@/lib/api/client'

// ─── Constants ────────────────────────────────────────────────────
const COMMON_EMOJIS = ['👍', '👎', '🎉', '🚀', '❤️', '🔥', '✅', '❌', '😂', '🤔', '😍', '💯', '👀', '🙏', '💪', '🎯', '⚡', '🐛', '💡', '🔔']

const PRESENCE_COLORS: Record<string, string> = {
  online: '#22C55E', away: '#F59E0B', offline: '#6B6B8A',
}

// ─── Slash commands ────────────────────────────────────────────────
type SlashCmd = { cmd: string; args: string; icon: string; desc: string; category: string }

const SLASH_COMMANDS: SlashCmd[] = [
  { cmd: 'approve-order', args: '<order-id>', icon: '✅', desc: 'Approve a purchase or sales order', category: 'ERP' },
  { cmd: 'create-task',   args: '<title>',    icon: '📋', desc: 'Create a task in the active project', category: 'Projects' },
  { cmd: 'stock-check',   args: '<sku>',      icon: '📦', desc: 'Check inventory levels for a SKU', category: 'ERP' },
  { cmd: 'invoice',       args: '<contact>',  icon: '🧾', desc: 'Create a draft invoice for a contact', category: 'Finance' },
  { cmd: 'assign-lead',   args: '<name>',     icon: '🎯', desc: 'Assign a CRM lead to yourself', category: 'CRM' },
  { cmd: 'poll',          args: '<question>', icon: '📊', desc: 'Create a quick poll in this channel', category: 'Chat' },
  { cmd: 'remind',        args: '<time> <message>', icon: '⏰', desc: 'Set a reminder for yourself', category: 'Chat' },
  { cmd: 'summarize',     args: '',           icon: '🧠', desc: 'AI-summarize recent messages', category: 'AI' },
]

interface LocalMsg {
  id: string
  cmd: string
  args: string
  ts: string
  pollVotes?: Record<string, number>
  pollVoted?: boolean
}

// Per-command output helpers
function stockStatus(qty: number): string {
  if (qty > 50) return 'In Stock'
  if (qty > 10) return 'Low Stock'
  return 'Critical'
}
function stockColor(qty: number): string {
  if (qty > 50) return '#065F46'
  if (qty > 10) return '#92400E'
  return '#991B1B'
}
function stockBg(qty: number): string {
  if (qty > 50) return '#F0FFF4'
  if (qty > 10) return '#FFFBEB'
  return '#FFF1F2'
}

function ApproveOrderCard({ args }: Readonly<{ args: string }>) {
  const id = args || 'ORD-1042'
  return (
    <div style={{ background: '#F0FFF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 14 }}>✅</span>
        <span style={{ fontWeight: 600, fontSize: 12, color: '#065F46' }}>Order Approved</span>
      </div>
      <p style={{ fontSize: 12, color: '#047857', margin: 0 }}>
        Purchase order <strong>{id}</strong> has been approved and sent to the supplier. A notification was emailed to the vendor.
      </p>
    </div>
  )
}

function CreateTaskCard({ args }: Readonly<{ args: string }>) {
  const title = args || 'New Task'
  return (
    <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 14 }}>📋</span>
        <span style={{ fontWeight: 600, fontSize: 12, color: '#3730A3' }}>Task Created</span>
      </div>
      <p style={{ fontSize: 12, color: '#4338CA', margin: 0 }}>
        Task <strong>&quot;{title}&quot;</strong> added to the active sprint. Assigned to you · Due in 7 days
      </p>
    </div>
  )
}

function StockCheckCard({ args }: Readonly<{ args: string }>) {
  const sku = args || 'SKU-001'
  const qty = Math.floor(Math.random() * 200) + 10
  const status = stockStatus(qty)
  const color = stockColor(qty)
  const bg = stockBg(qty)
  return (
    <div style={{ background: bg, border: `1px solid ${color}30`, borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>📦</span>
          <span style={{ fontWeight: 600, fontSize: 12, color }}>Inventory: {sku}</span>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}18`, padding: '2px 8px', borderRadius: 20 }}>{status}</span>
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 12, color }}>
        <span>On hand: <strong>{qty} units</strong></span>
        <span>Reserved: <strong>{Math.floor(qty * 0.2)}</strong></span>
        <span>Available: <strong>{Math.floor(qty * 0.8)}</strong></span>
      </div>
    </div>
  )
}

function InvoiceCard({ args }: Readonly<{ args: string }>) {
  const contact = args || 'Acme Corp'
  const invNum = `INV-${2000 + Math.floor(Math.random() * 100)}`
  return (
    <div style={{ background: '#FEFCE8', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 14 }}>🧾</span>
        <span style={{ fontWeight: 600, fontSize: 12, color: '#78350F' }}>Draft Invoice Created</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#92400E' }}>
        <span>{invNum} for <strong>{contact}</strong> created as draft.</span>
        <button style={{ fontSize: 11, color: '#6C47FF', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 500, padding: 0 }}>
          Open in Finance →
        </button>
      </div>
    </div>
  )
}

function AssignLeadCard({ args }: Readonly<{ args: string }>) {
  const name = args || 'New Lead'
  return (
    <div style={{ background: '#FDF4FF', border: '1px solid #E9D5FF', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 14 }}>🎯</span>
        <span style={{ fontWeight: 600, fontSize: 12, color: '#6B21A8' }}>Lead Assigned</span>
      </div>
      <p style={{ fontSize: 12, color: '#7E22CE', margin: 0 }}>
        Lead <strong>&quot;{name}&quot;</strong> assigned to you in CRM. Stage: Qualified · Follow-up due tomorrow
      </p>
    </div>
  )
}

function RemindCard({ args }: Readonly<{ args: string }>) {
  const parts = args.split(' ')
  const time = parts[0] || 'tomorrow'
  const reminder = parts.slice(1).join(' ') || 'Follow up'
  return (
    <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 14 }}>⏰</span>
        <span style={{ fontWeight: 600, fontSize: 12, color: '#0C4A6E' }}>Reminder Set</span>
      </div>
      <p style={{ fontSize: 12, color: '#0369A1', margin: 0 }}>
        I&apos;ll remind you <strong>{time}</strong>: &quot;{reminder}&quot;
      </p>
    </div>
  )
}

function PollCard({ msg, onVote }: Readonly<{ msg: LocalMsg; onVote?: (opt: string) => void }>) {
  const question = msg.args.trim() || 'Vote on this'
  const opts = ['Yes 👍', 'No 👎', 'Maybe 🤔']
  const votes = msg.pollVotes ?? { 'Yes 👍': 3, 'No 👎': 1, 'Maybe 🤔': 2 }
  const total = Object.values(votes).reduce((s, v) => s + v, 0)
  return (
    <div style={{ background: '#F8FAFF', border: '1px solid #D8DFF0', borderRadius: 8, padding: '12px 14px', minWidth: 260 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 14 }}>📊</span>
        <span style={{ fontWeight: 600, fontSize: 13, color: '#1A1A2E' }}>{question}</span>
      </div>
      {opts.map((opt) => {
        const pct = total > 0 ? Math.round((votes[opt] ?? 0) / total * 100) : 0
        return (
          <button
            key={opt}
            onClick={() => onVote?.(opt)}
            disabled={msg.pollVoted}
            style={{ width: '100%', marginBottom: 6, padding: '6px 10px', borderRadius: 6, border: '1px solid #E0E0F0', background: '#fff', cursor: msg.pollVoted ? 'default' : 'pointer', textAlign: 'left' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#1A1A2E', marginBottom: 4 }}>
                <span>{opt}</span>
                <span style={{ color: '#6B6B8A' }}>{votes[opt] ?? 0} · {pct}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: '#E8E8F0', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: '#6C47FF', borderRadius: 2, transition: 'width 0.3s' }} />
              </div>
            </button>
          )
        })}
        <p style={{ fontSize: 10, color: '#A0A0B8', margin: '6px 0 0' }}>{total} votes · Closes in 24h</p>
      </div>
    )
}

function cmdOutput(msg: LocalMsg, onVote?: (opt: string) => void): React.ReactNode {
  if (msg.cmd === 'approve-order') return <ApproveOrderCard args={msg.args.trim()} />
  if (msg.cmd === 'create-task')   return <CreateTaskCard args={msg.args.trim()} />
  if (msg.cmd === 'stock-check')   return <StockCheckCard args={msg.args.trim()} />
  if (msg.cmd === 'invoice')       return <InvoiceCard args={msg.args.trim()} />
  if (msg.cmd === 'assign-lead')   return <AssignLeadCard args={msg.args.trim()} />
  if (msg.cmd === 'remind')        return <RemindCard args={msg.args.trim()} />
  if (msg.cmd === 'poll')          return <PollCard msg={msg} onVote={onVote} />
  if (msg.cmd === 'summarize')     return null
  return <span style={{ fontSize: 12, color: '#6B6B8A' }}>Command /{msg.cmd} executed.</span>
}

// ─── AI Summary panel ─────────────────────────────────────────────
const SUMMARY_LINES = [
  'The team discussed the Q2 roadmap priorities and agreed to move the billing integration to the next sprint.',
  'Preet confirmed that the API gateway deployment is blocked on DevOps approvals — ETA Thursday.',
  'A decision was made to onboard Acme Corp as a pilot customer. Sarah will prepare the contract.',
  'The mobile app v2 scope was trimmed to focus on ERP and Finance screens only.',
]
const SUMMARY_ACTIONS = [
  { text: 'Preet to follow up with DevOps re: API gateway by Thursday', done: false },
  { text: 'Sarah to send Acme Corp contract draft', done: false },
  { text: 'Update sprint board with revised billing integration scope', done: true },
]

function SummaryPanel({ onClose }: Readonly<{ onClose: () => void }>) {
  const [visible, setVisible] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setVisible((v) => Math.min(v + 1, SUMMARY_LINES.length + SUMMARY_ACTIONS.length)), 400)
    return () => clearInterval(t)
  }, [])
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      style={{ position: 'absolute', bottom: 70, left: 16, right: 16, zIndex: 40, background: '#fff', border: '1px solid #E0D5FF', borderRadius: 12, boxShadow: '0 8px 32px rgba(108,71,255,0.15)', padding: 16 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Sparkles size={15} style={{ color: '#6C47FF' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>AI Thread Summary</span>
          <span style={{ fontSize: 10, color: '#6C47FF', background: 'rgba(108,71,255,0.1)', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>BETA</span>
        </div>
        <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#A0A0B8', display: 'flex', padding: 4, borderRadius: 5 }}>
          <X size={14} />
        </button>
      </div>
      <div style={{ marginBottom: 12 }}>
        {SUMMARY_LINES.map((line, i) => (
          visible > i && (
            <p key={line.slice(0, 20)} style={{ fontSize: 12, color: '#2D2D4E', lineHeight: 1.6, margin: '0 0 6px' }}>• {line}</p>
          )
        ))}
      </div>
      {visible > SUMMARY_LINES.length && (
        <div style={{ borderTop: '1px solid #F0F0F8', paddingTop: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#6B6B8A', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Action Items</p>
          {SUMMARY_ACTIONS.map((act, i) => (
            visible > SUMMARY_LINES.length + i && (
              <div key={act.text.slice(0, 20)} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 5 }}>
                <span style={{ fontSize: 12, marginTop: 1 }}>{act.done ? '✅' : '⬜'}</span>
                <span style={{ fontSize: 12, color: act.done ? '#A0A0B8' : '#1A1A2E', textDecoration: act.done ? 'line-through' : 'none' }}>{act.text}</span>
              </div>
            )
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ─── Slash command menu ────────────────────────────────────────────
function SlashCommandMenu({
  query, onSelect, onClose,
}: Readonly<{ query: string; onSelect: (c: SlashCmd) => void; onClose: () => void }>) {
  const [activeIdx, setActiveIdx] = useState(0)
  const filtered = SLASH_COMMANDS.filter((c) => c.cmd.startsWith(query.replace(/^\//, '')))

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)) }
      else if (e.key === 'Enter' && filtered[activeIdx]) { e.preventDefault(); e.stopPropagation(); onSelect(filtered[activeIdx]) }
      else if (e.key === 'Escape') onClose()
    }
    globalThis.addEventListener('keydown', handler, true)
    return () => globalThis.removeEventListener('keydown', handler, true)
  }, [filtered, activeIdx, onSelect, onClose])

  if (filtered.length === 0) return null

  return (
    <div style={{
      position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 50,
      background: '#fff', border: '1px solid #E8E8F0', borderRadius: 10,
      boxShadow: '0 -4px 24px rgba(0,0,0,0.1)', padding: '6px 6px',
      maxHeight: 280, overflowY: 'auto',
    }}>
      <p style={{ fontSize: 10, fontWeight: 600, color: '#A0A0B8', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 4px 6px', padding: '2px 4px' }}>Slash commands</p>
      {filtered.map((c, i) => (
        <button
          key={c.cmd}
          onMouseDown={(e) => { e.preventDefault(); onSelect(c) }}
          onMouseEnter={() => setActiveIdx(i)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '7px 8px', borderRadius: 7, border: 'none', cursor: 'pointer', textAlign: 'left',
            background: i === activeIdx ? 'rgba(108,71,255,0.08)' : 'transparent',
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>{c.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A2E' }}>/{c.cmd}</span>
              {c.args && <span style={{ fontSize: 11, color: '#A0A0B8' }}>{c.args}</span>}
              <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, color: '#6C47FF', background: 'rgba(108,71,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>{c.category}</span>
            </div>
            <p style={{ fontSize: 11, color: '#6B6B8A', margin: 0, lineHeight: 1.4 }}>{c.desc}</p>
          </div>
        </button>
      ))}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────
function PresenceDot({ status }: Readonly<{ status?: string }>) {
  return (
    <span style={{
      width: 8, height: 8, borderRadius: '50%', flexShrink: 0, display: 'inline-block',
      background: PRESENCE_COLORS[status ?? 'offline'] ?? '#6B6B8A',
      border: '1.5px solid #FAFAFE',
    }} />
  )
}

function UserAvatar({ name, size = 32 }: Readonly<{ name: string; size?: number }>) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: stringToColor(name),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.34, fontWeight: 600, color: '#fff',
    }}>
      {getInitials(name)}
    </div>
  )
}

function EmojiPicker({ onPick, onClose }: Readonly<{ onPick: (e: string) => void; onClose: () => void }>) {
  return (
    <div
      role="menu"
      aria-label="Emoji picker"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      tabIndex={-1}
      style={{
        position: 'absolute', bottom: '100%', right: 0, zIndex: 50,
        background: '#fff', border: '1px solid #E8E8F0', borderRadius: 10,
        padding: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2,
      }}
      onMouseLeave={onClose}
    >
      {COMMON_EMOJIS.map((e) => (
        <button
          key={e}
          onClick={() => { onPick(e); onClose() }}
          style={{ fontSize: 18, padding: '4px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', lineHeight: 1 }}
          onMouseEnter={(ev) => { (ev.currentTarget as HTMLElement).style.background = '#F0F0F8' }}
          onMouseLeave={(ev) => { (ev.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          {e}
        </button>
      ))}
    </div>
  )
}

// ─── Message row ─────────────────────────────────────────────────
function MessageRow({
  msg, prevMsg, onReaction, onReply, isCurrentUser,
}: Readonly<{
  msg: MsgMessage
  prevMsg?: MsgMessage
  onReaction: (msgId: string, emoji: string) => void
  onReply: (msg: MsgMessage) => void
  isCurrentUser: boolean
}>) {
  const [hovering, setHovering] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const sameAuthor = prevMsg?.author.id === msg.author.id &&
    (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) < 300000

  return (
    <article
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setEmojiOpen(false) }}
      style={{
        display: 'flex', gap: 10, padding: '2px 0',
        paddingTop: sameAuthor ? 0 : 12,
        position: 'relative',
      }}
    >
      {/* Avatar / spacer */}
      <div style={{ width: 36, flexShrink: 0 }}>
        {!sameAuthor && <UserAvatar name={msg.author.name} size={34} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {!sameAuthor && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: isCurrentUser ? '#6C47FF' : '#1A1A2E' }}>
              {msg.author.name}
            </span>
            <span style={{ fontSize: 11, color: '#A0A0B8' }}>{formatRelativeTime(msg.createdAt)}</span>
          </div>
        )}

        <p style={{ fontSize: 13, color: '#2D2D4E', lineHeight: 1.6, margin: 0, wordBreak: 'break-word' }}>
          {msg.content}
        </p>

        {/* Reactions */}
        {msg.reactions && msg.reactions.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
            {msg.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onReaction(msg.id, r.emoji)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '2px 8px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                  background: r.userReacted ? 'rgba(108,71,255,0.1)' : '#F0F0F8',
                  border: r.userReacted ? '1px solid rgba(108,71,255,0.35)' : '1px solid #E8E8F0',
                  color: r.userReacted ? '#6C47FF' : '#6B6B8A',
                }}
              >
                {r.emoji} <span style={{ fontWeight: 600 }}>{r.count}</span>
              </button>
            ))}
            <button
              onClick={() => setEmojiOpen(true)}
              style={{ padding: '2px 6px', borderRadius: 20, border: '1px dashed #E8E8F0', background: 'transparent', cursor: 'pointer', color: '#A0A0B8', fontSize: 12 }}
            >
              +
            </button>
          </div>
        )}

        {/* Reply count */}
        {(msg.replyCount ?? 0) > 0 && (
          <button
            onClick={() => onReply(msg)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, padding: '3px 8px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#6C47FF', fontSize: 11, fontWeight: 500 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(108,71,255,0.07)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <MessageSquare size={11} />
            {msg.replyCount} {msg.replyCount === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>

      {/* Hover actions */}
      <AnimatePresence>
        {hovering && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.1 }}
            style={{
              position: 'absolute', right: 0, top: -4,
              display: 'flex', gap: 2, background: '#fff',
              border: '1px solid #E8E8F0', borderRadius: 8, padding: '3px 4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)', zIndex: 10,
            }}
          >
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setEmojiOpen(!emojiOpen)}
                title="React"
                style={{ padding: '4px 6px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#6B6B8A', display: 'flex', alignItems: 'center' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F0F0F8'; (e.currentTarget as HTMLElement).style.color = '#6C47FF' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6B6B8A' }}
              >
                <Smile size={13} />
              </button>
              {emojiOpen && (
                <EmojiPicker
                  onPick={(e) => onReaction(msg.id, e)}
                  onClose={() => setEmojiOpen(false)}
                />
              )}
            </div>
            <button
              onClick={() => onReply(msg)}
              title="Reply in thread"
              style={{ padding: '4px 6px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#6B6B8A', display: 'flex', alignItems: 'center' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F0F0F8'; (e.currentTarget as HTMLElement).style.color = '#6C47FF' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6B6B8A' }}
            >
              <MessageSquare size={13} />
            </button>
            <button
              title="More"
              style={{ padding: '4px 6px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#6B6B8A', display: 'flex', alignItems: 'center' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F0F0F8' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <MoreHorizontal size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  )
}

// ─── Message composer ─────────────────────────────────────────────
const SCHEDULE_OPTS = ['In 1 hour', 'Tomorrow 9am', 'Monday 9am', 'Next week']

function MessageComposer({
  placeholder, onSend, onTyping, onCommand,
}: Readonly<{
  placeholder: string
  onSend: (text: string) => void
  onTyping: () => void
  onCommand?: (cmd: string, args: string) => void
}>) {
  const [text, setText] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduledFor, setScheduledFor] = useState<string | null>(null)
  const [slashMenuOpen, setSlashMenuOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isSlash = text.startsWith('/') && !text.includes(' ')

  function submit() {
    if (!text.trim()) return
    const trimmed = text.trim()
    if (trimmed.startsWith('/')) {
      const [rawCmd, ...rest] = trimmed.slice(1).split(' ')
      const cmd = rawCmd.toLowerCase()
      if (cmd === 'summarize') {
        onCommand?.(cmd, '')
      } else {
        onCommand?.(cmd, rest.join(' '))
      }
    } else if (scheduledFor) {
      onSend(`📅 Scheduled for ${scheduledFor}: ${trimmed}`)
      setScheduledFor(null)
    } else {
      onSend(trimmed)
    }
    setText('')
    setSlashMenuOpen(false)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (slashMenuOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter')) return
    if (e.key === 'Escape' && slashMenuOpen) { setSlashMenuOpen(false); return }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setText(val)
    onTyping()
    setSlashMenuOpen(val.startsWith('/') && !val.includes(' '))
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }

  function insertEmoji(emoji: string) {
    setText((t) => t + emoji)
    textareaRef.current?.focus()
  }

  function selectSlashCmd(c: SlashCmd) {
    const filled = c.args ? `/${c.cmd} ` : `/${c.cmd}`
    setText(filled)
    setSlashMenuOpen(false)
    textareaRef.current?.focus()
  }

  const hasText = text.trim().length > 0

  return (
    <div style={{ padding: '12px 16px', borderTop: '1px solid #E8E8F0', flexShrink: 0 }}>
      {scheduledFor && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 11, color: '#6C47FF', background: 'rgba(108,71,255,0.08)', padding: '4px 10px', borderRadius: 6 }}>
          <Clock size={11} />
          Scheduled: {scheduledFor}
          <button onClick={() => setScheduledFor(null)} style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', color: '#6C47FF', display: 'flex', padding: 0 }}>
            <X size={11} />
          </button>
        </div>
      )}
      <div style={{ position: 'relative', border: `1px solid ${isSlash ? '#6C47FF' : '#D8D8E8'}`, borderRadius: 10, background: '#FAFAFE', overflow: 'visible', transition: 'border-color 0.15s' }}>
        {slashMenuOpen && (
          <SlashCommandMenu
            query={text}
            onSelect={selectSlashCmd}
            onClose={() => setSlashMenuOpen(false)}
          />
        )}
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 2, padding: '6px 10px', borderBottom: '1px solid #F0F0F8' }}>
          {[
            { icon: <Bold size={13} />, title: 'Bold', action: () => setText((t) => `**${t}**`) },
            { icon: <Italic size={13} />, title: 'Italic', action: () => setText((t) => `_${t}_`) },
            { icon: <Code size={13} />, title: 'Code', action: () => setText((t) => `\`${t}\``) },
            { icon: <Zap size={13} />, title: 'Slash command', action: () => { setText('/'); setSlashMenuOpen(true); textareaRef.current?.focus() } },
          ].map(({ icon, title, action }) => (
            <button
              key={title}
              onClick={action}
              title={title}
              style={{ padding: '3px 6px', borderRadius: 5, border: 'none', background: 'transparent', cursor: 'pointer', color: '#A0A0B8', display: 'flex', alignItems: 'center' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#EEEEF8'; (e.currentTarget as HTMLElement).style.color = '#6C47FF' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#A0A0B8' }}
            >
              {icon}
            </button>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          style={{
            width: '100%', padding: '10px 12px', background: 'transparent',
            border: 'none', outline: 'none', resize: 'none', fontSize: 13,
            color: '#1A1A2E', lineHeight: 1.6, fontFamily: 'Inter, system-ui',
            maxHeight: 180, boxSizing: 'border-box',
          }}
        />

        {/* Bottom toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '6px 10px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 2, position: 'relative' }}>
            <button
              title="Attach file"
              style={{ padding: '4px 6px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#A0A0B8', display: 'flex' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#6C47FF' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#A0A0B8' }}
            >
              <Paperclip size={15} />
            </button>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setEmojiOpen(!emojiOpen)}
                title="Emoji"
                style={{ padding: '4px 6px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#A0A0B8', display: 'flex' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#6C47FF' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#A0A0B8' }}
              >
                <Smile size={15} />
              </button>
              {emojiOpen && <EmojiPicker onPick={insertEmoji} onClose={() => setEmojiOpen(false)} />}
            </div>
            <button
              title="Mention"
              style={{ padding: '4px 6px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#A0A0B8', display: 'flex' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#6C47FF' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#A0A0B8' }}
            >
              <AtSign size={15} />
            </button>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setScheduleOpen(!scheduleOpen)}
                title="Schedule send"
                style={{ padding: '4px 6px', borderRadius: 6, border: 'none', background: scheduleOpen ? 'rgba(108,71,255,0.1)' : 'transparent', cursor: 'pointer', color: scheduleOpen ? '#6C47FF' : '#A0A0B8', display: 'flex' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#6C47FF' }}
                onMouseLeave={(e) => { if (!scheduleOpen) (e.currentTarget as HTMLElement).style.color = '#A0A0B8' }}
              >
                <Clock size={15} />
              </button>
              {scheduleOpen && (
                <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, background: '#fff', border: '1px solid #E8E8F0', borderRadius: 8, padding: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 150, zIndex: 50 }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: '#A0A0B8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 4px 5px' }}>Schedule send</p>
                  {SCHEDULE_OPTS.map((opt) => (
                    <button
                      key={opt}
                      onMouseDown={() => { setScheduledFor(opt); setScheduleOpen(false) }}
                      style={{ width: '100%', padding: '5px 8px', borderRadius: 5, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#1A1A2E', textAlign: 'left' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F0F0F8' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={submit}
            disabled={!hasText}
            style={{
              padding: '5px 10px', borderRadius: 7, border: 'none', cursor: hasText ? 'pointer' : 'default',
              background: hasText ? '#6C47FF' : '#E8E8F0',
              color: hasText ? '#fff' : '#A0A0B8',
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, transition: 'all 0.1s',
            }}
          >
            <Send size={13} /> {scheduledFor ? 'Schedule' : 'Send'}
          </button>
        </div>
      </div>
      <p style={{ fontSize: 10, color: '#C0C0D8', marginTop: 4, paddingLeft: 2 }}>
        Enter to send · Shift+Enter for new line · Type / for commands
      </p>
    </div>
  )
}

// ─── Thread panel ─────────────────────────────────────────────────
function ThreadPanel({
  parentMsg, onClose,
}: Readonly<{ parentMsg: MsgMessage; onClose: () => void }>) {
  const { messages, sendMessage, sendTyping, typingUsers } = useMessages(
    parentMsg.channelId ?? null, false
  )
  const replies = messages.filter((m) => m.parentMessageId === parentMsg.id)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [replies.length])

  return (
    <motion.div
      initial={{ x: 360 }}
      animate={{ x: 0 }}
      exit={{ x: 360 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        width: 360, minWidth: 360, borderLeft: '1px solid #E8E8F0',
        display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #E8E8F0', flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>Thread</span>
        <button
          onClick={onClose}
          style={{ padding: 4, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#A0A0B8', display: 'flex' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F0F0F8' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Parent message */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #F0F0F8', flexShrink: 0, background: '#FAFAFE' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <UserAvatar name={parentMsg.author.name} size={30} />
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 3 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A2E' }}>{parentMsg.author.name}</span>
              <span style={{ fontSize: 10, color: '#A0A0B8' }}>{formatRelativeTime(parentMsg.createdAt)}</span>
            </div>
            <p style={{ fontSize: 12, color: '#4A4A6A', lineHeight: 1.5, margin: 0 }}>{parentMsg.content}</p>
          </div>
        </div>
        {replies.length > 0 && (
          <p style={{ fontSize: 11, color: '#6C47FF', marginTop: 8, paddingLeft: 40 }}>{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</p>
        )}
      </div>

      {/* Replies */}
      <div className="content-scroll" style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {replies.map((r, i) => (
          <MessageRow
            key={r.id}
            msg={r}
            prevMsg={replies[i - 1]}
            onReaction={() => {}}
            onReply={() => {}}
            isCurrentUser={r.author.id === 'me'}
          />
        ))}
        {replies.length === 0 && (
          <p style={{ fontSize: 12, color: '#A0A0B8', textAlign: 'center', padding: '24px 0' }}>No replies yet. Start a thread!</p>
        )}
        {typingUsers.length > 0 && (
          <p style={{ fontSize: 11, color: '#A0A0B8', fontStyle: 'italic' }}>{typingUsers[0].name} is typing…</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply composer */}
      <MessageComposer
        placeholder="Reply in thread…"
        onSend={(text) => sendMessage(text, parentMsg.id)}
        onTyping={sendTyping}
      />
    </motion.div>
  )
}

// ─── Create Channel modal ─────────────────────────────────────────
function CreateChannelModal({
  onClose, onCreate,
}: Readonly<{ onClose: () => void; onCreate: (name: string, desc: string, priv: boolean) => void }>) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)

  const slug = name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replaceAll(/^-+|-+$/g, '')

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{ background: '#fff', borderRadius: 14, width: 440, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A2E' }}>Create a channel</span>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#A0A0B8', display: 'flex', borderRadius: 6, padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: 12, color: '#6B6B8A', marginBottom: 16 }}>Channels are where your team communicates. Best when organized around a topic.</p>

        <div style={{ marginBottom: 14 }}>
          <label htmlFor="channel-name" style={{ fontSize: 11, fontWeight: 600, color: '#6B6B8A', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Name</label>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #D8D8E8', borderRadius: 8, overflow: 'hidden', background: '#FAFAFE' }}>
            <span style={{ padding: '0 10px', color: '#A0A0B8', fontSize: 13 }}>#</span>
            <input
              id="channel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. marketing"
              style={{ flex: 1, padding: '8px 10px 8px 0', border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#1A1A2E' }}
            />
          </div>
          {slug && slug !== name.toLowerCase() && (
            <p style={{ fontSize: 11, color: '#A0A0B8', marginTop: 4 }}>Channel will be created as #{slug}</p>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label htmlFor="channel-desc" style={{ fontSize: 11, fontWeight: 600, color: '#6B6B8A', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description <span style={{ fontWeight: 400, color: '#C0C0D8' }}>(optional)</span></label>
          <input
            id="channel-desc"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="What is this channel about?"
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #D8D8E8', borderRadius: 8, background: '#FAFAFE', outline: 'none', fontSize: 13, color: '#1A1A2E', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <button
              type="button"
              role="switch"
              aria-checked={isPrivate}
              onClick={() => setIsPrivate(!isPrivate)}
              onKeyDown={(e) => e.key === ' ' && setIsPrivate(!isPrivate)}
              style={{
                width: 36, height: 20, borderRadius: 10, background: isPrivate ? '#6C47FF' : '#D8D8E8',
                position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
                border: 'none', padding: 0,
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 2, left: isPrivate ? 18 : 2, transition: 'left 0.2s',
              }} />
            </button>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A2E' }}>Make private</div>
              <div style={{ fontSize: 11, color: '#A0A0B8' }}>Only invited members can see this channel</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D8D8E8', background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#6B6B8A' }}>
            Cancel
          </button>
          <button
            onClick={() => { if (slug) { onCreate(slug, desc, isPrivate); onClose() } }}
            disabled={!slug}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: slug ? '#6C47FF' : '#E8E8F0', color: slug ? '#fff' : '#A0A0B8', cursor: slug ? 'pointer' : 'default', fontSize: 13, fontWeight: 500 }}
          >
            Create Channel
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Chat area ────────────────────────────────────────────────────
function ChatArea({
  channelId, channelName, isDM, description,
  onOpenThread, threadMsg,
}: Readonly<{
  channelId: string
  channelName: string
  isDM: boolean
  description?: string
  onOpenThread: (msg: MsgMessage) => void
  threadMsg: MsgMessage | null
}>) {
  const { messages, loading, typingUsers, sendMessage, sendTyping, addReaction } = useMessages(channelId, isDM)
  const [cmdMessages, setCmdMessages] = useState<LocalMsg[]>([])
  const [summaryOpen, setSummaryOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevCount = useRef(0)

  // Reset local state when switching channels
  useEffect(() => {
    setCmdMessages([])
    setSummaryOpen(false)
  }, [channelId])

  useEffect(() => {
    if (messages.length !== prevCount.current) {
      bottomRef.current?.scrollIntoView({ behavior: messages.length > 5 ? 'smooth' : 'auto' })
      prevCount.current = messages.length
    }
  }, [messages.length])

  function handleCommand(cmd: string, args: string) {
    if (cmd === 'summarize') {
      setSummaryOpen(true)
      return
    }
    const newMsg: LocalMsg = { id: `cmd-${Date.now()}`, cmd, args, ts: new Date().toISOString(), pollVotes: cmd === 'poll' ? { 'Yes 👍': 3, 'No 👎': 1, 'Maybe 🤔': 2 } : undefined }
    setCmdMessages((prev) => [...prev, newMsg])
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  function handlePollVote(msgId: string, opt: string) {
    setCmdMessages((prev) => prev.map((m) => {
      if (m.id !== msgId || m.pollVoted) return m
      const prev = m.pollVotes ?? {}
      return { ...m, pollVoted: true, pollVotes: { ...prev, [opt]: (prev[opt] ?? 0) + 1 } }
    }))
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid #E8E8F0', flexShrink: 0, gap: 10 }}>
        {isDM ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserAvatar name={channelName} size={28} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E' }}>{channelName}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Hash size={16} style={{ color: '#6B6B8A' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E' }}>{channelName}</span>
            {description && (
              <>
                <span style={{ color: '#E8E8F0', margin: '0 4px' }}>|</span>
                <span style={{ fontSize: 12, color: '#A0A0B8' }}>{description}</span>
              </>
            )}
          </div>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button
            onClick={() => setSummaryOpen((o) => !o)}
            title="AI Summary"
            style={{ padding: '5px 9px', borderRadius: 7, border: summaryOpen ? '1px solid rgba(108,71,255,0.4)' : '1px solid transparent', background: summaryOpen ? 'rgba(108,71,255,0.08)' : 'transparent', cursor: 'pointer', color: summaryOpen ? '#6C47FF' : '#A0A0B8', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500 }}
          >
            <Sparkles size={13} /> Summarize
          </button>
          <button style={{ padding: '5px', borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', color: '#A0A0B8', display: 'flex' }} title="Search">
            <Search size={15} />
          </button>
          <button style={{ padding: '5px', borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', color: '#A0A0B8', display: 'flex' }} title="Settings">
            <Settings size={15} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="content-scroll" style={{ flex: 1, overflowY: 'auto', padding: '8px 18px 0', position: 'relative' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 0' }}>
            {[1,2,3].map((i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F0F0F8', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 12, width: '20%', background: '#F0F0F8', borderRadius: 4, marginBottom: 6 }} />
                  <div style={{ height: 10, width: '70%', background: '#F0F0F8', borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageRow
                key={msg.id}
                msg={msg}
                prevMsg={messages[i - 1]}
                onReaction={addReaction}
                onReply={onOpenThread}
                isCurrentUser={msg.author.id === 'me' || msg.author.name === 'Preet Raval'}
              />
            ))}
            {cmdMessages.map((cm) => (
              <div key={cm.id} style={{ display: 'flex', gap: 10, padding: '10px 0' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(108,71,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Zap size={16} style={{ color: '#6C47FF' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#6C47FF' }}>VYNE Bot</span>
                    <span style={{ fontSize: 10, color: '#A0A0B8' }}>/{cm.cmd} {cm.args}</span>
                  </div>
                  {cmdOutput(cm, (opt) => handlePollVote(cm.id, opt))}
                </div>
              </div>
            ))}
          </>
        )}

        {typingUsers.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', color: '#A0A0B8', fontSize: 11, fontStyle: 'italic' }}>
            <span>{typingUsers.map((u) => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing</span>
            <span style={{ display: 'flex', gap: 2 }}>
              {[0,1,2].map((d) => (
                <motion.span key={d} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: d * 0.2 }}
                  style={{ width: 4, height: 4, borderRadius: '50%', background: '#A0A0B8', display: 'inline-block' }}
                />
              ))}
            </span>
          </div>
        )}
        <div ref={bottomRef} style={{ height: 16 }} />
      </div>

      <div style={{ position: 'relative' }}>
        <AnimatePresence>
          {summaryOpen && <SummaryPanel onClose={() => setSummaryOpen(false)} />}
        </AnimatePresence>
        <MessageComposer
          placeholder={isDM ? `Message ${channelName}` : `Message #${channelName}`}
          onSend={sendMessage}
          onTyping={sendTyping}
          onCommand={handleCommand}
        />
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────
export default function ChatPage() {
  const { channels, dms, createChannel } = useChannels()
  const [selectedId, setSelectedId] = useState<string | null>('1')
  const [isDM, setIsDM] = useState(false)
  const [threadMsg, setThreadMsg] = useState<MsgMessage | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [channelsOpen, setChannelsOpen] = useState(true)
  const [dmsOpen, setDmsOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const channelName = isDM
    ? (dms.find((d) => d.id === selectedId)?.participant.name ?? '')
    : (channels.find((c) => c.id === selectedId)?.name ?? '')

  const channelDescription = isDM
    ? undefined
    : channels.find((c) => c.id === selectedId)?.description

  const filteredChannels = channels.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
  const filteredDMs = dms.filter((d) => d.participant.name.toLowerCase().includes(searchQuery.toLowerCase()))

  function selectChannel(id: string, dm = false) {
    setSelectedId(id)
    setIsDM(dm)
    setThreadMsg(null)
  }

  return (
    <div style={{ display: 'flex', height: '100%', background: '#fff' }}>
      {/* ── Channel sidebar ─────────────────────────────── */}
      <aside style={{ width: 240, minWidth: 240, borderRight: '1px solid #E8E8F0', background: '#FAFAFE', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #E8E8F0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>Messages</span>
            <button
              onClick={() => setCreateModalOpen(true)}
              title="New channel"
              style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#A0A0B8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#EEEEF8'; (e.currentTarget as HTMLElement).style.color = '#6C47FF' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#A0A0B8' }}
            >
              <Plus size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#F0F0F8', border: '1px solid #E8E8F0', borderRadius: 8, padding: '5px 10px' }}>
            <Search size={12} style={{ color: '#A0A0B8', flexShrink: 0 }} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search…"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: '#1A1A2E' }}
            />
          </div>
        </div>

        {/* Channel + DM lists */}
        <div className="sidebar-scroll" style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
          {/* Channels */}
          <div style={{ marginBottom: 4 }}>
            <button
              onClick={() => setChannelsOpen(!channelsOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', color: '#A0A0B8' }}
            >
              <ChevronDown size={12} style={{ transform: channelsOpen ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Channels</span>
            </button>

            <AnimatePresence>
              {channelsOpen && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
                  {filteredChannels.map((ch) => {
                    const isActive = selectedId === ch.id && !isDM
                    let chColor = '#6B6B8A'
                    if (isActive) chColor = '#6C47FF'
                    else if (ch.unreadCount) chColor = '#1A1A2E'
                    return (
                      <button
                        key={ch.id}
                        onClick={() => selectChannel(ch.id, false)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 7,
                          padding: '4px 8px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12,
                          background: isActive ? '#EEF0FF' : 'transparent',
                          color: chColor,
                          fontWeight: ch.unreadCount ? 600 : 400,
                        }}
                        onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#F0F0F8' }}
                        onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      >
                        {ch.isPrivate
                          ? <Lock size={12} style={{ flexShrink: 0, opacity: 0.6 }} />
                          : <Hash size={12} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.5 }} />
                        }
                        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</span>
                        {(ch.unreadCount ?? 0) > 0 && (
                          <span style={{ background: isActive ? '#6C47FF' : '#E8E8F0', color: isActive ? '#fff' : '#6B6B8A', borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 600, minWidth: 18, textAlign: 'center' }}>
                            {ch.unreadCount}
                          </span>
                        )}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setCreateModalOpen(true)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 7, padding: '4px 8px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, background: 'transparent', color: '#A0A0B8' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F0F0F8'; (e.currentTarget as HTMLElement).style.color = '#6C47FF' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#A0A0B8' }}
                  >
                    <Plus size={12} /> Add channel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Direct Messages */}
          <div>
            <button
              onClick={() => setDmsOpen(!dmsOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', color: '#A0A0B8' }}
            >
              <ChevronDown size={12} style={{ transform: dmsOpen ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Direct Messages</span>
            </button>

            <AnimatePresence>
              {dmsOpen && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
                  {filteredDMs.map((dm) => {
                    const isActive = selectedId === dm.id && isDM
                    let dmColor = '#6B6B8A'
                    if (isActive) dmColor = '#6C47FF'
                    else if (dm.unreadCount) dmColor = '#1A1A2E'
                    return (
                      <button
                        key={dm.id}
                        onClick={() => selectChannel(dm.id, true)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 7,
                          padding: '4px 8px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12,
                          background: isActive ? '#EEF0FF' : 'transparent',
                          color: dmColor,
                        }}
                        onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#F0F0F8' }}
                        onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      >
                        <span style={{ position: 'relative', flexShrink: 0 }}>
                          <UserAvatar name={dm.participant.name} size={22} />
                          <span style={{ position: 'absolute', bottom: -1, right: -1 }}>
                            <PresenceDot status={dm.participant.presence} />
                          </span>
                        </span>
                        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: dm.unreadCount ? 600 : 400 }}>
                          {dm.participant.name}
                        </span>
                        {(dm.unreadCount ?? 0) > 0 && (
                          <span style={{ background: '#6C47FF', color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 600, minWidth: 18, textAlign: 'center' }}>
                            {dm.unreadCount}
                          </span>
                        )}
                      </button>
                    )
                  })}
                  <button
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 7, padding: '4px 8px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, background: 'transparent', color: '#A0A0B8' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F0F0F8'; (e.currentTarget as HTMLElement).style.color = '#6C47FF' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#A0A0B8' }}
                  >
                    <Plus size={12} /> New message
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────────── */}
      {selectedId ? (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <ChatArea
            channelId={selectedId}
            channelName={channelName}
            isDM={isDM}
            description={channelDescription}
            onOpenThread={(msg) => setThreadMsg(msg)}
            threadMsg={threadMsg}
          />

          {/* Thread panel */}
          <AnimatePresence>
            {threadMsg && (
              <ThreadPanel
                parentMsg={threadMsg}
                onClose={() => setThreadMsg(null)}
              />
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(108,71,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={28} style={{ color: '#6C47FF' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1A1A2E', marginBottom: 6 }}>Select a channel</h3>
            <p style={{ fontSize: 13, color: '#A0A0B8' }}>Choose a channel or DM to start messaging</p>
          </div>
        </div>
      )}

      {/* Create channel modal */}
      <AnimatePresence>
        {createModalOpen && (
          <CreateChannelModal
            onClose={() => setCreateModalOpen(false)}
            onCreate={(name, desc, priv) => createChannel(name, desc, priv)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
