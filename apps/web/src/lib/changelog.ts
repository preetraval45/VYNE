/**
 * Changelog manifest (27.3) — the canonical list of releases the
 * `/changelog` page renders + the "What's new" tour reads.
 *
 * Each entry is one shipped phase; bullets are short user-facing
 * blurbs, not commit messages. Update on every release.
 *
 * Subscribers (27.3) hit `/api/changelog/subscribe` with their email;
 * the existing email pipeline (Phase 13.5) sends a digest on every
 * new entry.
 */

export interface ChangelogEntry {
  /** Stable slug used in URL fragments and the `seen` tracker. */
  id: string;
  version: string;
  date: string;
  title: string;
  blurb: string;
  highlights: string[];
  /** Optional cover image / video URL. */
  cover?: string;
  /** When true, surfaces in the "What's new" auto-tour. */
  featured: boolean;
  /** Categories: "feature" | "improvement" | "fix" | "security". */
  tags: Array<"feature" | "improvement" | "fix" | "security">;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    id: "v1-26",
    version: "1.26",
    date: "2026-05-08",
    title: "Multi-workspace, side-by-side",
    blurb:
      "Switch between Dev / Staging / Prod or per-client agency workspaces from one signed-in account.",
    featured: true,
    tags: ["feature"],
    highlights: [
      "Workspace switcher in the topbar with logo / role chip.",
      "Cross-workspace search fans your query out across every membership.",
      "Subdomain routing — `acme.vyne.app` lands on the Acme workspace.",
      "Per-tenant usage analytics — seats / storage / API / AI tokens.",
      "Cross-workspace clone copies theme / automations / templates / shortcuts.",
      "Guest workspace invites scoped to a single record or module.",
    ],
  },
  {
    id: "v1-25",
    version: "1.25",
    date: "2026-05-07",
    title: "Mobile-native v2",
    blurb:
      "Camera, geo, biometric login, voice input, native share — a real mobile app inside the PWA.",
    featured: true,
    tags: ["feature"],
    highlights: [
      "Camera capture for receipts / QR / barcodes.",
      "FaceID / TouchID / Windows Hello via WebAuthn.",
      "Voice input on the chat composer (Web Speech API).",
      "Native share-sheet with clipboard fallback.",
      "Offline conflict resolver — keep mine / theirs / merge.",
      "Background sync flushes the offline queue when the device wakes up.",
      "Manifest shortcuts: long-press the home-screen icon for fast actions.",
    ],
  },
  {
    id: "v1-24",
    version: "1.24",
    date: "2026-05-07",
    title: "Reshape the workspace",
    blurb:
      "Drag-to-reorder sidebar, pinned records, recently viewed, custom landing, quick actions, shortcut customizer.",
    featured: false,
    tags: ["feature"],
    highlights: [
      "Drag-to-reorder sidebar modules (per user).",
      "Pin favourite records to a sidebar group.",
      "Recently viewed quick-list inside Cmd+K.",
      "Personal landing page choice — Home / Dashboard / module / record.",
      "Quick-actions toolbar, up to 6 user-configurable shortcuts.",
      "Keyboard shortcut customizer: rebind any chord from the `?` modal.",
      "Theme save-as preset → share to teammate via single URL.",
    ],
  },
  {
    id: "v1-23",
    version: "1.23",
    date: "2026-05-07",
    title: "Enterprise-grade security",
    blurb:
      "2FA enforcement, IP allowlist, anomaly detection, password breach check, multi-SSO, SCIM, field-level perms, audit diff, BYOK, compliance badges.",
    featured: true,
    tags: ["security", "feature"],
    highlights: [
      "Per-role 2FA enforcement with 7-day grace period.",
      "IP allowlist (CIDR rules) per workspace.",
      "Active session viewer + remote sign-out (revoke others).",
      "HIBP k-anonymity password breach check at sign-up.",
      "SCIM v2 endpoints for Okta / Azure AD provisioning.",
      "Field-level perms mask SSN / salary / API keys per role.",
      "Audit diff view — before/after JSON with redaction.",
      "Compliance badges — SOC 2 / ISO 27001 / GDPR / HIPAA / PCI / CCPA.",
    ],
  },
  {
    id: "v1-22",
    version: "1.22",
    date: "2026-05-06",
    title: "Visualisations & reporting v2",
    blurb:
      "Heatmap, sankey, geo, network graph, pivot, formulas, drill-through, scheduled reports, and a templates marketplace.",
    featured: false,
    tags: ["feature"],
    highlights: [
      "GitHub-style heatmap calendar.",
      "Sankey diagrams for funnels.",
      "Equirectangular geo map (zero-dep).",
      "Network graph for entity relationships.",
      "Pivot table builder + Excel-style formulas.",
      "Drill-through from chart cell → filtered list.",
      "Report templates marketplace (6 seeded).",
    ],
  },
  {
    id: "v1-21",
    version: "1.21",
    date: "2026-05-06",
    title: "Integrations & developer surface",
    blurb:
      "Signed webhooks, OpenAPI explorer, Slack slash commands, OAuth marketplace, scoped API keys, embeddable widgets, SDK examples, plugin SDK.",
    featured: false,
    tags: ["feature"],
    highlights: [
      "Webhook designer with retry / dead-letter / replay.",
      "Slack `/vyne` slash commands.",
      "OAuth marketplace — Google, Microsoft, GitHub, Stripe, Slack…",
      "Scoped API keys with per-key rate limits.",
      "Embeddable iframe widgets via signed JWT.",
      "SDK examples in JS / TS / Python / Go / curl / GraphQL.",
      "Plugin SDK — third-party React components in detail-panel rails.",
    ],
  },
];

/** Most-recent first. */
export function listChangelog(): ChangelogEntry[] {
  return [...CHANGELOG].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function changelogById(id: string): ChangelogEntry | null {
  return CHANGELOG.find((c) => c.id === id) ?? null;
}

/** Newest changelog id — used by the "What's new" tour as the high
 *  watermark to compare against the user's last-seen marker. */
export function latestChangelogId(): string {
  return listChangelog()[0]?.id ?? "";
}
