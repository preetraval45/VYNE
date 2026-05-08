# VYNE Forward Plan — Demo → Real Product

The UI shell is done. Phases 1–28 (per-page dashboards, Cmd+K, saved views, bulk actions, hover toolbars, mobile parity, theming, real-time scaffolding, notifications, search, onboarding, AI v2/v3, data lifecycle, perf primitives, a11y, i18n, records primitives, integrations, viz v2, security, personalization, mobile-native, multi-tenant, engagement, chat/AI/calls/screen-share v3) all shipped. The shipped log lives in memory + git history.

The gap now is **real backends, real data, real money, real users**. This plan is what's left.

---

## Current honest state

- **UI**: best-in-class. Beats Linear / Notion / Salesforce on surface area for a solo project.
- **Auth**: real (Vercel Postgres + Prisma + PBKDF2 + module persistence).
- **Chat / Docs / Projects**: partial real API; most reads still hit zustand stores hydrated from fixtures.
- **CRM / Ops / Finance / Invoicing / Expenses / HR**: 100% fixture data persisted to localStorage. No DB.
- **AI**: tool-calling + memory + RAG + voice + agent traces + cost meter scaffolded. RAG embeddings store has no real index. Real provider keys (`GEMINI_API_KEY` / `GROQ_API_KEY` / `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`) drive live calls when set.
- **Realtime**: Pusher wired, no-ops cleanly when `NEXT_PUBLIC_PUSHER_KEY` missing (every demo workspace today).
- **Notifications**: bell + store + service worker + VAPID scaffold. Push subscriptions stored in-memory. Email send is a stub.
- **Billing**: plan picker on signup. No Stripe.
- **DEMO_MODE**: still hardcoded `true` in `apps/web/vercel.json`.

---

## Priority 1 — Real persistence (3–5 days)

Pick the 6 modules that ship as a real product on day one. Everything else stays demo.

- [x] **1.1a** Prisma schema for CRM (`Deal`), Invoicing (`Customer`, `Invoice`), Ops (`Product`), Contacts (`Contact`). → [schema.prisma](apps/web/prisma/schema.prisma) + commit `aa4a854`
- [x] **1.1b** Remaining models: Projects (`Project`, `Task` with subtasks Json), Contacts (`Account` separate from Contact), Ops (`Order`, `Supplier`), Finance (`JournalEntry`), plus `Embedding` for RAG. (`BOM`/`WorkOrder` deferred — fixture-only modules with low write volume.) → [schema.prisma](apps/web/prisma/schema.prisma)
- [x] **1.2a** API routes for Deal/Contact/Customer/Invoice/Product via shared `lib/api/crud.ts` factory. Each route is ~10 lines (list + create on `/api/{module}`, patch + delete on `/api/{module}/[id]`). → [crud.ts](apps/web/src/lib/api/crud.ts)
- [x] **1.2b** API routes for Project/Task/Account/Order/Supplier/JournalEntry — same factory, 12 new files (`accounts/`, `projects/`, `tasks/`, `orders/`, `suppliers/`, `journal-entries/` × list + `[id]` pairs).
- [x] **1.3a** Zustand stores grow `hydrate*FromServer()` + remote mirrors on every mutation for CRM (deals), Contacts (contacts), Invoicing (customers + invoices), Ops (products). Optimistic local update first, fire-and-forget remote, Pusher event subscription via `bind*Realtime()`. → [crm.ts](apps/web/src/lib/stores/crm.ts), [contacts.ts](apps/web/src/lib/stores/contacts.ts), [invoicing.ts](apps/web/src/lib/stores/invoicing.ts), [ops.ts](apps/web/src/lib/stores/ops.ts)
- [x] **1.3b** Same wiring for projects (projects + tasks), contacts.accounts, ops.orders, ops.suppliers, finance.journalEntries. Each store now exposes `hydrate*FromServer()` + `bind*Realtime("demo")`. Tasks transform their wire shape (`taskKey`/`taskOrder` → local `key`/`order`) on hydrate + realtime arrival. → [projects.ts](apps/web/src/lib/stores/projects.ts), [contacts.ts](apps/web/src/lib/stores/contacts.ts), [ops.ts](apps/web/src/lib/stores/ops.ts), [finance.ts](apps/web/src/lib/stores/finance.ts)
- [x] **1.4** All eleven server-backed stores hydrate in parallel from the dashboard layout boot path; `vyne:pull-refresh` re-syncs them all. → [(dashboard)/layout.tsx](apps/web/src/app/(dashboard)/layout.tsx)
- [ ] **1.5** Migration script: read demo fixtures → seed a "demo" workspace at signup so new users see populated data without losing isolation. (Currently `shouldSeedFixtures()` cookie gate handles this client-side.)
- [ ] **1.6** Flip `vercel.json` `DEMO_MODE: false`. The demo button on `/login` still works via `markDemoSession()`.

