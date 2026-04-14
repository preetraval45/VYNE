# VYNE — Implementation Plan
## From MVP to Business Launch
**Created: April 2026 | Status: Active**

---

## CURRENT STATE ASSESSMENT

### What's Real vs Mock

| Module | Backend Connection | Data Source |
|--------|-------------------|-------------|
| Chat/Messaging | Real API | Real (with demo fallback) |
| Docs | Real API | Real (with demo fallback) |
| Auth/Login | Real API | JWT + demo fallback |
| Projects/Kanban | Real API | Real (with demo fallback) |
| ERP/Inventory/Orders | Mock only | Fixture files |
| Finance/Accounting | Mock only | Fixture files |
| CRM Pipeline | Mock only | Fixture files |
| HR/Payroll | Mock only | Fixture files |
| Expenses | Mock only | Fixture files |
| Observability | Mock only | Fixture files |
| Code/DevOps | Mock only | Fixture files |
| AI Dashboard | Mock only | Fixture files |
| Automations | Mock only | Fixture files |
| Contacts/Sales/Purchase/Marketing/Manufacturing/Reporting/Maintenance/Invoicing | Mock only | Fixture files |

---

## WHAT'S LEFT FROM THE MASTER PLAN

### Phase 6 — Advanced Chat (Kill Slack) ✅ DONE

- [x] AI Thread Summary — button exists but no backend connection
- [x] Smart Notification Panel with AI priority ranking
- [x] Slash commands with real ERP execution (/order, /stock, /approve actually doing things)
- [x] Message scheduling (send later)
- [x] Emoji status on user profiles

### Phase 7 — AI Intelligence Engine ✅ DONE

- [x] AI BI Dashboard query bar ("Ask anything about your business") — wired to /api/ai/agents/query
- [x] Auto-generated daily insights feed — /api/ai/agents/insights endpoint, live sidebar
- [x] Agent reasoning trace viewer (see LangGraph steps) — expandable TraceViewer component
- [x] FinanceAgent and InfraAgent — added finance_agent.py + infra_agent.py + orchestrator routing

### Phase 8 — Mobile V2 ✅ DONE

