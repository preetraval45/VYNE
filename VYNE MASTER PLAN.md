# VYNE — Master Plan

> Single source of truth for what's left to fix. Tick the box when a sub-task is verified in production.
>
> **Status legend** — `[x]` done · `[ ]` pending · `[~]` in progress / partially done.

---

## Post-launch QA fixes (Jun 5, 2026 full-user testing report) ⏳

Findings from a paying-user walkthrough of prod. The report praised Chat, Video Call + AI Meeting Recap, Calendar "Find a Time", the custom-widget Dashboard, and Sales/Quotations. The items below are the gaps — fix order is P0 crashes → P1 AI core → P2 silent failures → UX polish → enhancements. File pointers marked _(confirm)_ are best-guess starting points, not yet root-caused.

### P0 — Blockers (white-screen crashes, reproducible)

- [x] **BUG #1 — Global search crashes the whole app on every keystroke** — ROOT CAUSE: [GlobalSearchModal.tsx](apps/web/src/components/layout/GlobalSearchModal.tsx) subscribed to the whole `useSearchAnalytics` store, then a keystroke effect called `record()` (which mutates that store) with the store object in its deps → infinite render loop → React #185 → white screen. Fix: read analytics via `getState()` (non-subscribing), like CommandPalette does. Verified typecheck-clean. _(Bonus: replaced the magnifier-icon-opens-popup with an inline [GlobalSearchInput](apps/web/src/components/layout/GlobalSearchInput.tsx) bar in the topbar — live results dropdown + gear → advanced modal.)_
- [x] **BUG #2 — "+ New Issue" crashes after creation** — ROOT CAUSE: `addTask` in [projects.ts](apps/web/src/lib/stores/projects.ts) only defaulted `activity`/`attachments`; `QuickCreateIssueModal` passes only `{title, status, priority}`, so `tags`/`comments`/`subtasks` were `undefined` and the board card's `task.tags.slice(...)` threw `reading 'slice'`. Fix: `addTask` now backfills every required field (defense-in-depth for any partial caller) + render-site guards (`task.tags ?? []`, etc.) in [projects/[projectId]/page.tsx](<apps/web/src/app/(dashboard)/projects/[projectId]/page.tsx>) so already-persisted bad rows also survive. Verified typecheck-clean.

### P1 — AI core non-functional (this is the product's identity)

- [x] **BUG #3 — Vyne AI doesn't respond to chat queries** — ROOT CAUSE: [/api/ai/stream](apps/web/src/app/api/ai/stream/route.ts) always attached Gemini's NATIVE `google_search` grounding tool, but the request goes to Gemini's OpenAI-COMPAT endpoint (`/v1beta/openai/…`), which rejects that shape with a 400 and sinks the whole answer. Fix: grounding is now opt-in via `GEMINI_ENABLE_GROUNDING` (off by default) + a retry-without-grounding net on any 4xx, so an optional capability can't kill the core response; plus clearer surfaced errors for 429 (quota) and 401/403 (bad/missing key) instead of silent failure. Verified typecheck-clean. **Still needs a valid `GEMINI_API_KEY` in Vercel env** to actually answer.
- [x] **BUG #4 — AI auto-fill does nothing** — ROOT CAUSE: [AiFormFill](apps/web/src/components/shared/AiFormFill.tsx) posted the description as `context.userText` to [/api/ai/ask](apps/web/src/app/api/ai/ask/route.ts), but that route's `serializeContext` drops unknown context keys (the model never saw the text) AND it supports only `ANTHROPIC_API_KEY`/`GROQ_API_KEY`, not the app's `GEMINI_API_KEY` → fell to a prose `localFallback` with no JSON. Fix: new purpose-built [/api/ai/extract](apps/web/src/app/api/ai/extract/route.ts) endpoint (Gemini→Groq→Claude with JSON mode + a regex local fallback for email/phone/url) and repointed AiFormFill at it with real error surfacing (shows the "no values found" / "needs API key" note instead of silently doing nothing). The "Filling…" spinner already existed, so UX item #7 is covered too. Verified typecheck-clean. **Needs `GEMINI_API_KEY` in Vercel env for full free-text extraction; demo mode still fills email/phone/url via regex.**
- [ ] **BUG #5 — AI Daily Brief never loads** — home shows "Generating digest…" then reverts to "Click refresh to brief me on today"; never completes. Check [/api/ai/brief](apps/web/src/app/api/ai/brief/route.ts) + the home BriefCard — same Gemini-key root cause is likely; ensure a failure shows an error instead of silently reverting.

