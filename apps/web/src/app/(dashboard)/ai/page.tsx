'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────

type InsightSeverity = 'red' | 'yellow' | 'green'

interface Insight {
  id: string
  icon: string
  message: string
  severity: InsightSeverity
  href: string
}

interface AgentRun {
  id: string
  type: string
  trigger: string
  status: 'completed' | 'running' | 'failed'
  duration: string
  startedAgo: string
  summary: string
}

interface DelayedOrder {
  id: string
  amount: number
  daysLate: number
}

interface QueryResult {
  query: string
  answer: string
  orders: DelayedOrder[]
  sources: string
  followUps: string[]
  timestamp: string
}

// ─── Mock data ────────────────────────────────────────────────────

const INSIGHTS: Insight[] = [
  {
    id: 'i1',
    icon: '🔴',
    message: '3 invoices overdue totaling $8,400 — oldest is 45 days',
    severity: 'red',
    href: '/finance',
  },
  {
    id: 'i2',
    icon: '🟡',
    message: 'PWR-003 (Power Adapter) will stock out in ~4 days at current sales rate',
    severity: 'yellow',
    href: '/ops',
  },
  {
    id: 'i3',
    icon: '🟡',
    message: 'api-service deployment success rate dropped to 60% this week (was 94%)',
    severity: 'yellow',
    href: '/code',
  },
  {
    id: 'i4',
    icon: '🟢',
    message: 'Revenue up 23% vs last month — driven by ManuCo deal ($156K)',
    severity: 'green',
    href: '/finance',
  },
  {
    id: 'i5',
    icon: '🔴',
    message: '47 orders stuck in processing since last deployment failure',
    severity: 'red',
    href: '/ops',
  },
  {
    id: 'i6',
    icon: '🟡',
    message: "Sarah K. hasn't updated ENG-43 in 6 days — sprint deadline tomorrow",
    severity: 'yellow',
    href: '/projects',
  },
  {
    id: 'i7',
    icon: '🟢',
    message: 'Supplier response time improved: avg 1.2 days (was 3.4 days)',
    severity: 'green',
    href: '/ops',
  },
]

const AGENT_RUNS: AgentRun[] = [
  {
    id: 'ar1',
    type: 'Incident Investigation',
    trigger: 'deployment-failed event',
    status: 'completed',
    duration: '8.2s',
    startedAgo: '7min ago',
    summary:
      'IAM permission missing on api-service. 47 orders impacted. Rollback recommended.',
  },
  {
    id: 'ar2',
    type: 'Stock Reorder Check',
    trigger: 'scheduled (daily)',
    status: 'completed',
    duration: '3.1s',
    startedAgo: '2h ago',
    summary:
      'PWR-003 below threshold. Draft PO created for 500 units from Supplier #2.',
  },
  {
    id: 'ar3',
    type: 'Meeting Summary',
    trigger: 'calendar event',
    status: 'completed',
    duration: '4.7s',
    startedAgo: '5h ago',
    summary:
      'Sprint review: 27/35 points complete. 3 action items created in Projects.',
  },
  {
    id: 'ar4',
    type: 'Anomaly Detection',
    trigger: 'metrics spike',
    status: 'running',
    duration: '—',
    startedAgo: '1min ago',
    summary: 'Analyzing unusual traffic pattern on auth-service...',
  },
  {
    id: 'ar5',
    type: 'Demand Forecast',
    trigger: 'scheduled (weekly)',
    status: 'completed',
    duration: '12.3s',
    startedAgo: '1d ago',
    summary:
      'Q2 inventory needs updated. Top 3 items flagged for pre-order.',
  },
]

const PRELOADED_RESULT: QueryResult = {
  query: 'Which orders are delayed?',
  answer:
    'Found 3 delayed orders totaling $34,200. All delayed due to supplier fulfillment issues with PWR-003 component.',
  orders: [
    { id: 'ORD-001', amount: 12400, daysLate: 3 },
    { id: 'ORD-007', amount: 8900, daysLate: 1 },
    { id: 'ORD-012', amount: 12900, daysLate: 5 },
  ],
  sources: 'From: Orders module (3 records) · Inventory module (1 product)',
  followUps: ['Why are these delayed?', 'Contact suppliers', 'View all open orders'],
  timestamp: 'just now',
}

const SUGGESTED_QUERIES = [
  'Which invoices are overdue?',
  'Show low stock items',
  'What caused last week\'s incident?',
  'Top 5 deals by value',
  'Which orders are delayed?',
  'Team sprint velocity',
  'Revenue this month vs last',
  'Services with degraded health',
]

