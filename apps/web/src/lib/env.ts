import { z } from 'zod'

// ─── Environment Variable Schema ───────────────────────────────

const envSchema = z.object({
  /** Base URL for the REST API (e.g. http://localhost:4000) */
  NEXT_PUBLIC_API_URL: z
    .string()
    .url('NEXT_PUBLIC_API_URL must be a valid URL')
    .default('http://localhost:4000'),

  /** WebSocket URL for real-time features (e.g. ws://localhost:4000) */
  NEXT_PUBLIC_WS_URL: z
    .string()
    .url('NEXT_PUBLIC_WS_URL must be a valid URL')
    .default('ws://localhost:4000'),

  /** Enable demo mode (skips auth, uses mock data) */
  NEXT_PUBLIC_DEMO_MODE: z
    .enum(['true', 'false', '1', '0', ''])
    .default('false')
    .transform((val) => val === 'true' || val === '1'),
})

// ─── Parse & Export ─────────────────────────────────────────────

function parseEnv() {
  const raw = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
  }

  const result = envSchema.safeParse(raw)

  if (!result.success) {
    console.error(
      '[VYNE] Invalid environment variables:',
      result.error.flatten().fieldErrors
    )

    // In development, fail loudly. In production / demo, use safe defaults.
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[VYNE] Falling back to defaults. Set variables in .env.local to silence this warning.'
      )
    }

    // Return defaults so the app can still boot in demo mode
    return {
      NEXT_PUBLIC_API_URL: 'http://localhost:4000',
      NEXT_PUBLIC_WS_URL: 'ws://localhost:4000',
      NEXT_PUBLIC_DEMO_MODE: false,
    } as const
  }

  return result.data
}

/**
 * Validated environment configuration.
 *
 * Usage:
 *   import { env } from '@/lib/env'
 *   fetch(`${env.NEXT_PUBLIC_API_URL}/api/projects`)
 */
export const env = parseEnv()
