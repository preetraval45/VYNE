import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: false,
    // Modular-ize these heavy per-icon / per-symbol packages so only the
    // imports a component actually uses end up in that component's chunk.
    // Biggest wins: lucide-react (hundreds of icons), framer-motion
    // (motion, AnimatePresence, transformations split separately),
    // date-fns (per-locale / per-function).
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

export default nextConfig
