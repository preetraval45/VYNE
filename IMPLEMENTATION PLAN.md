# VYNE — Implementation Plan

_Last updated: 2026-04-22_

VYNE is an AI-native Company Operating System (CRM + ERP + Project Mgmt + Docs +
Chat + Finance) deployed at **https://vyne.vercel.app**. This document is the
single source of truth for what's shipped, what's in flight, and what's next.

---

## 1. Status snapshot

| Layer | State |
|---|---|
| Hosting | Vercel free tier — 26 dashboard routes, all SSR, all 200 OK, p95 TTFB < 200ms |
| Frontend | Next.js 15 App Router · React 19 · TypeScript · Zustand (persist) per module |
| Design system | Linear / Vercel-grade palette — refined indigo `#5B5BD6`, true-black dark theme (default), 9-step cool-gray neutrals, 6 muted Pill tones |
| Component kit | `apps/web/src/components/shared/Kit.tsx` — `PageHeader`, `Pill`, `PrimaryLink`, `SectionTitle`, `EmptyState`, `StatCard`, `Board`, `BoardColumn`, `BoardCard`, `ViewToggle` |
| Storage | localStorage-backed Zustand stores for every module (offline-first) |
| AI | `claude-3-5-haiku-latest` JSON-mode hook (`callClaudeJson`) used by `/api/ai/digest`, `/api/ai/suggest`, `/api/ai/rank`, `/api/ai/search`, `/api/ai/next-actions`, `/api/ai/meeting-notes` |
| Build perf | `/docs` First Load JS 118KB (was 700KB+); `/settings` 107KB (was 228KB); 8 packages tree-shaken via `optimizePackageImports` |

---

## 2. Modules — visible in sidebar

| Route | Backing store | State |
|---|---|---|
| `/home` | static + AI digest fetch | live |
| `/dashboard` | static demo | live |
| `/projects` | `lib/stores/projects` | **board view (Active / On Hold / Completed)** + List view; full project page redesigned |
| `/crm` | `lib/stores/crm` | Pipeline + Deals Table + Forecasting; muted stage tones |
| `/contacts` | `lib/stores/contacts` | Accounts + Contacts + Import |
| `/sales` | `lib/stores/sales` | Opportunities + Quotations + Sales Orders + Products + Customers + Reports |
| `/invoicing` | `lib/stores/invoicing` | Customers + Invoices + Credit Notes + Payments + Vendors + Bills + Refunds |
| `/ops` | `lib/stores/ops` + `erpApi` fallback | Overview + Inventory + Orders + Suppliers + Manufacturing |
| `/finance` | `lib/stores/finance` | P&L + Journal + Chart of Accounts |
| `/expenses` | `lib/stores/expenses` | My Expenses + Approvals + Reports |
| `/hr` | `lib/stores/hr` | Members + Payroll + Time off |
| `/docs` | `lib/stores/docs` (new) | Tree + Tiptap editor (lazy) — collaborative editing via yjs scaffolded |
| `/chat` | `lib/stores/chat` | Channels + DMs + threads |
| `/ai` | route group | digest, suggest, rank, search, meeting-notes endpoints |
| `/roadmap` | static | feature requests |
| `/reporting` | static | dashboards |
| `/settings` | per-panel split | 15 lazy-loaded panels |
| `/timesheet`, `/activity`, `/help`, `/training`, `/admin`, `/runbooks`, `/playbooks`, `/status` | static | demo state |

**Hidden from sidebar (deep-link still works):** `/maintenance`, `/manufacturing`,
`/purchase` — duplicates of `/ops` + `/invoicing` with no backing store.

---

## 3. What shipped (recent timeline)

- ✅ Sidebar trim — removed three demo-only modules
- ✅ Dead-button audit — wired 16 `onClick={() => {}}` stubs to real `/new` routes
- ✅ React error #185 fix — stabilized Zustand selectors in `/projects`
- ✅ ErrorBoundary now surfaces URL + component stack + Copy/Reload buttons
- ✅ Docs "Add page" works — replaced HTTP-backed docsApi with localStorage store
- ✅ Tiptap editor lazy-loaded — `/docs` First Load JS 700KB → 118KB
- ✅ Settings code-split — 15 panels now load on tab click; `/settings` 228KB → 107KB
- ✅ `optimizePackageImports` for lucide / framer-motion / date-fns / 5× Radix
- ✅ Kit primitives applied to every top-level module (`/projects`, `/crm`, `/sales`, `/contacts`, `/invoicing`, `/ops`, `/finance`, `/expenses`)
- ✅ Board view (Odoo-style) on `/projects` with `<BoardColumn>` + `<BoardCard>`
- ✅ Project card click → full project page (no detail-panel detour)
- ✅ Full project page redesign — breadcrumb, status Pill, ViewToggle, flat indigo CTA
- ✅ **Palette overhaul** — `#6C47FF` candy purple → `#5B5BD6` refined indigo; rainbow sidebar → monochrome; deep status colors; hairline shadows; Inter w/ tightened heading tracking
- ✅ **Default theme = dark** with true-black `#000000` content surface
- ✅ Hardcoded `#FFFFFF` / `#F0F0F8` / `#F4F4F8` / `#F8F8FC` / `#1A1A2E` swept across project / sales / chat / settings / project-board components
- ✅ BoardColumn coral "+" button removed — column headers stay clean, users create via the page-level "New" CTA
- ✅ Six axe/forms a11y warnings on `/projects/[projectId]/page.tsx` resolved

---

## 4. Roadmap — what's next, ordered by leverage

### Tier A — high-impact, low-risk (do next)

1. **Roll Board view to `/crm` pipeline + `/sales/opportunities` + `/ops/orders`**
   The `<Board>` primitives already exist — each tab just needs to be reshaped
   into columns grouped by stage/status. Estimated 1 commit per module.

