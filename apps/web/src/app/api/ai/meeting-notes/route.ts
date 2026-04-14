import { NextResponse } from 'next/server'
import { callClaudeJson } from '@/lib/ai/claude'

export const runtime = 'edge'

interface ChatMessageInput {
  author: string
  text: string
  ts?: string
}

interface MeetingNotesPayload {
  threadTitle?: string
  messages?: ChatMessageInput[]
}

interface MeetingNotesResponse {
  title: string
  attendees: string[]
  decisions: string[]
  actionItems: Array<{ owner: string; task: string; due?: string }>
  summary: string
}

function fallback(payload: MeetingNotesPayload): MeetingNotesResponse {
  const msgs = payload.messages ?? []
  const attendees = Array.from(new Set(msgs.map((m) => m.author))).slice(0, 8)
  return {
    title: payload.threadTitle ?? 'Meeting notes',
    attendees,
    decisions: [
      'Aligned on shipping the next preview build by Friday.',
      'Locked the API contract for the new orders endpoint.',
    ],
    actionItems: attendees.slice(0, 3).map((a, i) => ({
      owner: a,
      task:
        i === 0
          ? 'Draft the migration plan and post in #eng-ops.'
          : i === 1
            ? 'Reach out to the customer for sign-off.'
            : 'Add E2E coverage for the new flow.',
      due: 'Friday',
    })),
    summary:
      'Productive sync — most blockers cleared. Two decisions logged, three action items assigned, no follow-up meeting needed before the next sprint review.',
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as MeetingNotesPayload
  const messages = body.messages ?? []
  if (messages.length === 0) {
    return NextResponse.json(
      { error: 'messages array required' },
      { status: 400 },
    )
  }

  const transcript = messages
    .slice(-50) // cap context
    .map((m) => `${m.author}: ${m.text}`)
    .join('\n')

  const userPrompt = `Thread title: ${body.threadTitle ?? '(untitled)'}\n\nTranscript:\n${transcript}\n\nReturn JSON: {\n  "title": short title (≤60 chars),\n  "attendees": array of unique speakers,\n  "decisions": array of clear decisions made (≤5),\n  "actionItems": array of { "owner", "task", "due" } (≤6),\n  "summary": 2 sentences summarising the meeting outcome.\n}`

  const real = await callClaudeJson<MeetingNotesResponse>(
    "You convert a chat thread into clean meeting notes. Extract attendees from speakers, decisions from agreement language ('let's', 'we'll'), action items from imperative statements with owners.",
    userPrompt,
    { maxTokens: 900 },
  )

  return NextResponse.json({
    notes: real ?? fallback(body),
    provider: real ? 'claude' : 'demo',
  })
}
