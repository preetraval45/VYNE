import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

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
    domains: ["localhost"],
  },
  output: "standalone",
  // Path-style sub-routes that the nav/bookmarks may hit map to the real
  // `?view=` sections (the app navigates by query param, so these paths were
  // never built and 404'd). Thin redirects close the "404 hole" — see the
  // master plan, Phase A1.
  async redirects() {
    return [
      {
        source: "/sales/quotations",
        destination: "/sales?view=quotations",
        permanent: false,
      },
      {
        source: "/sales/orders",
        destination: "/sales?view=orders",
        permanent: false,
      },
      {
        source: "/sales/products",
        destination: "/sales?view=products",
        permanent: false,
      },
      {
        source: "/sales/customers",
        destination: "/sales?view=customers",
        permanent: false,
      },
      {
        source: "/sales/reports",
        destination: "/sales?view=reports",
        permanent: false,
      },
      {
        source: "/contacts/dashboard",
        destination: "/contacts?view=dashboard",
        permanent: false,
      },
      {
        source: "/ops/inventory",
        destination: "/ops?view=inventory",
        permanent: false,
      },
      // Exact-path only — /ops/orders/[id] and /ops/orders/new are unaffected.
      {
        source: "/ops/orders",
        destination: "/ops?view=orders",
        permanent: false,
      },
      { source: "/hr/leave", destination: "/hr?view=leave", permanent: false },
      {
        source: "/hr/payroll",
        destination: "/hr?view=payroll",
        permanent: false,
      },
      {
        source: "/hr/org-chart",
        destination: "/hr?view=orgchart",
        permanent: false,
      },
      {
        source: "/finance/journal",
        destination: "/finance?view=journal",
        permanent: false,
      },
      // Invoices live in the Invoicing module, not Finance.
      {
        source: "/finance/invoices",
        destination: "/invoicing?view=invoices",
        permanent: false,
      },
      {
        source: "/crm/forecasting",
        destination: "/crm?view=forecasting",
        permanent: false,
      },
      {
        source: "/projects/roadmap",
        destination: "/roadmap",
        permanent: false,
      },
      // No /analytics route exists; reporting is the closest real screen.
      { source: "/analytics", destination: "/reporting", permanent: false },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

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
});