// ─── Helper functions (no nested ternaries) ───────────────────────

function getSeverityDotColor(severity: InsightSeverity): string {
  if (severity === 'red') return '#EF4444'
  if (severity === 'yellow') return '#F59E0B'
  return '#22C55E'
}

function getAgentStatusBadge(status: AgentRun['status']): { label: string; bg: string; color: string } {
  if (status === 'completed') return { label: '✅ Completed', bg: 'rgba(34,197,94,0.12)', color: '#166534' }
  if (status === 'running') return { label: '🔵 Running', bg: 'rgba(59,130,246,0.12)', color: '#1D4ED8' }
  return { label: '❌ Failed', bg: 'rgba(239,68,68,0.12)', color: '#991B1B' }
}

function getDaysLateColor(daysLate: number): string {
  if (daysLate >= 4) return '#EF4444'
  if (daysLate >= 2) return '#F59E0B'
  return '#6B6B8A'
}

function formatAmount(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}

// ─── Sub-components ───────────────────────────────────────────────

function InsightCard({ insight }: Readonly<{ insight: Insight }>) {
  const dotColor = getSeverityDotColor(insight.severity)
  return (
    <Link href={insight.href} style={{ textDecoration: 'none' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          padding: '10px 14px',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          cursor: 'pointer',
          transition: 'background 0.15s',
          marginBottom: 6,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.09)'
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)'
        }}
      >
        <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{insight.icon}</span>
        <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.82)', lineHeight: 1.45, flex: 1 }}>
          {insight.message}
        </span>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: dotColor,
            flexShrink: 0,
            marginTop: 4,
            boxShadow: `0 0 6px ${dotColor}`,
          }}
        />
      </div>
    </Link>
  )
}

function SidebarAgentRow({ run }: Readonly<{ run: AgentRun }>) {
  const badge = getAgentStatusBadge(run.status)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 0',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.88)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {run.type}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{run.startedAgo}</div>
      </div>
      <span
        style={{
          fontSize: 10,
          fontWeight: 500,
          padding: '2px 7px',
          borderRadius: 20,
          background: badge.bg,
          color: badge.color,
          whiteSpace: 'nowrap',
        }}
      >
        {badge.label}
      </span>
    </div>
  )
}

function SuggestedChip({ label, onClick }: Readonly<{ label: string; onClick: (q: string) => void }>) {
  return (
    <button
      onClick={() => onClick(label)}
      style={{
        padding: '6px 13px',
        borderRadius: 20,
        border: '1px solid rgba(108,71,255,0.3)',
        background: 'rgba(108,71,255,0.07)',
        color: '#6C47FF',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        const btn = e.currentTarget as HTMLButtonElement
        btn.style.background = 'rgba(108,71,255,0.14)'
        btn.style.borderColor = 'rgba(108,71,255,0.5)'
      }}
      onMouseLeave={(e) => {
        const btn = e.currentTarget as HTMLButtonElement
        btn.style.background = 'rgba(108,71,255,0.07)'
        btn.style.borderColor = 'rgba(108,71,255,0.3)'
      }}
    >
      {label}
    </button>
  )
}

function FollowUpChip({ label, onClick }: Readonly<{ label: string; onClick: (q: string) => void }>) {
  return (
    <button
      onClick={() => onClick(label)}
      style={{
        padding: '5px 11px',
        borderRadius: 20,
        border: '1px solid rgba(108,71,255,0.25)',
        background: 'rgba(108,71,255,0.06)',
        color: '#6C47FF',
        fontSize: 11.5,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(108,71,255,0.12)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(108,71,255,0.06)'
      }}
    >
      {label}
    </button>
  )
}

function ThinkingIndicator() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '18px 20px',
        background: '#fff',
        border: '1px solid rgba(108,71,255,0.15)',
        borderRadius: 12,
        boxShadow: '0 2px 12px rgba(108,71,255,0.06)',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6C47FF, #8B5CF6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          animation: 'spin 1.2s linear infinite',
        }}
      >
        <span style={{ fontSize: 14 }}>✨</span>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>Vyne AI is thinking…</div>
        <div style={{ fontSize: 11, color: '#A0A0B8', marginTop: 2 }}>Querying across all modules</div>
      </div>
    </div>
  )
}