### P2 — Correctness / silent failures

- [ ] **Character-encoding mojibake** — subtitle reads `"10 accounts Â· 15 contacts"`; the `·` is being emitted as Latin-1 not UTF-8. Find the literal middot in the accounts/contacts subtitle string and fix the encoding (use `·` U+00B7 in a UTF-8 source, or `&middot;`). Visible on every page load.
- [ ] **Sales view resets to a filtered state after product creation** — returning to Sales after creating a product shows 1 opportunity ($75K) instead of all 13; no "Clear filter / Show all" escape. Preserve (or reset to "all") the pipeline filter on redirect, and add a visible Clear-filter control.
- [ ] **Opportunity form: no validation feedback** — submitting without the required Company field fails silently; doesn't highlight/scroll to the missing field. Add inline validation + focus-on-error.

### UX polish

- [ ] **Sidebar collapses on accidental click with no easy re-expand** — make collapse a deliberate, dedicated toggle; ensure an always-visible expand control when collapsed.
- [ ] **AI chat history entries are indistinguishable** — both "generate a dog image" sessions show the same error snippet as preview. Use a unique title / first-user-message preview per conversation.
- [ ] **AI auto-fill needs a loading state** — spinner / "Parsing your input…" so users don't re-click. (Ties to BUG #4.)
- [ ] **Read receipt "Seen · 4" needs a tooltip** showing who saw it.
- [ ] **Sales → Reports tab is empty** — render at least skeleton/demo charts so it doesn't read as broken.

### Enhancements (suggestions)

