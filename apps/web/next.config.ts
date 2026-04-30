import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: false,
    // Modular-ize these heavy per-icon / per-symbol packages so only the
    // imports a component actually uses end up in that component's chunk.
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "date-fns",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-select",
      "@radix-ui/react-tooltip",
    ],
  },
  images: {
    domains: ['localhost'],
  },
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

// Sentry config — silent unless SENTRY_AUTH_TOKEN + SENTRY_ORG +
// SENTRY_PROJECT are set, so the Vercel build doesn't fail when
// Sentry isn't yet wired. Source-map upload is the only thing that
// requires the auth token; runtime error capture works without it.
export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Don't upload source maps in dev / when auth missing.
  disableLogger: true,
  tunnelRoute: "/monitoring",
})
