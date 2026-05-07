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

- [ ] **1.1** Prisma schema for CRM (`Deal`, `DealStage`, `DealActivity`), Projects (`Project`, `Task`, `Subtask`), Invoicing (`Customer`, `Invoice`, `LineItem`, `Payment`), Ops (`Product`, `Order`, `Supplier`), Finance (`JournalEntry`, `Account`), Contacts (`Contact`, `Account`). Multi-tenant via `workspaceId` on every row + RLS or app-level filter.
- [ ] **1.2** API routes: `/api/{module}/list`, `/api/{module}/get/[id]`, `/api/{module}/create`, `/api/{module}/update/[id]`, `/api/{module}/delete/[id]`. Cursor pagination via existing `lib/pagination.ts`.
- [ ] **1.3** Zustand stores grow `hydrateFromServer()` + `mutate*()` that round-trips through the API. Local cache stays for offline; server is source of truth.
- [ ] **1.4** Wire `usePullToRefresh` on each page so the existing infra triggers a refetch.
- [ ] **1.5** Migration script: read demo fixtures → seed a "demo" workspace at signup so new users see populated data without losing isolation.
- [ ] **1.6** Flip `vercel.json` `DEMO_MODE: false`. The demo button on `/login` still works via `markDemoSession()`.

Acceptance: Sign up fresh on production → create a deal in CRM → refresh browser → deal still there → log in on phone → same deal visible.

---

## Priority 2 — Real RAG end-to-end (3 days)

Embeddings store + sandbox endpoints already shipped. The pipe is broken in two places.

- [ ] **2.1** Upload pipeline: when a user drops a PDF/DOCX/MD/TXT into chat, AI sidebar, or docs page, send to `/api/ai/ingest` → extract text (pdf-parse / mammoth / native string) → chunk (700 tokens, 100 overlap) → embed via existing `/api/ai/embed` → upsert into Postgres `pgvector` table or Pinecone.
- [ ] **2.2** Retrieval: on every AI question, vector-search top 6 chunks, inject into system prompt as `<context>` blocks with source ids, render `<CitationCard>` chips that already exist.
- [ ] **2.3** Per-page Q&A: AI sidebar on a project page auto-includes that project's docs/comments/tasks as a smaller scoped index.
- [ ] **2.4** Index management UI: Settings → AI → "Indexed documents" — list, search, re-index, delete. Drives off existing `useEmbeddings` store.
- [ ] **2.5** Cross-conversation memory: surface `aiMemory.memories[]` as an editable graph view (nodes = facts, edges = "related to"). User can prune what AI remembers.

Acceptance: Drop a 30-page PDF in chat → ask "what does section 4 say about pricing?" → AI cites page 12 + 14 with hover preview.

---

## Priority 3 — Stripe billing (2–3 days)

Plan picker exists; no money flows.

- [ ] **3.1** Stripe products: Free / Starter $12 / Business $24 / Enterprise (contact). Match the signup wizard's preset list.
- [ ] **3.2** Webhook handler at `/api/stripe/webhook`: `customer.subscription.{created,updated,deleted}` → write `Workspace.plan + Workspace.seats`.
- [ ] **3.3** Settings → Billing tab: portal link, usage meter (seats / API calls / AI spend MTD via existing `aiCostMeter`), plan upgrade/downgrade, invoice history.
- [ ] **3.4** Metering gates: AI calls hit `aiBudget.guardSpend` (already shipped) → if hard-stop, route returns 402. Lock list-page bulk-export at >1k rows on Free plan.
- [ ] **3.5** Trial: 14 days free, no card. Existing `setupScore` welcome checklist drives activation.

Acceptance: Sign up → 14-day trial visible on settings → upgrade to Starter on Stripe Checkout → subscription reflected in app within 5s.

---

## Priority 4 — Real-time everywhere (1–2 days)

Pusher infrastructure is wired across PresenceBubbles / LiveCursors / Reactions / ActivityFeed / CommentsPanel / TypingIndicator / FollowTeammate / NotificationBell. They no-op without the env var.

- [ ] **4.1** Set `NEXT_PUBLIC_PUSHER_KEY` + `PUSHER_SECRET` in Vercel. Sanity check: open the app in two tabs, edit a CRM deal in tab A, confirm the value updates in tab B.
- [ ] **4.2** Replace Pusher with Supabase Realtime if Pusher pricing isn't free-tier viable. Same channel API; one-day swap.
- [ ] **4.3** Cross-device read state on notifications already wired to `presence-notifications-${userId}`. Verify on phone + desktop.

---

## Priority 5 — AI improvements (5–7 days)

Already huge. The gaps that move the needle:

- [ ] **5.1** **Continuous voice mode** — push-to-talk exists; add hands-free loop with VAD (voice-activity detection) so user can interrupt mid-stream. Use OpenAI Realtime API or Deepgram + ElevenLabs. New `/api/ai/voice-stream` Edge route, new `<VoiceConversationButton />`.
- [ ] **5.2** **Agent trace visualizer** — `agentTraces` store exists. Build `<AgentTracePanel />` that renders the step DAG (tool / thought / decision nodes), click any step to see args/output, replay a failed run.
- [ ] **5.3** **Approval gate for write tools** — `toolExecutor.ts` runs `updateDeal` / `createTask` immediately. Add `requiresApproval: true` to the catalog + a 2-row preview card with Approve / Edit / Cancel buttons before commit.
- [ ] **5.4** **Skills (saved multi-step chains)** — extend `aiWorkspace.prompts[]` to carry `steps: [{tool, args}]`. User runs `/skill weekly-pipeline-review` → AI executes the chain. Slash menu in the composer for discovery.
- [ ] **5.5** **Computer-use sidebar** — when user asks "open Stripe and find the failed charge," AI drives a sandboxed browser tab via Anthropic computer-use API (or Browserbase). Render the live screenshot stream + action log.
- [ ] **5.6** **Inline PDF Q&A** — drag PDF into the chat composer → render an inline PDF viewer panel beside the chat → highlight cited spans on the PDF as the answer streams.
- [ ] **5.7** **Per-conversation cost preview** — before submitting, show estimated tokens + cost based on prompt length and selected model. Already have the meter; add the pre-flight estimate.
- [ ] **5.8** **Memory editor UI** — Settings → AI → Memory: editable list with on/off per row, batch import from past conversations, "forget topic X" semantic delete.

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
- [ ] **8.4** **Email send wired** — `/api/notifications/send` currently logs. Wire to Resend or Postmark (free tier). Templates already exist in notification-service.
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