Acceptance (current): Sign up fresh → create a deal/contact/customer/invoice/product → refresh browser → row still there. Log in on phone → same row visible. **Verified live at [vyne.vercel.app](https://vyne.vercel.app).**

Acceptance (full): Same for projects/tasks/journal/orders/suppliers/accounts.

---

## Priority 2 — Real RAG end-to-end (3 days)

End-to-end pipeline now lives at `/api/ai/ingest` (upload + chunk + embed + upsert) → `/api/ai/retrieve` (embed query + cosine + top-K) → callers prepend hits as `<context>` blocks before model dispatch.

- [x] **2.1** Upload pipeline at [api/ai/ingest/route.ts](apps/web/src/app/api/ai/ingest/route.ts): POST body `{ ref, source?, text|chunks[], meta?, replace? }`. Calls [chunkText](apps/web/src/lib/rag.ts) (2400 char/240 overlap, snaps to whitespace), POSTs each chunk to existing `/api/ai/embed`, upserts into the `Embedding` Prisma model. GET `?ref=…` lists chunks; DELETE `?ref=…` drops them. Cap 200 chunks/request. Demo mode (no provider key) still works because `/api/ai/embed` falls back to a 384-dim hash vector.
- [x] **2.2** Retrieval at [api/ai/retrieve/route.ts](apps/web/src/app/api/ai/retrieve/route.ts): POST `{ query, k?, ref? }` — embeds the query, scores up to 1000 rows via [cosineSimilarity](apps/web/src/lib/rag.ts), returns top-K with `{id, ref, source, text, score, meta}`. Caller injects as `<context>` blocks. (Swap to pgvector ANN once the table grows past 1k rows.)
- [x] **2.3** Per-page Q&A: `/api/ai/search` now auto-pulls RAG context. Caller passes `context: {pathname, entityKey, ref?}`; `deriveRef()` resolves to a stable ref (entityKey > ref > `module:<seg>` from pathname). Top-K hits are merged into the corpus the model re-ranks, prefixed with `module: "rag"` so the chat layer renders them with the right icon. Demo deploys without an embed table fall through silently. → [api/ai/search/route.ts](apps/web/src/app/api/ai/search/route.ts)
- [x] **2.4** Index management UI at Settings → "RAG documents" tab: lists every indexed `ref` grouped by canonical id with `{chunkCount, source, lastIngestedAt}`, supports filter, one-click purge, and a built-in composer to ingest a snippet without leaving Settings. Calls `GET/POST/DELETE /api/ai/ingest`. → [RagDocumentsSettings.tsx](apps/web/src/components/settings/RagDocumentsSettings.tsx) wired in [settings/page.tsx](apps/web/src/app/(dashboard)/settings/page.tsx)
- [x] **2.5** Cross-conversation memory graph at Settings → AI preferences → "Cross-conversation memory graph". New [AiMemoryGraph.tsx](apps/web/src/components/ai/AiMemoryGraph.tsx) renders every persistent fact from `useAiMemoryStore.facts[]` as a node in the existing `<NetworkGraph>` primitive; edges are derived from Jaccard similarity on keyword tokens (≥4 chars, stop-word filtered). Inline composer (Enter to add) + per-row Forget button + global "Forget all". Empty state hints when no memories exist.

Acceptance: Drop a 30-page PDF in chat → ask "what does section 4 say about pricing?" → AI cites page 12 + 14 with hover preview. **Backend done + auto-injected on every AI search; chat composer file-drop wiring is the remaining UI step.**

---

## Priority 3 — Stripe billing (2–3 days)

All four moving parts already shipped in `aa4a854`. **Live mode is just an env-var flip + Stripe dashboard config — no code change.**

- [x] **3.1** Stripe products + price-id map at [stripe.ts](apps/web/src/lib/stripe.ts): Free / Starter $12 / Business $24 / Enterprise. `planFromPriceId()` resolves either way.
- [x] **3.2** Webhook handler at [api/stripe/webhook/route.ts](apps/web/src/app/api/stripe/webhook/route.ts): `checkout.session.completed`, `customer.subscription.{created,updated,deleted}`, `invoice.payment_failed` → upserts the `Subscription` Prisma model with plan/status/customer/sub-id/period-end/cancel-at-period-end. Verifies `stripe-signature` against `STRIPE_WEBHOOK_SECRET`.
- [x] **3.3** Checkout session at [api/stripe/checkout/route.ts](apps/web/src/app/api/stripe/checkout/route.ts): creates a subscription Checkout session with seat quantity, success/cancel URLs, promo codes, plan + seats metadata. Edge-runtime, uses Stripe REST directly so no SDK bundle weight. Plus customer portal route + status route. UI: `<BillingSettings />` already mounted in Settings.
- [x] **3.4** Metering gates wired: AI chat now runs `guardSpend(undefined, expectedCost)` before every dispatch — hard-stop refuses with a toast + writes "budget cap reached" into the assistant message; soft-warn fires a "X% of monthly AI budget used" toast and lets the call through. Per-model expected cost: opus 0.06 / sonnet 0.02 / haiku 0.005. Bulk-export gate now reads the active subscription plan via new [useSubscriptionPlan.ts](apps/web/src/hooks/useSubscriptionPlan.ts) hook (caches `/api/stripe/status` once per tab); `<ExportButton>` refuses with an upgrade toast when row count exceeds the per-plan cap (`free: 1k / starter: 25k / business: 250k / enterprise: ∞`). → [ai/chat/page.tsx](apps/web/src/app/(dashboard)/ai/chat/page.tsx), [ExportButton.tsx](apps/web/src/components/shared/ExportButton.tsx), [useSubscriptionPlan.ts](apps/web/src/hooks/useSubscriptionPlan.ts)
- [x] **3.5** 14-day trial: signup route now upserts `Subscription{status:"trialing", currentPeriodEnd: now+14d}` for every new account so `/api/stripe/status` surfaces the trial without code changes. New [TrialBanner.tsx](apps/web/src/components/layout/TrialBanner.tsx) reads the shared `useSubscriptionPlan` hook and renders a slim banner under the topbar while `isTrialing` — color-banded (accent → amber at 7d → red at 3d), per-day-dismissable, links to Settings → Billing. Stripe Checkout upgrade flips the row via the existing webhook handler. → [api/auth/signup/route.ts](apps/web/src/app/api/auth/signup/route.ts), [TrialBanner.tsx](apps/web/src/components/layout/TrialBanner.tsx), [(dashboard)/layout.tsx](apps/web/src/app/(dashboard)/layout.tsx)

**To go live (Vercel env vars):**

- `STRIPE_SECRET_KEY` — `sk_live_…` (or `sk_test_…` to test)
- `STRIPE_PRICE_ID_STARTER` / `_BUSINESS` / `_ENTERPRISE` — `price_…` from Stripe dashboard
- `STRIPE_WEBHOOK_SECRET` — `whsec_…` from the webhook endpoint config
- Stripe dashboard → Webhooks → add endpoint `https://vyne.vercel.app/api/stripe/webhook` with the 5 events above

Acceptance: Sign up → upgrade to Starter on Stripe Checkout → subscription reflected in app within 5s of webhook fire. **Code path verified; env keys are user-side configuration.**

---

## Priority 4 — Real-time everywhere (1–2 days)

Pusher infrastructure is wired across PresenceBubbles / LiveCursors / Reactions / ActivityFeed / CommentsPanel / TypingIndicator / FollowTeammate / NotificationBell. They no-op without the env var.

- [x] **4.0** **Eleven** server-backed module stores (CRM/Contacts/Customers/Invoices/Products/Accounts/Projects/Tasks/Orders/Suppliers/JournalEntries) now publish + subscribe to `org-${orgId}` Pusher channels via `bind*Realtime()`. Routes via `lib/api/crud.ts` call `publish()` on every create/update/delete; the `/api/deals` route does the same.
- [x] **4.1** Settings → "Realtime" tab ships a sanity-check widget. New [RealtimeStatusCard.tsx](apps/web/src/components/settings/RealtimeStatusCard.tsx) shows the active provider (Pusher / Supabase), whether the env vars are set, and a "Send test event" button that publishes to `private-realtime-test`, listens for the echo, and reports round-trip latency. When no keys are set, an inline note lists the exact env vars needed.

  **Pusher (default)**: `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`, `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`.

  Sanity check: open the app in two tabs, edit a CRM deal in tab A, confirm the value updates in tab B within ~500 ms — or just hit the "Send test event" button in Settings → Realtime.
- [x] **4.2** Supabase Realtime adapter shipped. Renamed `lib/realtime.ts` → [lib/realtime/pusher.ts](apps/web/src/lib/realtime/pusher.ts); new [lib/realtime/index.ts](apps/web/src/lib/realtime/index.ts) is the dispatcher that picks Pusher (sync, default) or Supabase (dynamic import — Supabase SDK isn't bundled when Pusher is active) based on `NEXT_PUBLIC_REALTIME_PROVIDER`. Same `subscribe(channel, event, handler) → unsubscribe` + `publishFromClient` + `isRealtimeEnabled` API across both, so the existing 16 callers (CRM/contacts/invoicing/ops/projects/finance stores + NotificationBell + LiveCursors + Reactions + ActivityFeed + CommentsPanel + TypingIndicator + FollowTeammate + EditableCell + chatDraftSync + PresenceBubbles) work unchanged. → [lib/realtime/supabase.ts](apps/web/src/lib/realtime/supabase.ts)

  **Supabase (alt)**: `NEXT_PUBLIC_REALTIME_PROVIDER=supabase`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [x] **4.3** Cross-device read state on notifications wired correctly. Existing client publish to `presence-notifications-${userId}` was 403'ing because the publish-route channel allowlist didn't include `presence-` namespaces. Fixed: allowlist now permits `presence-(notifications|thread|reactions|drafts|follow-org|cell)-*` + `private-realtime-test` (sanity-check). Auth route now passes `user_id` + `user_info` (resolved from the session cookie) when signing presence subscriptions, so Pusher accepts the join. Anonymous demo-mode tabs get a stable per-socket id so two-tab testing still works without an account. → [api/realtime/publish/route.ts](apps/web/src/app/api/realtime/publish/route.ts), [api/realtime/auth/route.ts](apps/web/src/app/api/realtime/auth/route.ts)

---

## Priority 5 — AI improvements (5–7 days)

Already huge. The gaps that move the needle:

- [x] **5.1** **Continuous voice mode** shipped via browser-native Web Speech API (no backend dependency, works on Chrome/Edge/Safari). New [VoiceConversationButton.tsx](apps/web/src/components/ai/VoiceConversationButton.tsx) implements the four-state loop: listening → thinking → speaking → resume. SpeechRecognition runs continuous + interim-results mode; on a finalized utterance it pauses + fires `onUserMessage(text)` which the chat page routes through `ask()`. Chat page watches the message stream and dispatches a `vyne:ai-spoken-text` CustomEvent when an assistant message finishes streaming (debounced via `lastSpokenIdRef` so updates don't re-fire); button speaks via SpeechSynthesis. Barge-in: if the user starts speaking while TTS plays, recognition wakes + cancels the utterance. Falls back silently on Firefox / browsers without SpeechRecognition. Real Realtime/Deepgram swap is a one-file replace of the recognition + TTS blocks. → [ai/chat/page.tsx](apps/web/src/app/(dashboard)/ai/chat/page.tsx)
- [x] **5.2** **Agent trace visualizer** shipped. New [AgentTracePanel.tsx](apps/web/src/components/ai/AgentTracePanel.tsx) renders every trace as a vertical timeline; each step shows kind/name/status/duration. Click to expand → args + output JSON + linked record refs + cost; failed tool steps expose a Replay button that re-runs the original call via `executeToolCall` and updates the step in place. Mounted in Settings → AI preferences as a global trace history; takes optional `conversationId` for chat-embed scoped views. Chat page now opens a trace per turn that has tool calls, appends a step per immediate execution + a skipped placeholder per pending-approval write, and finishes the trace as success/partial/failed when the chain completes. → [ai/chat/page.tsx](apps/web/src/app/(dashboard)/ai/chat/page.tsx)
- [x] **5.3** **Approval gate for write tools** — `toolExecutor.ts` now exports `splitToolCallsForApproval(calls)` (read tools run inline, writes need approval) + `describeWriteCall(call)` (human-friendly title + detail). New [PendingApprovalCard.tsx](apps/web/src/components/ai/PendingApprovalCard.tsx) renders an inline card per pending write with Approve / Edit (JSON args) / Cancel buttons. Chat page now buckets every tool-call response: queries fire immediately, mutations queue as approval cards under the assistant message; on Approve, the call runs and a result chip appears. → [toolExecutor.ts](apps/web/src/lib/ai/toolExecutor.ts), [ai/chat/page.tsx](apps/web/src/app/(dashboard)/ai/chat/page.tsx)
- [x] **5.4** **Skills (saved multi-step chains)** shipped. Extended `SavedPrompt` with optional `slug` + `steps: SkillStep[]` in [aiWorkspace.ts](apps/web/src/lib/stores/aiWorkspace.ts) — when both are set, the prompt becomes a runnable skill. New [SkillsLibrary.tsx](apps/web/src/components/ai/SkillsLibrary.tsx) at Settings → AI preferences → "Skills" with create / edit (steps as JSON, validated on save) / delete / copy-trigger / run-now. Chat composer detects `/skill <slug>` (regex `^/skill\s+(\S+)`) → resolves via `findSkill()` → executes each step via `executeToolCall` and writes the chain to a fresh agent trace, with a summary message ("X/Y steps OK") returned to the user. Three seeded prompts ("Weekly board update", "Pipeline review", "Incident postmortem draft") become skill-eligible — admins can add `steps` via the editor. → [ai/chat/page.tsx](apps/web/src/app/(dashboard)/ai/chat/page.tsx)
- [x] **5.5** **Computer-use sidebar** shipped (shell + provider-detection; the actual sandbox driver is a one-file drop). New [api/ai/computer-use/route.ts](apps/web/src/app/api/ai/computer-use/route.ts): GET returns provider configuration status (`anthropic` + `browserbase` or `e2b`); POST accepts `{task, sessionId?}` and lazy-imports `@/lib/ai/computerUseDriver` (501 with a clear hint when the driver isn't dropped in yet, 503 with the missing env-var list when keys are missing). New [ComputerUseSidebar.tsx](apps/web/src/components/ai/ComputerUseSidebar.tsx) at Settings → "Computer use" tab: shows provider status, task input, action log + screenshot strip; renders a "configure these env vars" panel when not set. **To enable**: `ANTHROPIC_API_KEY` + (`BROWSERBASE_API_KEY` + `BROWSERBASE_PROJECT_ID`) or `E2B_API_KEY`, then drop a `runTask({task, sessionId?})` implementation into `lib/ai/computerUseDriver.ts`.
- [x] **5.6** **Inline PDF Q&A (auto-ingest path)** shipped. Drag any PDF / TXT / MD / CSV / JSON / XML / log / YAML into the chat composer drop-zone and it streams to the new [api/ai/ingest-file/route.ts](apps/web/src/app/api/ai/ingest-file/route.ts). The route accepts multipart/form-data, extracts text server-side (`pdf-parse` for PDFs, raw UTF-8 for text formats), chunks via [chunkText](apps/web/src/lib/rag.ts), embeds each chunk via existing `/api/ai/embed`, upserts into the `Embedding` Prisma model. 8 MB cap, 200-chunk cap. The chat page shows a "Indexing X.pdf…" toast that resolves to "X chunks indexed" + drops a confirmation message in the stream with the new `ref`. Subsequent questions get the new chunks automatically because `/api/ai/search` already auto-injects RAG context (5.2 / 2.3). The dedicated PDF viewer + cited-span overlay is a follow-up — backend pipeline is shipped today. Added `pdf-parse` to deps. → [ai/chat/page.tsx](apps/web/src/app/(dashboard)/ai/chat/page.tsx)
- [x] **5.7** **Per-conversation cost preview chip** shipped. New [CostPreviewChip.tsx](apps/web/src/components/ai/CostPreviewChip.tsx) sits above the chat composer (only when input is non-empty) and shows estimated input tokens + USD before submit. Estimates from a 4-char/token heuristic over `input + persona-tone + persona-length + persona-customInstructions + active memories + memory facts`, multiplied by per-model input price (haiku/sonnet/opus). Tooltip breaks down preface vs prompt token counts. Output cost adds at completion via the existing `aiCostMeter`. → [ai/chat/page.tsx](apps/web/src/app/(dashboard)/ai/chat/page.tsx)
- [x] **5.8** **Memory editor enhancements** shipped on top of [AiMemoryGraph.tsx](apps/web/src/components/ai/AiMemoryGraph.tsx). Added: (a) **Forget by topic** — type a topic word, all facts matching by token (case-insensitive, ≥3 chars) are deleted with confirm; (b) **Import from conversations** — `mineMemoryCandidates()` scans `useAiMemoryStore.sessions[]` for first-person preference statements (e.g. "we use", "I prefer", "our team"), filters out facts already saved, surfaces remaining as one-click candidate buttons. Per-row Forget + global "Forget all" already shipped in 2.5.

---

## Priority 6 — Chat improvements (4–6 days)

- [ ] **6.1** **Huddles (ad-hoc audio)** — one-click "Start huddle" in any channel header. Uses LiveKit or Daily.co. Existing `voiceChannels` store carries the room. Persistent floating mini-window when user navigates away.
- [ ] **6.2** **Inline action messages** — when a workflow posts "Deal $50k closing — approve?", render two buttons (Approve / Reject) in the message bubble. Click → fires the registered action via `customTools` + posts a confirmation reply. Schema: `{ kind: "action", actionId, label, requiresRole? }`.
- [ ] **6.3** **Visual workflow builder for chat** — drag-drop "When message in #sales matches regex / contains @mention / has reaction X → run AI tool / create record / notify user". Reuses `<WorkflowGraph />` from automations. Saved workflows live in existing `automations` store.
- [ ] **6.4** **Channel directory** — `/channels` page listing public channels with member count, last activity, AI-summarized purpose. Search + topic filters. Pin/join from the list.
- [ ] **6.5** **Auto-archive stale channels** — `chatPolicies` retention store has the data. Build the surface: Settings → Workspace → "Stale channels" with one-click archive + Slack-style "this channel has been quiet 60 days" banner.
- [ ] **6.6** **Inline thread expansion** — instead of opening `<ThreadPanel>`, render the first 3 replies inline with a "Show N more" expander. Linear-style. Saves screen real estate on desktop.
- [ ] **6.7** **External channels (Slack Connect)** — share a channel with another Vyne workspace via signed invite link. Both sides see the same messages; tenant boundaries enforced at the message level. Reuses `workspaces` store + existing `presence-channel` infra.
- [ ] **6.8** **Per-channel notification schedule** — extend `notifyGate.ts` with per-channel DND. UI in the channel settings drawer.
- [ ] **6.9** **Message templates** — save a reply with `/save-template name`, recall with `/t name`. Workspace-shared via `aiWorkspace.prompts[]` with kind `chat-template`.
- [ ] **6.10** **Translate-on-display** — per-message translate button using existing `/api/ai/translate`. Cache by message id so a teammate viewing the channel doesn't re-spend on the same translate.

---

## Priority 7 — Inline edit spread + RBAC (2–3 days)

- [ ] **7.1** Spread `<EditableCell>` to every list with a stable id: projects (title/owner/due), invoicing (amount/customer/status), ops (sku/qty/price), contacts (name/email/company), expenses (amount/category). Pattern is already proven in CRM — mostly a copy-paste with the `commit` prop wired to the new API routes from Priority 1.
- [ ] **7.2** RBAC enforcement: every API route checks `workspaceMember.role` from session. UI: hide Delete + Edit affordances for `member` / `guest` per-entity via existing `fieldPermissions.canWrite`. Settings → Members → Roles surface to flip people up/down.
- [ ] **7.3** Field-level permissions UI: Settings → Security → "Field permissions" — table of `entity.field × role → mask|read|write|null`. Store + helpers exist (`fieldPermissions.ts`). Build the editor.

---

## Priority 8 — Production hardening (3–5 days)

- [ ] **8.1** **E2E tests with Playwright** — top 10 flows: signup, login, demo, create deal, edit deal, ask AI, send chat message, upload doc, switch theme, mobile bottom-nav navigation. Run on PR via GitHub Actions.
- [ ] **8.2** **Lighthouse pass** — chase ≥90 perf / a11y / SEO / best-practices on home, crm, chat, ai/chat. Existing bundle-budget.js wired into CI.
- [ ] **8.3** **Real Sentry** — `@sentry/nextjs` install. Existing `errorReporter.ts` swap-in is one line.
- [x] **8.4** **Email send wired** — `/api/notifications/send` posts to Resend (`https://api.resend.com/emails`) when `RESEND_API_KEY` is set; falls through cleanly when not (returns `{ok:true, skipped:true}`). Per-kind templates: mention / assignment / digest / alert / test. Auth-gated, CSRF-protected, rate-limited 10/min. Set `RESEND_API_KEY` + `RESEND_FROM` in Vercel to flip on. → [api/notifications/send/route.ts](apps/web/src/app/api/notifications/send/route.ts)
- [ ] **8.5** **VAPID keys generated + persisted** — service worker push handler already shipped; needs a real key pair in env + DB-backed subscription store (replace in-memory map in `/api/notifications/subscribe`).
- [ ] **8.6** **Rate limiting on every public route** — Vercel Edge has the primitives; centralize in a `rateLimit()` helper that uses `@upstash/ratelimit`. Already used in some Phase 21 routes — make universal.
- [ ] **8.7** **Audit log persistence** — currently localStorage. Move to a `audit_events` table with workspace + actor + entity + diff (uses `<AuditDiffView />` already shipped).
- [ ] **8.8** **Backup / restore** — daily `pg_dump` to S3, retention 30 days. Workspace snapshots store (`workspaceSnapshots.ts`) is the user-visible side.

---

## Priority 9 — Launch readiness (1 week)

- [ ] **9.1** **Landing page** at `/` (apex domain) — currently lands on auth. Add value prop, screenshots/demo video, pricing, waitlist, fair-use signup CTA.
- [ ] **9.2** **Pricing page** — match Stripe products from Priority 3.
- [ ] **9.3** **Status page** — `statusPage.ts` already polls; expose `https://status.vyne.app` (statuspage.io free tier or BetterStack).
- [ ] **9.4** **Public changelog** — `changelog.ts` manifest exists; render at `/changelog` with RSS feed.
- [ ] **9.5** **Documentation** — `/docs` external site (Mintlify or Docusaurus). At minimum: Getting started, AI features, API reference (the OpenAPI spec at `/api/openapi` already ships).
- [ ] **9.6** **Onboarding email drip** — Resend templates for day-0 welcome, day-2 "try AI", day-7 "import data", day-14 "trial ending". Pulls from `setupScore` to skip steps the user already completed.
- [ ] **9.7** **Marketing essentials** — favicon production-ready, og:image per route, robots.txt, sitemap.xml, analytics (Plausible / PostHog).

---

## Order of operations (8 weeks)

| Week | Focus                                                             |
| ---- | ----------------------------------------------------------------- |
| 1    | Priority 1 (real persistence) — schema + API + 3 modules          |
| 2    | Priority 1 cont'd — remaining 3 modules + migration               |
| 3    | Priority 2 (real RAG) + Priority 7 (inline edit spread)           |
| 4    | Priority 3 (Stripe) + Priority 4 (Pusher live)                    |
| 5    | Priority 5 AI features (top 4: voice, agent trace, approval, PDF) |
| 6    | Priority 6 chat features (top 4: huddles, action msgs, directory) |
| 7    | Priority 8 (perf + tests + Sentry + email)                        |
| 8    | Priority 9 (landing + pricing + docs + drip) → launch             |

---

## Top-5 if you only ship a few

1. **Real persistence on 6 core modules** (Priority 1) — without this, every other improvement is theatre.
2. **Real RAG end-to-end** (Priority 2) — biggest AI capability uplift; users feel the difference instantly.
3. **Stripe billing** (Priority 3) — turns the product into a business.
4. **Continuous voice + agent trace + approval gate** (Priority 5.1, 5.2, 5.3) — biggest AI-UX leap.
5. **Huddles + inline action messages** (Priority 6.1, 6.2) — biggest chat-UX leap; differentiates from Slack.

---

## What is *not* on this plan (deliberately)

These were on prior plans and shipped or aren't worth doing:

- ❌ More UI components — surface area is saturated.
- ❌ More dashboard pages — every page already has one.
- ❌ More theming — 14 accents × 16 backgrounds × 8 presets × custom hex is overkill already.
- ❌ More mobile polish — Phases 9 + 11 + 25 closed parity.
- ❌ More AI surface primitives — Phase 16 + 28.2 cover persona / memory / cost / sidebar / branching / RAG store / sandbox / reasoning / traces.
- ❌ More search variants — Phase 14 ships spotlight + chips + analytics; that's enough.
- ❌ More integrations stubs — Phase 21 covers the long tail; pick one to wire for real (Stripe, in Priority 3).
- ❌ Native mobile apps — the PWA covers it. Revisit only if a specific store-only capability blocks a deal.

---

## Reference

- Shipped log + file pointers: `~/.claude/projects/.../memory/project_shipped_features.md`
- Architecture / 37 pages / 9 services: `~/.claude/projects/.../memory/project_vyne.md`
- Deploy quirks: `~/.claude/projects/.../memory/reference_deploy.md`
- Old phase-by-phase audit lives in git history (`git log -- docs/UI_UPGRADE_PLAN.md`).
