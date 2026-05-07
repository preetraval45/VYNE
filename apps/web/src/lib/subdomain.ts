/**
 * Subdomain → workspace slug resolver (26.3).
 *
 *   acme.vyne.app          → { slug: "acme", apex: false }
 *   vyne.app               → { slug: null,   apex: true }
 *   acme.vyne.vercel.app   → { slug: "acme", apex: false }   (preview alias support)
 *   localhost:3000         → { slug: null,   apex: true }    (dev)
 *   acme.localhost:3000    → { slug: "acme", apex: false }
 *
 * The router middleware (or the dashboard layout) uses this to:
 *   1. Pick the active workspace from `useWorkspaces` based on the
 *      slug, falling back to the workspace switcher when on apex.
 *   2. Reject access when the current user isn't a member of the
 *      workspace whose subdomain they hit.
 *
 * Pure utility — no DOM / store deps so it runs in middleware.
 */

const RESERVED = new Set([
  "www",
  "app",
  "api",
  "auth",
  "docs",
  "blog",
  "static",
  "assets",
  "cdn",
  "preview",
  "vyne",
]);

const APEX_SUFFIXES = [
  // production apex
  "vyne.app",
  // current preview alias
  "vyne.vercel.app",
];

export interface ResolvedTenant {
  slug: string | null;
  apex: boolean;
  /** When true, the host wasn't recognised — caller should treat as apex. */
  unknown: boolean;
}

export function resolveTenant(host: string | null | undefined): ResolvedTenant {
  if (!host) return { slug: null, apex: true, unknown: false };
  // Strip port + lowercase.
  const cleaned = host.split(":")[0].toLowerCase();
  // Localhost (dev): any leading segment before "localhost" is the slug.
  if (cleaned === "localhost") {
    return { slug: null, apex: true, unknown: false };
  }
  if (cleaned.endsWith(".localhost")) {
    const slug = cleaned.slice(0, -".localhost".length);
    if (!slug || RESERVED.has(slug)) {
      return { slug: null, apex: true, unknown: false };
    }
    return { slug, apex: false, unknown: false };
  }
  // Production / preview hosts.
  for (const suffix of APEX_SUFFIXES) {
    if (cleaned === suffix) {
      return { slug: null, apex: true, unknown: false };
    }
    if (cleaned.endsWith(`.${suffix}`)) {
      const slug = cleaned.slice(0, -(suffix.length + 1));
      if (!slug || RESERVED.has(slug)) {
        return { slug: null, apex: true, unknown: false };
      }
      // Vercel preview hosts look like `vyne-abc123-preet-raval.vercel.app` —
      // treat those as apex too (no per-tenant routing for previews).
      if (cleaned.endsWith(".vercel.app") && /-/.test(slug)) {
        return { slug: null, apex: true, unknown: false };
      }
      return { slug, apex: false, unknown: false };
    }
  }
  // Custom domain — caller's responsibility to map.
  return { slug: null, apex: false, unknown: true };
}

/** Build the canonical subdomain URL for a workspace slug. */
export function buildTenantUrl(
  slug: string,
  pathname: string = "/",
  origin?: string,
): string {
  if (typeof window === "undefined" && !origin) return pathname;
  const base = origin ?? window.location.origin;
  let host: string;
  try {
    host = new URL(base).host;
  } catch {
    return pathname;
  }
  // Drop any existing leading subdomain.
  for (const suffix of APEX_SUFFIXES) {
    if (host === suffix) {
      host = `${slug}.${suffix}`;
      break;
    }
    if (host.endsWith(`.${suffix}`)) {
      host = `${slug}.${suffix}`;
      break;
    }
  }
  if (host.endsWith(".localhost")) {
    host = `${slug}.localhost${host.includes(":") ? "" : ""}`;
  } else if (host === "localhost") {
    host = `${slug}.localhost`;
  }
  const url = new URL(pathname, `https://${host}`);
  url.protocol = base.startsWith("https:") ? "https:" : "http:";
  return url.toString();
}