function ResultCard({
  result,
  onFollowUp,
}: Readonly<{ result: QueryResult; onFollowUp: (q: string) => void }>) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid rgba(108,71,255,0.15)',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 2px 16px rgba(108,71,255,0.07)',
      }}
    >
      {/* Card header */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'linear-gradient(135deg, rgba(108,71,255,0.04), rgba(139,92,246,0.02))',
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6C47FF, #8B5CF6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 13 }}>✨</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6C47FF' }}>Vyne AI</div>
          <div style={{ fontSize: 10, color: '#A0A0B8' }}>{result.timestamp}</div>
        </div>
        <div
          style={{
            fontSize: 11,
            padding: '3px 9px',
            borderRadius: 20,
            background: 'rgba(108,71,255,0.1)',
            color: '#6C47FF',
            fontWeight: 500,
          }}
        >
          "{result.query}"
        </div>
      </div>

      {/* Answer text */}
      <div style={{ padding: '16px 18px 12px' }}>
        <p style={{ fontSize: 13.5, color: '#1A1A2E', lineHeight: 1.6, margin: 0 }}>{result.answer}</p>
      </div>

      {/* Data table (only shown for preloaded result with orders) */}
      {result.orders.length > 0 && (
        <div style={{ margin: '0 18px 14px', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F7F7FB' }}>
                {['Order', 'Amount', 'Days Late'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '8px 14px',
                      textAlign: 'left',
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#6B6B8A',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.orders.map((order) => {
                const lateColor = getDaysLateColor(order.daysLate)
                return (
                  <tr key={order.id} style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 600, color: '#6C47FF' }}>
                      {order.id}
                    </td>
                    <td style={{ padding: '9px 14px', fontSize: 12, color: '#1A1A2E' }}>
                      {formatAmount(order.amount)}
                    </td>
                    <td style={{ padding: '9px 14px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 20,
                          background: `${lateColor}18`,
                          color: lateColor,
                        }}
                      >
                        {order.daysLate}d late
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Sources */}
      <div style={{ padding: '0 18px 12px' }}>
        <span
          style={{
            fontSize: 11,
            color: '#A0A0B8',
            background: '#F7F7FB',
            padding: '4px 10px',
            borderRadius: 6,
            display: 'inline-block',
          }}
        >
          {result.sources}
        </span>
      </div>

      {/* Follow-up chips */}
      <div
        style={{
          padding: '10px 18px 14px',
          borderTop: '1px solid rgba(0,0,0,0.05)',
          display: 'flex',
          gap: 7,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 11, color: '#A0A0B8', alignSelf: 'center', marginRight: 2 }}>
          Follow up:
        </span>
        {result.followUps.map((fu) => (
          <FollowUpChip key={fu} label={fu} onClick={onFollowUp} />
        ))}
      </div>
    </div>
  )
}

function AgentRunsTable({ runs }: Readonly<{ runs: AgentRun[] }>) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '13px 18px',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 14 }}>🤖</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>Recent Agent Runs</span>
        <span
          style={{
            fontSize: 10,
            padding: '2px 7px',
            borderRadius: 20,
            background: 'rgba(108,71,255,0.1)',
            color: '#6C47FF',
            fontWeight: 600,
          }}
        >
          {runs.length} runs
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <thead>
            <tr style={{ background: '#F7F7FB' }}>
              {['Type', 'Trigger', 'Status', 'Duration', 'Started', 'Summary'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '9px 16px',
                    textAlign: 'left',
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#6B6B8A',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => {
              const badge = getAgentStatusBadge(run.status)
              return (
                <tr
                  key={run.id}
                  style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLTableRowElement).style.background = '#FAFAFE'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLTableRowElement).style.background = 'transparent'
                  }}
                >
                  <td style={{ padding: '11px 16px', fontSize: 12, fontWeight: 600, color: '#1A1A2E', whiteSpace: 'nowrap' }}>
                    {run.type}
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 11, color: '#6B6B8A', whiteSpace: 'nowrap' }}>
                    {run.trigger}
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        padding: '3px 9px',
                        borderRadius: 20,
                        background: badge.bg,
                        color: badge.color,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: '#1A1A2E', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {run.duration}
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 11, color: '#A0A0B8', whiteSpace: 'nowrap' }}>
                    {run.startedAgo}
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 11.5, color: '#6B6B8A', maxWidth: 280 }}>
                    {run.summary}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────

