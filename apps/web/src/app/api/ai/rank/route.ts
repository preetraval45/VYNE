import { NextResponse } from 'next/server'
import { callClaudeJson } from '@/lib/ai/claude'

export const runtime = 'edge'

interface RankItem {
  id: string
  text: string
  context?: string
}

interface RankPayload {
  items?: RankItem[]
}

interface RankedItem {
  id: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  reason: string
  score: number
}

interface RankResponse {
  ranked: RankedItem[]
}

const KEYWORDS_CRITICAL = ['outage', 'down', 'fail', 'urgent', 'critical', 'block', 'incident', '$', 'overdue', 'breach']
const KEYWORDS_HIGH = ['mention', 'review', 'approval', 'deploy', 'security', 'invoice', 'payment', 'customer']
const KEYWORDS_LOW = ['fyi', 'newsletter', 'reminder', 'subscribe', 'low priority']

function heuristicRank(item: RankItem): RankedItem {
  const text = `${item.text} ${item.context ?? ''}`.toLowerCase()
  if (KEYWORDS_CRITICAL.some((k) => text.includes(k))) {
    return {
      id: item.id,
      priority: 'critical',
      reason: 'Mentions an outage, blocker, or financial impact.',
      score: 95,
    }
  }
  if (KEYWORDS_HIGH.some((k) => text.includes(k))) {
    return {
      id: item.id,
      priority: 'high',
      reason: 'Requires your attention soon (mention / approval / customer).',
      score: 70,
    }
  }
  if (KEYWORDS_LOW.some((k) => text.includes(k))) {
    return {
      id: item.id,
      priority: 'low',
      reason: 'Informational — safe to read later.',
      score: 25,
    }
  }
  return {
    id: item.id,
    priority: 'medium',
    reason: 'Looks routine — no urgent signals detected.',
    score: 50,
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as RankPayload
  const items = body.items ?? []
  if (items.length === 0) {
    return NextResponse.json({ ranked: [], provider: 'demo' })
  }

  const userPrompt = `Rank the following items by priority. For each, return one of: critical | high | medium | low, plus a one-sentence reason and a 0-100 score.\n\nItems:\n${items
    .map((i) => `- [${i.id}] ${i.text}${i.context ? ` (context: ${i.context})` : ''}`)
    .join('\n')}\n\nReturn JSON: { "ranked": [{ "id", "priority", "reason", "score" }] }`

  const real = await callClaudeJson<RankResponse>(
    "You are VYNE's notification triage agent. Be decisive — most things are medium; only flag critical when it's truly urgent (outages, money at risk, blockers).",
    userPrompt,
    { maxTokens: 800 },
  )

  if (real?.ranked && real.ranked.length === items.length) {
    return NextResponse.json({ ranked: real.ranked, provider: 'claude' })
  }

  // Heuristic fallback so demo works without a key
  return NextResponse.json({
    ranked: items.map(heuristicRank),
    provider: 'demo',
  })
}