2. **Detail-page redesigns for the remaining modules** — `/contacts/accounts/[id]`,
   `/contacts/people/[id]`, `/sales/opportunities/[id]`, `/invoicing/invoices/[id]`,
   `/ops/products/[id]`, `/ops/work-orders/[id]`. Each gets the same breadcrumb +
   status Pill + tone-aligned chrome as `/projects/[id]`.

3. **Dashboard rework (`/dashboard` + `/home`)**
   Both pages still use the legacy bespoke layout. Replace top widgets with
   `<StatCard>` from Kit; surface the daily AI digest as the hero block.

4. **Empty states across the app**
   When a store is empty, pages show a broken-looking blank table. Wire
   `<EmptyState>` from Kit with a primary CTA.

### Tier B — UX depth

5. **Global keyboard hint strip** — bottom-of-sidebar `⌘K · ?` chip + visible
   "Press ? for shortcuts" affordance on first visit.

6. **`⌘K` command palette polish** — show recent records + AI quick actions, not
   just static nav links.

7. **Drag-and-drop on Board cards** — wire `@dnd-kit` (already installed) so
   moving a card between columns updates `status` in the underlying store.

8. **Skeleton loading states** — replace remaining spinners with shimmer
   skeletons that match the destination layout.

### Tier C — AI activation

9. **Daily digest on `/home`** — already has `/api/ai/digest`; needs the UI
   block. Show "Yesterday at VYNE" + 3-5 bullets + CTA to top blocker.

10. **In-page AI assistant** — slim right-side rail per module ("Summarize this
    pipeline", "Draft follow-up", "Find anomalies in this report"). Streams via
    `/api/ai/suggest`.

11. **Saved AI prompt presets in `/ai`** — repeating-task templates (weekly
    review, 1:1 prep, sales call notes).

12. **RAG over Docs + Projects + CRM** — pgvector in Vercel Postgres, embed via
    `text-embedding-3-small`. Earlier scaffold was reverted; rebuild as
    on-demand index per workspace.

### Tier D — production-readiness

13. **Real auth** — current `useAuthStore` is fake. Wire NextAuth or Clerk; add
    real `users` + `orgs` tables in Vercel Postgres.

14. **Multi-tenant data isolation** — every Zustand store keyed by `orgId`; the
    backend routes need the same.

15. **Real backend for Docs / CRM / Projects** — currently all client-only.
    Migrate the highest-traffic stores to Vercel Postgres + Vercel KV cache.
    Keep optimistic UI via `@tanstack/react-query`.

16. **File uploads** — wire `@vercel/blob` to attachments in chat/docs/expenses.

17. **Real chat realtime** — replace polling with `socket.io` (already a dep) on
    a tiny Node service or Pusher for the free tier.

18. **Background jobs** — Vercel cron for daily digest, weekly invoice
    reminders, overdue expense pings.

### Tier E — observability + quality bar

19. **Sentry / PostHog** — error tracking + product analytics.
20. **Playwright e2e** — flows for create/edit/delete on every module.
21. **Lighthouse CI** — keep First Load JS budgets enforced (current ceiling
    150KB per route).
22. **Storybook** for the Kit — single source of truth for design tokens.

---

## 5. Architecture invariants (do not change without proposing)

- **One store per module** in `apps/web/src/lib/stores/<module>.ts`, all using
  `zustand/middleware` `persist`. New modules follow the same shape.
- **Selectors that return derived collections must `useMemo` the filter** — see
  the React #185 incident in `lib/stores/projects.ts`. Returning
  `s.tasks.filter(...)` directly trips React 19's `useSyncExternalStore`
  consistency check and infinite-loops.
- **No raw hex in app code** — colors come from CSS custom properties in
  `globals.css` or from `Kit.tsx`'s `TONE_TOKENS`. Hardcoded `#fff` / `#1A1A2E`
  / etc. break dark mode, which is now the default.
- **All pages that consume `useSearchParams()` must wrap in `<Suspense>`** —
  `useDetailParam` and similar hooks pull search params; Next 15 requires it.
- **Forms must have labels** — every `<input>` / `<select>` / `<textarea>`
  needs `aria-label`, `placeholder`, or an associated `<label htmlFor>`.
- **`/new` and `/edit` routes are full pages, not modals** — primary affordance
  is `<Link href>`, not `onClick={() => setShowModal(true)}`.

---

## 6. Open questions / known gaps

- The `_.color` field on every sidebar nav entry is dead data after the
  monochrome sidebar pass. Either remove or repurpose for hover accent.
- `framer-motion` (~95KB) loads on every route. Many usages are decorative
  fades that could be CSS transitions.
- `/dashboard` SSRs 105KB of HTML and `/roadmap` SSRs 175KB — both inline a
  large mock dataset that should move behind a fetch.
- `apps/web/.env*` doesn't ship; deployments rely on Vercel env vars only.
  Document the required keys: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` (when RAG
  returns), `POSTGRES_URL` / `KV_REST_API_*` (when a real backend lands).

---

## 7. How we work

- **One commit per logical change.** Header redesigns, dead-button fixes,
  perf wins all ship as separate revertable commits.
- **Build before push.** `npx next build` from `apps/web/` must succeed.
- **Deploy via `vercel --prod --yes` then `vercel alias <url> vyne.vercel.app`.**
  Always alias so the canonical domain points at the latest production.
- **No `--no-verify`, no `git reset --hard` without asking, no force-push to
  main.** If a hook fails, fix the root cause.
- **`ErrorBoundary` exposes the diagnostic payload** — when something breaks in
  prod, the user clicks Copy details and the URL + stack pinpoints the page in
  one shot.
