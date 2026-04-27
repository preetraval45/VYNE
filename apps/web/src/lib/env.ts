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

  // ─── Server-side only (Vercel-injected) ─────────────────────
  POSTGRES_URL: z.string().optional(),
  POSTGRES_URL_NON_POOLING: z.string().optional(),
  KV_REST_API_URL: z.string().optional(),
  KV_REST_API_TOKEN: z.string().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
})

// ─── Parse & Export ─────────────────────────────────────────────

function parseEnv() {
  // In production builds (Vercel) where no API URL is configured, fall back
  // to a same-origin URL so requests stay within the deployment instead of
  // hitting localhost:4000 (which gets blocked by CSP on .vercel.app). The
  // expectation is that production deployments either set NEXT_PUBLIC_API_URL
  // explicitly OR ship the backend behind /api on the same origin.
  const isProd = process.env.NODE_ENV === "production";
  const apiFallback = isProd
    ? typeof window !== "undefined"
      ? window.location.origin
      : "https://vyne.vercel.app"
    : "http://localhost:4000";
  const wsFallback = isProd
    ? typeof window !== "undefined"
      ? window.location.origin.replace(/^http/, "ws")
      : "wss://vyne.vercel.app"
    : "ws://localhost:4000";

  const raw = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? apiFallback,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL ?? wsFallback,
    NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
    POSTGRES_URL: process.env.POSTGRES_URL,
    POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING,
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
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
      NEXT_PUBLIC_API_URL: apiFallback,
      NEXT_PUBLIC_WS_URL: wsFallback,
      NEXT_PUBLIC_DEMO_MODE: false,
      POSTGRES_URL: process.env.POSTGRES_URL,
      POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING,
      KV_REST_API_URL: process.env.KV_REST_API_URL,
      KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
      BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
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
