export interface ClaudeResult<T> {
  data: T | null
  provider: 'claude' | 'demo'
}

/**
 * Calls Claude with a JSON-mode prompt. Returns parsed JSON of type T,
 * or null if the API key isn't configured / the call fails.
 *
 * Designed for edge runtime — no Node deps.
 */
export async function callClaudeJson<T>(
  systemPrompt: string,
  userPrompt: string,
  opts: { maxTokens?: number; model?: string } = {},
): Promise<T | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: opts.model ?? 'claude-3-5-haiku-latest',
        max_tokens: opts.maxTokens ?? 512,
        system: `${systemPrompt}\n\nRespond with raw JSON only — no prose, no code fences.`,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!res.ok) return null
    const body = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>
    }
    const text = body.content?.find((c) => c.type === 'text')?.text
    if (!text) return null

    // Strip ```json fences if Claude added them anyway.
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
    return JSON.parse(cleaned) as T
  } catch {
    return null
  }
}