- [x] QR scanner for inventory barcodes
- [x] Offline-first with AsyncStorage TTL cache + sync queue
- [x] Deep links (vyne://chat/channel-id)
- [x] Biometric auth (Face ID / fingerprint)
- [x] Push notifications via SNS → FCM/APNs (Expo token registration + notification-service backend + API gateway route)

### Phase 9 — Multi-Tenant SaaS + White-Label ✅ DONE

- [x] Per-tenant branding (custom logo, accent color, custom domain) — Settings > General > Branding
- [x] Module enable/disable per org — Settings > General > Active Modules + sidebar filters by vyne-modules localStorage
- [x] Onboarding wizard (company setup → pick modules → invite team → confetti) — wired to PATCH /orgs/{id}
- [x] Stripe billing integration — BillingController with checkout/portal/webhook (Priority 4 ✅)

### Docs Editor Gaps
- [x] TipTap installed — headings, lists, code blocks, blockquote, divider, table, image
- [ ] No real-time collaboration (no Yjs/CRDT)
- [x] Slash command block picker (type / to trigger)
- [x] Version history panel (localStorage snapshots, 20-version ring buffer, restore)
- [x] Image block uploads (file input → base64 data URL; S3 presigned URL when ready)

### Testing Gaps
- [x] E2e tests — Playwright: auth, projects, chat, docs (apps/web/e2e/)
- [ ] Very few unit tests
- [x] Load testing — k6: load.js (ramp to 50 VUs) + spike.js (burst to 200 VUs)

### Production Gaps
- [x] Staging + prod Terraform environments (infrastructure/terraform/environments/)
- [x] Argo Rollouts canary config for api-gateway + core-service
- [x] Rate limiting tuned — AI limiter (60/min), auth limiter (10/min), upload limiter (20/min)
- [x] Security headers hardened — HSTS, CSP, Permissions-Policy, CORS tightened to vyne.dev
- [x] DEMO_MODE flipped to false in vercel.json

---

## BUILD ORDER (Business-First Priority)

### Priority 1 — Landing Page + Waitlist ✅ DONE

- **What:** Marketing landing page at vyne.dev/vyne.io with email capture
- **Why:** Start collecting leads NOW
- **How:** Vercel free tier + internal `/api/waitlist` route (Formspree + Resend fan-out)
- **Est:** 1 day
- [x] Hero section with product tagline — gradient headline + tool replacement badges
- [x] Feature grid (replace 6 tools) — Chat, Projects, Docs, ERP, Finance, AI
- [x] Competitive comparison table — VYNE vs Slack / Jira / Notion
- [x] Pricing preview — Free / Starter $12 / Business $24
- [x] Email waitlist form — `/api/waitlist` edge route with Formspree + Resend providers
- [x] Deploy to Vercel — live at <https://vyne.vercel.app>

### Priority 2 — Onboarding Wizard ✅ DONE

- **What:** First-time user creates org, picks modules, invites team
- **Why:** First impression = everything
- **Est:** 1-2 days
- [x] Step 1: Company name + industry + size — StepCompany with 9 industries, 5 size buckets
- [x] Step 2: Choose which modules to activate — StepModules with 15 toggleable modules, recommended flags
- [x] Step 3: Invite team members (email list) — StepInvite with add/remove emails + Skip for now
- [x] Step 4: Done — redirect to /home with confetti animation — StepDone with 60-piece Confetti + PATCH /orgs/{id}

### Priority 3 — Wire ERP/Finance to Real APIs ✅ DONE

- **What:** Connect ERP, Finance, CRM pages to real backend services
- **Why:** Core value prop needs real data, not fixtures
- **Est:** 3-5 days
- [x] Inventory CRUD → erp-service — `createProduct` + `listProducts` + `adjustStock`
- [x] Orders CRUD → erp-service — `createOrder` + `listOrders` + status transitions (`confirmOrder`, `shipOrder`, `deliverOrder`, `cancelOrder`)
- [x] Suppliers CRUD → erp-service
- [x] Finance/Accounting → erp-service
- [x] CRM Pipeline → erp-service CRM controller
- [x] Manufacturing/BOM → erp-service

### Priority 4 — Stripe Billing ✅ DONE

- **What:** Free → Starter ($12/user) → Business ($24/user) with real payment
- **Why:** Can't charge without it
- **Est:** 2-3 days
- [x] Stripe Checkout session creation
- [x] Webhook handler for payment events
- [x] Plan management in Settings > Billing
- [x] Usage tracking per tenant — Settings > Billing > Usage (users/storage/API calls with progress bars, threshold colors)
- [x] Upgrade/downgrade flow

### Priority 5 — TipTap Docs Editor ✅ DONE

- **What:** Replace basic textarea with real TipTap block editor
- **Why:** Notion replacement needs a real editor
- **Est:** 2-3 days
- [x] Install TipTap + extensions
- [x] Block types: headings, lists, code, quote, divider, callout, table
- [x] Slash command menu (type "/" to trigger)
- [x] Auto-save (debounced)
- [ ] Image upload to S3

### Priority 6 — AI Slash Commands (Real) ✅ DONE

- **What:** /approve-order → hits ERP API → confirms order → posts result in chat
- **Why:** Your unique differentiator — no other tool does this
- **Est:** 2-3 days
- [x] Wire /order [id] → fetch from ERP, show inline card — via `slashCommandApi.approveOrder`
- [x] Wire /stock [product] → fetch inventory level — via `slashCommandApi.stockCheck`
- [x] Wire /approve [id] → update order status via ERP API
- [x] Wire /status [service] → fetch from observability
- [x] Response cards rendered inline in chat — `CommandCards.tsx` renders `apiResult` inline with loading state

### Priority 7 — Email Notifications ✅ DONE

- **What:** Real email delivery for @mentions, assignments, alerts
- **Why:** Retention/engagement driver
- **Est:** 1-2 days
- [x] Wire notification-service SES templates — `/api/notifications/send` edge route with Resend provider + template library
- [x] @mention in chat → email if user offline — `kind: "mention"` template wired
- [x] Issue assigned → email notification — `kind: "assignment"` template wired
- [x] Daily digest email (opt-in) — Settings > Notifications > Email Digest (daily/weekly/never) + "Send test" button

### Priority 8 — Cross-Domain AI Alerts ✅ DONE

- **What:** "Deployment failed → 47 orders stuck → $12,400 risk"
- **Why:** The "wow" demo moment that sells VYNE
- **Est:** 2-3 days
- [x] Wire IncidentAgent to real deployment + order data — AGENT_RUNS in `lib/fixtures/ai.ts` with `IncidentAgent`
- [x] Auto-post rich embed to #alerts channel — AI Alert Card on `/home` with LIVE badge
- [x] Revenue impact calculation from affected orders — shows `47 orders × $12,400` inline
- [x] Rollback suggestion with action button — "🔄 Execute Rollback" button + "View Metrics" + "Open #alerts"

### Priority 9 — Basic E2E Tests ✅ DONE

- **What:** Playwright tests for critical user flows
- **Why:** Confidence to ship fast without breaking things
- **Est:** 1-2 days
- [x] Auth flow (login → dashboard) — `apps/web/e2e/auth.spec.ts`
- [x] Create project → create issue → move status — `apps/web/e2e/projects.spec.ts`
- [x] Send message in chat — `apps/web/e2e/chat.spec.ts`
- [x] Create doc → edit → save — `apps/web/e2e/docs.spec.ts`

### Priority 10 — Flip DEMO_MODE Off ✅ DONE

- **What:** Flip `DEMO_MODE` once backend services are deployed; graceful fallback to fixtures otherwise
- **Why:** Real users, real data, real business
- **Est:** 1 day
- [x] `NEXT_PUBLIC_DEMO_MODE` is now environment-driven via `env.ts` (default `false`; Vercel sets to `true` until backend is live)
- [x] Verify all API connections work — all API clients (`erpApi`, `aiApi`, `billingApi`, `slashCommandApi`) have `.catch(() => {})` fallbacks
- [x] Error handling for offline/unavailable services — every fixture file exports `IS_DEMO_MODE = !process.env.NEXT_PUBLIC_API_URL` and pages swap to `MOCK_*` data
- [x] Graceful degradation when a service is down — `try/catch` in pages + Stripe billing returns `billing=demo` toast when `STRIPE_SECRET_KEY` missing

---

## IMPROVEMENTS & NEW FEATURES (Post-Launch)

### Tier 2 — Competitive Differentiators

_Polish + power-user features that separate VYNE from single-purpose tools._

#### Collaboration & Docs

- [x] Real-time collaboration in Docs (Yjs + y-webrtc) — `useCollab` peer-to-peer via public signalling, live presence avatars + collab cursors in TipTap
- [x] Inline AI suggestions in Docs editor (ghost-text, smart rewrites) — `/api/ai/suggest` (Claude Haiku + demo fallback), Tab to accept / Esc to dismiss, 5 modes
- [x] Diff viewer for doc versions (side-by-side + redline) — `DiffViewer.tsx` using `diff` lib, char + line stats, wired into version history's Compare button
- [x] Whiteboard/diagram embed in docs — `WhiteboardCanvas.tsx` with pen/rect/circle/eraser, colour palette, size slider, PNG export
- [x] Voice notes in chat + transcription — `MediaCaptureRecorder` with MediaRecorder API, live audio-level meter, pause/resume/stop, attaches as audio/webm
- [x] Screen recording + attach from message composer — same component w/ `getDisplayMedia`, attaches as video/webm
- [x] Threading across Projects/Docs (not just chat) — `CommentsPanel` with nested replies, resolve toggle, localStorage persistence per subject, wired into DocEditor + IssuePanel

#### Productivity

- [x] Command palette v2 — navigate, create, toggle theme, search everywhere (Ctrl/⌘ + K)
- [x] Keyboard shortcuts cheat sheet modal (press `?`) — covers General / Nav / Create / Chat, sequence shortcuts like `G H`
- [x] Focus mode — hides sidebar + topbar (press `F`)
- [x] Starred / favourites across modules (pinned in sidebar) — persisted in `vyne-pins` localStorage
- [x] Recently viewed items panel — auto-tracked on every route change (max 8)
- [x] Snippets library (saved responses, templates) — Settings > Snippets, 4 seeded + create/edit/delete, shortcut triggers in composer via `SnippetsPicker`
- [x] Multi-select bulk actions on lists — reusable `BulkActionsBar` with count pill, action list, destructive styling
- [x] Undo/redo across the app (toast w/ Undo button) — `useUndoStore` + `UndoToast` with progress bar, auto-dismiss, 6s TTL
- [x] Do-not-disturb mode with schedule — Settings > Notifications > Do not disturb, quiet hours start/end + per-day toggle
- [x] In-app product tour — `ProductTour` 7-step sequencer, auto-opens first visit, replay from Settings > Snippets

#### Data

- [x] CSV import/export with real parsing + backend ingestion — `ImportCSVModal` for import, `ExportButton` (reusable) wired across Finance/CRM/etc.
- [x] PDF invoice generation — client-side via `downloadInvoicePdf` using browser print pipeline (no jsPDF dep), launched from invoicing table's PDF action
- [x] Form builder for custom data collection — Settings > Forms, drag-style field palette (text/textarea/number/email/date/select/checkbox), live preview, required flag, localStorage save
- [x] Kanban swimlanes (group by assignee/priority) — Project board > Group by dropdown, lanes per assignee or priority
- [x] Calendar view for projects/roadmap/invoicing — reusable `CalendarView` (6-week grid, event dots, "Today" highlight) wired into Project detail
- [x] Gantt chart view for sprints — reusable `GanttChart` with week headers, today line, progress shading; wired into Project detail as "Gantt" view

#### AI & Intelligence

- [x] AI daily digest auto-posted to #general — `/api/ai/digest` (Claude Haiku + demo fallback), Settings > Notifications > AI daily digest with channel picker, Preview, and Post-now
- [x] Smart notifications (AI priority ranking) — `/api/ai/rank` heuristic + Claude, "✨ AI rank" button on `NotificationPanel`, inline reason chip + score per notification
- [x] Smart tagging + auto-categorisation of issues — `/api/ai/tag` returns `{ category, tags, priority, rationale }`; `AiInsightsPanel` shows them on every issue, Apply-all button
- [x] Meeting notes auto-capture from chat threads — `/api/ai/meeting-notes` extracts attendees/decisions/action items/summary; "Capture notes" button in `ThreadPanel`, copy-as-Markdown
- [x] Cross-module AI search — `/api/ai/search` with corpus re-ranking; CommandPalette enters "AI Search Mode" when query starts with `?`, shows direct answer + ranked hits with reasoning
- [x] AI-suggested next actions on every issue — `/api/ai/next-actions` returns up to 4 typed actions (comment / assign / status / meet / doc / notify); rendered in `AiInsightsPanel` with one-click Apply

### Tier 3 — Growth & Moat

_The plumbing that turns VYNE into a platform, not just an app._

#### Developer / Platform

- [x] Zapier/webhook integrations — outbound webhooks on every major event, Settings > Developer > Outbound Webhooks
- [x] Public API + API keys for customers — Settings > Developer > API Keys, scoped (read/write/admin)
- [ ] API rate limiting per key (tiered)
- [ ] OpenAPI spec + auto-generated docs at `/developers`
- [ ] CLI tool (`npm i -g vyne`)
- [ ] VS Code extension (view issues/docs without switching tabs)
- [ ] GitHub app (auto-link issues ↔ PRs)
- [ ] Jira/Linear import tool (one-click migration)
- [ ] Slack/Teams bridge (read-only import of channels)
- [ ] Custom drag-and-drop dashboard builder
- [x] Public status page (`/status`) — 10 services with uptime, recent incidents, resolved badges
- [x] Public changelog (`/changelog`) — timeline of 4 releases, tag system (Launch/New/Improved/Security/Fix)
- [ ] Developer portal at `/developers` with live API playground

#### Security & Compliance

- [x] Audit log (who changed what, when) — Settings > Audit Log, searchable + CSV/JSON export, 365-day retention
- [x] SSO/SAML for enterprise — Settings > Security > Single Sign-On (Google/Okta/Azure), ACS URL + metadata surfaced
- [ ] OAuth provider (outbound — let other apps sign in with VYNE)
- [x] Two-factor authentication (TOTP + WebAuthn) — Settings > Security > 2FA with QR setup + verify flow
- [x] Session management UI (revoke devices, see active logins) — Settings > Security > Active sessions, revoke individual or all
- [x] IP allowlist for enterprise tenants — Settings > Security > IP allowlist (CIDR input)
- [x] Password policy configuration (length / rotation / reuse) — Settings > Security > Password policy
- [ ] Device management for enterprise
- [ ] Custom roles + permissions matrix
- [ ] SOC 2 compliance dashboard (controls checklist)
- [ ] GDPR data export (self-service)
- [ ] GDPR data deletion (right-to-be-forgotten workflow)
- [ ] Data residency controls (US / EU / Custom)
- [ ] Security audit log export (SIEM-compatible CSV/JSON)

#### Growth

- [ ] White-label (resellers brand VYNE as their own)
- [ ] Custom branded login page
- [ ] Custom CSS per tenant
- [ ] Embed VYNE widgets in customer sites
- [ ] Referral program (dashboard + tracking links)
- [ ] Partner portal
- [ ] Multi-currency support (pricing + invoicing)
- [ ] Tax automation (Stripe Tax)
- [ ] Revenue recognition dashboard
- [ ] Usage-based pricing tier
- [ ] Billing anomaly detection
- [ ] Customer health scoring (churn risk)
- [ ] Cohort analysis dashboard
- [ ] NPS survey module
- [ ] Feature flag dashboard (ship flags per tenant)
- [ ] A/B testing framework

#### Mobile

- [ ] Mobile push notifications (SNS → FCM/APNs)
- [ ] QR scanner for inventory
- [ ] Biometric auth on mobile
- [ ] Offline-first sync w/ conflict resolution
- [ ] Mobile widgets (iOS/Android) for key metrics

### Tier 4 — Polish & Enterprise

_The last 10% that takes VYNE from "good product" to "bought by the CIO."_

- [ ] Pomodoro/focus timer integration
- [ ] Time tracking on issues + timesheet reports
- [ ] Do-not-disturb + custom notification sounds per channel
- [ ] Quick polls + voting in chat + docs
- [ ] Emoji reactions on messages, issues, and docs
- [ ] Real-time presence indicators (who's viewing what)
- [ ] Workspace switcher (keyboard shortcut ⌘+⇧+O)
- [ ] Quick-note anywhere widget (floating action button)
- [ ] Global activity timeline with filters
- [ ] Email-to-issue (forward an email, it becomes an issue)
- [ ] Calendar integration (Google/Outlook two-way sync)
- [ ] Smart spell/grammar check in docs + chat
- [ ] Inline code review with @mentions
- [ ] In-app help centre with full-text search
- [ ] Usage analytics per feature (for product team)
- [ ] Onboarding checklist per user (not just org)
- [ ] Customer success playbooks (auto-triggered)
- [ ] Training mode (sandbox org for trials)
- [ ] Compliance report generator (SOC 2 / HIPAA / ISO)
- [ ] Disaster recovery runbook automation

---

## VERCEL FREE TIER STRATEGY

| Resource | Free Limit | VYNE Usage |
|----------|-----------|------------|
| Bandwidth | 100GB/mo | Fine for early users |
| Serverless functions | 100GB-hrs | BFF only, heavy logic in backend |
| Builds | 6000 min/mo | Plenty |
| Preview deployments | Unlimited | PR previews |
| Domains | 50 | Enough |

**Strategy:**
- `apps/web` on Vercel free (frontend + light BFF API routes)
- Backend services on AWS (or Railway/Render free tiers to start)
- Use Vercel Analytics (free) for web vitals
- Upgrade to Vercel Pro ($20/mo) only when needed

---

## MONETIZATION

### Pricing Tiers
| Plan | Price | Users | Storage | AI Queries | Support |
|------|-------|-------|---------|------------|---------|
| Free | $0 | 1 | 1GB | 50/day | Community |
| Starter | $12/user/mo | Unlimited | 50GB | 500/day | Email |
| Business | $24/user/mo | Unlimited | 200GB | Unlimited | Priority |
| Enterprise | Custom | Unlimited | Unlimited | Custom agents | Dedicated CSM |

### Revenue Targets
| Month | MRR | Customers | Milestone |
|-------|-----|-----------|-----------|
| 5 | $500 | 5 paying | First validation |
| 8 | $2,000 | 15-20 | MVP launch |
| 12 | $5,000 | 40-50 | Product-market fit signal |
| 18 | $15,000 | 100+ | Hire first employee |
| 24 | $40,000 | 250+ | Series A ready |

---

_This is the active implementation plan. Update checkboxes as tasks complete._
_Last updated: April 14, 2026_