export default function AIPage() {
  const [queryInput, setQueryInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [results, setResults] = useState<QueryResult[]>([PRELOADED_RESULT])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleSubmit() {
    const trimmed = queryInput.trim()
    if (!trimmed || isThinking) return

    setIsThinking(true)
    setQueryInput('')

    const capturedQuery = trimmed
    setTimeout(() => {
      const genericResult: QueryResult = {
        query: capturedQuery,
        answer: `Analyzed your query across all VYNE modules. Here is a summary of findings related to "${capturedQuery}". Data pulled from relevant modules in real-time.`,
        orders: [],
        sources: 'From: All modules · Real-time data',
        followUps: ['Tell me more', 'Export results', 'Set an alert'],
        timestamp: 'just now',
      }
      setResults((prev) => [genericResult, ...prev])
      setIsThinking(false)
    }, 2000)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  function handleChipClick(query: string) {
    setQueryInput(query)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  function handleFollowUp(query: string) {
    setQueryInput(query)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  return (
    <>
      {/* Spin keyframe */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-dot { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.7); } 40% { opacity: 1; transform: scale(1); } }
      `}</style>

      <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
        {/* ── Left Sidebar ── */}
        <div
          style={{
            width: 280,
            flexShrink: 0,
            background: 'linear-gradient(180deg, #1A0A3C 0%, #0F0620 100%)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRight: '1px solid rgba(108,71,255,0.2)',
          }}
        >
          {/* Sidebar header */}
          <div
            style={{
              padding: '18px 16px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>🧠</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
                Vyne Intelligence
              </span>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.4 }}>
              Auto-detected insights · Updated now
            </p>
          </div>

          {/* Insights feed */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 0' }}>
            <div style={{ marginBottom: 10 }}>
              {INSIGHTS.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>

            {/* Recent Agent Runs (sidebar compact) */}
            <div
              style={{
                borderTop: '1px solid rgba(255,255,255,0.07)',
                paddingTop: 14,
                paddingBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.35)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 10,
                  paddingLeft: 2,
                }}
              >
                Recent Agent Runs
              </div>
              {AGENT_RUNS.slice(0, 4).map((run) => (
                <SidebarAgentRow key={run.id} run={run} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Main Area ── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: '#F8F8FC',
          }}
        >
          {/* Purple gradient header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #6C47FF 0%, #8B5CF6 100%)',
              padding: '22px 28px',
              flexShrink: 0,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Decorative circles */}
            <div
              style={{
                position: 'absolute',
                top: -40,
                right: -40,
                width: 160,
                height: 160,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: -20,
                right: 80,
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.04)',
                pointerEvents: 'none',
              }}
            />

            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 22 }}>✨</span>
                <h1
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: '#fff',
                    margin: 0,
                    letterSpacing: '-0.03em',
                  }}
                >
                  Ask Vyne AI
                </h1>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', margin: 0 }}>
                Natural language queries across all your business data
              </p>
            </div>
          </div>

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            {/* ── Query bar ── */}
            <div
              style={{
                background: '#fff',
                borderRadius: 14,
                boxShadow: '0 4px 24px rgba(108,71,255,0.1)',
                border: '1px solid rgba(108,71,255,0.18)',
                padding: '16px 18px',
                marginBottom: 18,
              }}
            >
              {/* Input row */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>✨</span>
                <label htmlFor="ai-query-input" style={{ display: 'none' }}>
                  Ask Vyne AI a question
                </label>
                <input
                  id="ai-query-input"
                  ref={inputRef}
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything… e.g. 'Which customers are at churn risk?'"
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    fontSize: 14,
                    color: '#1A1A2E',
                    background: 'transparent',
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!queryInput.trim() || isThinking}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 9,
                    border: 'none',
                    background: queryInput.trim() && !isThinking ? 'linear-gradient(135deg, #6C47FF, #8B5CF6)' : '#E5E5F0',
                    color: queryInput.trim() && !isThinking ? '#fff' : '#A0A0B8',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: queryInput.trim() && !isThinking ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s',
                    flexShrink: 0,
                  }}
                >
                  {isThinking ? '…' : 'Send ↵'}
                </button>
              </div>

              {/* Suggested query chips */}
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {SUGGESTED_QUERIES.map((q) => (
                  <SuggestedChip key={q} label={q} onClick={handleChipClick} />
                ))}
              </div>
            </div>

            {/* ── Query results area ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              {isThinking && <ThinkingIndicator />}
              {results.map((result, idx) => (
                <ResultCard
                  key={`${result.query}-${idx}`}
                  result={result}
                  onFollowUp={handleFollowUp}
                />
              ))}
            </div>

            {/* ── Agent runs table ── */}
            <AgentRunsTable runs={AGENT_RUNS} />
          </div>
        </div>
      </div>
    </>
  )
}
