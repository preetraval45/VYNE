import { NextResponse } from 'next/server'

export const runtime = 'edge'

type SuggestionMode = 'continue' | 'improve' | 'shorter' | 'longer' | 'summarise'

interface SuggestPayload {
  context?: string
  mode?: SuggestionMode
}

const FALLBACK_SUGGESTIONS: Record<SuggestionMode, string[]> = {
  continue: [
    ' Our team aligned on the approach and outlined the next three milestones for this quarter.',
    ' The key insight is that cross-module intelligence compounds — each module makes every other one smarter.',
    ' We should revisit this section after the customer interview on Tuesday and lock the scope by Friday.',
  ],
  improve: [
    ' — rewritten for clarity and impact.',
  ],
  shorter: [
    ' In short: focus on the top three blockers and punt everything else to next cycle.',
  ],
  longer: [
    ' To expand: this decision rests on three pillars — reliability, team velocity, and cost predictability. Each of them points in the same direction, and our previous experiments confirmed the hypothesis.',
  ],
  summarise: [
    ' TL;DR: ship the MVP, measure activation, iterate on the top drop-off.',
  ],
}

async function callClaude(context: string, mode: SuggestionMode): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null

  // Same system prompt across all modes — so prompt caching kicks in.
  const system = `You are a writing assistant inside VYNE Docs.
Help the user continue, sharpen, expand, or summarise their text.
Match their voice. Return only the new text, no preamble or quotes.`

  const instruction: Record<SuggestionMode, string> = {
    continue: `Continue this writing naturally in the same voice, ~2 sentences:\n\n${context}`,
    improve: `Rewrite this passage to be clearer and more concise, preserving meaning:\n\n${context}`,
    shorter: `Rewrite this passage in one short sentence:\n\n${context}`,
    longer: `Expand on this with 2-3 additional sentences of supporting detail:\n\n${context}`,
    summarise: `Summarise the following in a single TL;DR line:\n\n${context}`,
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 360,
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: instruction[mode] }],
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>
    }
    const text = data.content?.find((c) => c.type === 'text')?.text
    return text ?? null
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as SuggestPayload
  const context = body.context?.trim() ?? ''
  const mode = body.mode ?? 'continue'

  if (!context) {
    return NextResponse.json({ error: 'context is required' }, { status: 400 })
  }

  // Try real Claude; fall back to canned suggestion so demo works without a key.
  const real = await callClaude(context, mode)
  if (real) {
    return NextResponse.json({ suggestion: real, provider: 'claude' })
  }

  const pool = FALLBACK_SUGGESTIONS[mode] ?? FALLBACK_SUGGESTIONS.continue
  const pick = pool[Math.floor(Math.random() * pool.length)]
  return NextResponse.json({ suggestion: pick, provider: 'demo' })
}