- [ ] **Cmd+K / Ctrl+K to open global search** (after BUG #1 fix) — standard power-user pattern.
- [ ] **Screen-share gives no feedback** — clicking screen-share highlights but no browser prompt appears; add explicit feedback or trigger the real `getDisplayMedia` request.
- [ ] **"Find a Time" should show day context** — "Tomorrow, 08:00" instead of bare "08:00".
- [ ] **Home app-launcher grid customisation** — pin/hide tiles (e.g. Manufacturing, Maintenance).
- [ ] **AI first-run onboarding prompt** — ask the user's role to calibrate responses instead of a blank slate.

---

## UI Review — Rating & Improvement Suggestions (Jun 8, 2026)

A walkthrough of the Home, Dashboard, AI Chat, and navigation areas.

### Overall Rating: **7.5 / 10**

Strong, polished dark-mode aesthetic and a clear product identity — modern and professional for a B2B OS tool. Several friction points hold it back from being truly great, mostly around **discoverability** and **onboarding clarity**.

### What's Working Well ✅

- **Visual Design (9/10)** — dark navy scheme, rounded cards, colored emoji-style module icons, green accent → cohesive, premium feel. Clean, legible typography.
- **Information Hierarchy on Home** — alerts (stock warning, plan usage, daily activity) prioritized at top in a clear card stack. Critical info first.
- **Left Sidebar Navigation** — collapsible tree with icons is intuitive; active-item highlight (teal/green left border + text color) clearly shows location.
- **AI Integration** — "Vyne AI" sits in both the top bar and the sidebar, making AI a first-class citizen rather than a bolt-on.
- **Module Grid on Home** — colorful, distinguishable icon grid works as a visual launchpad.

### Issues & What Can Be Improved ⚠️

- [ ] **1. Redundant Navigation (biggest UX issue)** — left sidebar and home module grid show the same destinations, creating cognitive duplication. Repurpose the home grid to show personalized/recent modules only, or remove it.
- [ ] **2. Sidebar cut off at the bottom** — on the default viewport the sidebar cuts off (Finance is last visible; HR/CRM missing) with no indicator there's more below. Add a fade-out gradient or scroll indicator.
- [ ] **3. Unclear iconography in the top bar** — top-right icons (chat, bell, search, document, "Get app") have no labels; tooltips exist but labels or persistent tooltips would be more accessible.
- [ ] **4. "Vyne AI Daily Digest" card is passive** — says "Click refresh to brief me on today" but the whole card is clickable with no obvious button. Add a visible "Generate Brief" CTA inside the card. _(Ties to BUG #5.)_
- [ ] **5. "Get Started" checklist is buried** — onboarding checklist (0%) sits below the fold under the grid; new users need it most. Make it collapsible and pin it near the top, or surface via a welcome modal.
- [ ] **6. Dashboard widget labels are very small** — all-caps tiny titles ("MRR — TOTAL", "OPEN ORDERS") are hard to scan. Use slightly larger, sentence-case labels.
- [ ] **7. "+ New Issue" button uses jargon** — for an all-in-one OS tool, "Issue" is confusing. Rename to "+ New Task" or make it context-aware per module.
- [ ] **8. No visual section grouping in the module grid** — 24 modules in a flat 6-column grid with no categories. Add subtle section headers (e.g. "People", "Operations", "Finance") for scannability.
- [ ] **9. Bottom status bar is ambiguous** — user avatar + "Set status" and four tiny unlabeled icons (settings, theme, presence, logout). Enlarge/label them; give "Set status" more prominence for a team-collaboration tool.

### Quick Win Priority List

| Priority  | Fix                                                      |
| --------- | -------------------------------------------------------- |
| 🔴 High   | Add visual scroll indicator / fade to sidebar            |
| 🔴 High   | Add visible CTA button inside the AI Daily Digest card   |
| 🟡 Medium | Group the module grid into labeled categories            |
| 🟡 Medium | Surface the "Get Started" checklist higher for new users |
| 🟡 Medium | Rename "+ New Issue" to something more intuitive         |
| 🟢 Low    | Add labels or persistent tooltips to top-bar icons       |
| 🟢 Low    | Increase label font size on Dashboard widgets            |

---

## Shipped this session (Jun 8, 2026) ✅

All items below are typecheck-verified (`tsc --noEmit`, exit 0). Committed as `6795c72` + pushed to GitHub `main`; deployed to Vercel prod.

### P0 crash fixes

- [x] **BUG #1 — global search white-screen** — see the root-cause note under P0 above. Fixed in [GlobalSearchModal.tsx](apps/web/src/components/layout/GlobalSearchModal.tsx) (read analytics via `getState()`, not a store subscription). Lesson recorded in the `zustand-selector-stability` memory.
- [x] **BUG #2 — "+ New Issue" crash** — see the root-cause note under P0 above. Fixed in [projects.ts](apps/web/src/lib/stores/projects.ts) `addTask` (backfills all required fields) + render guards in [projects/[projectId]/page.tsx](<apps/web/src/app/(dashboard)/projects/[projectId]/page.tsx>).

### P1 AI core

- [x] **BUG #3 — Vyne AI doesn't respond** — see the root-cause note under P1 above. Fixed in [/api/ai/stream](apps/web/src/app/api/ai/stream/route.ts): grounding gated behind `GEMINI_ENABLE_GROUNDING` + retry-without-grounding on 4xx + clearer 429/401-403 messages. **Needs a valid `GEMINI_API_KEY` in Vercel env to actually answer.** BUG #4 (auto-fill) and BUG #5 (daily brief) still pending.

### Global search — inline navbar bar (replaces the popup)

- [x] **New [GlobalSearchInput](apps/web/src/components/layout/GlobalSearchInput.tsx) in the topbar** — always-visible "Search records…" bar with a live grouped results dropdown as you type (keyboard nav, click-to-navigate), plus a gear that opens the advanced filter modal. Replaced the old magnifier-icon-opens-popup (`SearchTopbarButton` removed from [UnifiedTopBar.tsx](apps/web/src/components/layout/UnifiedTopBar.tsx)). Reuses the existing corpus/scoring and reads analytics via `getState()` so it can't reintroduce BUG #1. The advanced modal (`GlobalSearchModal`, Ctrl+/) is retained behind the gear. Per-page **filter** search bars are untouched — global search and per-page filter are now two distinct bars, as requested.

### Vendors — dedicated page + sidebar link + richer form

- [x] **Standalone [/vendors](<apps/web/src/app/(dashboard)/vendors/page.tsx>) page** — searchable, sortable vendor list (name, contact, category, terms, outstanding, status), row-click detail drawer showing all fields, delete with confirm, empty state. Previously vendors were only reachable as a tab buried under Invoicing.
- [x] **Sidebar "Vendors" link** now points to `/vendors` (was `/invoicing?view=vendors`) in [Sidebar.tsx](apps/web/src/components/layout/Sidebar.tsx). The Invoicing → Vendors tab still works at `/invoicing?view=vendors`.
- [x] **Enriched `Vendor` model + add form** — added optional `website`, `category`, `paymentTerms`, `taxId`, `address`, `notes` to the [invoicing store](apps/web/src/lib/stores/invoicing.ts) `Vendor` type + `addVendor`; the [New Vendor form](<apps/web/src/app/(dashboard)/invoicing/vendors/new/page.tsx>) now captures them (was just name/contact/email/phone) and supports a `?return=` param so it routes back to `/vendors`.
