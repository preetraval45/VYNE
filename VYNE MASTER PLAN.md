# VYNE — Master Plan

> The single source of truth for taking VYNE from a credible v1 surface to a
> platform that competes on depth with Salesforce/HubSpot (CRM), Rithmiq/Odoo/
> NetSuite (Ops/ERP), QuickBooks/Xero (Finance), BambooHR/Rippling (HR),
> Linear/Jira/Asana (Projects), Slack (Chat) — while keeping the one thing none
> of them have: **one AI brain across the whole business.**
>
> **Status legend** — `[x]` done · `[ ]` pending · `[~]` in progress / partial.
> Each epic lists: **Target** (who we're matching) · **Gap** (what's missing) ·
> **Build** (concrete work) · **Data** (Prisma/store) · **Done when** (acceptance).
> Work top-down: **Phase A (launch blockers) → B (module depth) → C (AI moat) → D (platform).**

---

## 0. Positioning & success criteria

**Positioning:** _"VYNE is the only platform where your AI understands your entire
business — deals, inventory, team, finances, and projects — in one place, with one
AI brain connecting all of it."_ Market frame = **Notion + Slack + lightweight CRM
for AI-first SMBs**, not feature-for-feature Salesforce.

**Launch bar (credible):** zero dead nav, Sales Orders + Finance Invoices real,
AI story front-and-center.
**Parity bar (per module):** the "Done when" criteria in each Phase-B epic.
**Moat bar:** cross-module AI answers grounded in live data (Phase C).

**Product principles (non-negotiable):**

- **Real, not mock** — every module persists to Postgres and runs _real_ workflows
  the way Odoo/NetSuite/Salesforce/Rithmiq do: order-to-cash, procure-to-pay,
  double-entry GL, MRP runs, leave accruals. No static demo UI in production; demo
  seed data is clearly flagged and replaceable. State survives reload, multi-user,
  and server round-trips (not just local Zustand).
- **Fully customizable (the "Studio")** — every org configures its own fields,
  objects, layouts, views, pipelines/statuses, workflows, roles/permissions,
  reports, dashboards, number sequences, templates, and which modules show —
  all no-code. This is a first-class pillar (§3.5), not an afterthought.
- **AI-native** — the AI reads and can act on all of the above.

---

## 1. Baseline already shipped (context only — do not re-do)

Chat (channels/DMs/threads/reactions/AI summary), CRM pipeline + AI deal coach,
Ops dashboard + inventory list + order detail + suppliers, Finance P&L + AR aging,
HR employee directory, Projects board + AI sprint planner, Calendar, Timeline
(multi-source feed), Vyne AI (workspace-grounded chat, memory, BRD/TRD/Spec/Diagram),
My Dashboard (drag widgets), Docs (basic), Settings. Nav unified to the sidebar
(`?view=` sections). Mojibake guard + `.editorconfig` in place.

---

## 2. Phase A — Launch blockers 🚨

### A1. Kill the 404 hole (no dead nav at launch)

Every advertised destination must resolve. For each path route below: **build it**,
**redirect path → `?view=`**, or **gate the nav entry** ("Coming soon"). Preferred
default: add thin `redirect()` pages so typed/bookmarked path URLs land on the
working `?view=` section.

_Done via `next.config.ts` `redirects()` — every path below now resolves to its real `?view=` section (no more 404s)._

- [x] `/sales/quotations` → `/sales?view=quotations`
- [x] `/sales/orders` → `/sales?view=orders`
- [x] `/sales/products` → `/sales?view=products`
- [x] `/sales/customers` → `/sales?view=customers`
- [x] `/sales/reports` → `/sales?view=reports`
- [x] `/contacts/dashboard` → `/contacts?view=dashboard`
- [x] `/ops/inventory` → `/ops?view=inventory`
- [x] `/ops/orders` → `/ops?view=orders` (exact-path; `/[id]` + `/new` unaffected)
- [x] `/hr/leave` → `/hr?view=leave`
- [x] `/hr/payroll` → `/hr?view=payroll`
- [x] `/hr/org-chart` → `/hr?view=orgchart`
- [~] `/finance/invoices` → redirected to `/invoicing?view=invoices` for now; **still build the real Finance Invoices page** (table-stakes, B3).
- [x] `/finance/journal` → `/finance?view=journal`
- [x] `/crm/forecasting` → `/crm?view=forecasting`
- [x] `/analytics` → `/reporting` (no real analytics route; redirected to closest screen)
- [x] `/projects/roadmap` → `/roadmap`
- [x] **Done when:** route-coverage test (`src/__tests__/route-coverage.test.ts`) asserts every sidebar nav href resolves to a real page or a `next.config` redirect — passes, and guards against future 404-hole regressions.

### A2. Critical UI blockers

- [x] **Ops duplicate Overview** — removed the redundant 4 icon-cards from `OverviewTab`; the page-level KPI strip is the single overview.
- [x] **Docs recent-card title invisible** — root cause was hardcoded `bg-white` cards with theme-aware text → white-on-white in dark mode; cards + search rows now use `var(--content-bg)` and bolder titles.
- [x] **404 page has no app shell** — added a "Jump to" quick-links grid (Home/Dashboard/Sales/CRM/Chat/Projects/AI/Settings) + the two prominent CTAs, so a 404 still offers a way in.
- [x] **Done when:** a new user never hits a dead/broken-looking screen. ✅ (Phase A complete)

### A3. High/medium/polish UI (condensed from the Jun 8 walkthrough — 22 items)

- [x] Sidebar collapsed-state tooltips — already present (`title={collapsed ? label}` on every nav row).
- [x] Breadcrumb reflects active sub-section — topbar now shows "Module › Section" from `?view=` (`UnifiedTopBar`).
- [x] Standardize badge/pill style — audited: most module headers already use the shared `Pill` (`Kit.tsx`); converted HR's hand-rolled Active/Remote/On-Leave chips to `<Pill tone=…>` so they match Ops/Sales. _(Per-row status badges remain their own semantic.)_
- [x] `formatCurrency` (`$96.8K`) — helper already existed; applied to Ops KPI strip (was lowercase `$69.9k`) + order total. _(Remaining pages adopt incrementally.)_
- [x] One shared Export-CSV button — audited: `ExportButton` is used across 10+ modules; the one rogue inline (and dead, no-onClick) "Export CSV" in Expenses → Reports is now the shared `ExportButton` wired to the monthly data.
- [x] "Ask AI" green — `AskAiButton` already uses the same `teal-400→teal-600` token as the topbar Vyne AI button (consistent).
- [x] Demote "Get app" to ghost/outline — done (transparent bg + border in `UnifiedTopBar`).
- [x] My Dashboard drag-onboarding affordance — added a dashed accent callout ("Drag any widget onto the grid →" with hand + arrow icons) at the top of the palette.
- [x] Chat formatting toolbar — now shows only when the composer is focused or has text (Slack/Teams behaviour); buttons `preventDefault` mousedown so they don't blur-hide.
- [x] Ops low-stock names — `title` tooltip + ellipsis-on-hover.
- [x] Docs empty state — actionable "Create your first document" CTA + warmer copy (wired to `handleCreateRoot`). _(Richer seed data still under B7.)_
- [x] HR header summary chip row — already present (Active / Remote / On Leave chips).
- [x] Calendar "Up Next" — added hover `title` + `overflow-wrap` so long titles stay readable.
- [x] OVERVIEW toggle — already uses an inline chevron (`ChevronDown/Up` in `PageDashboard`).
- [x] Projects sidebar badge — re-pinned to the icon's top-right corner with a sidebar-bg ring so it reads cleanly.
- [x] Sidebar Vyne AI brain icon — **decision: keep** the featured panel. It's a polished hero card (brain-in-teal-square + "BRD · Diagrams · Sheets · Slides") sitting directly under the brand logo. The AI is the product's moat, so a prominent, distinct panel is correct; matching it to the line-icon nav would bury the differentiator. Best-for-product call, not an oversight.
- [x] Sample-data banner — recolored to neutral slate / blue-gray (no longer reads as success green).
- [~] Responsive pass: tablet/mobile — audited the existing system (mature: ~70 media queries, `MobileBottomNav`, `MobileLayoutNormalizer`, `two-pane-layout` stacking, auto-fit stat grids). Filled the gaps my recent changes introduced: topbar breadcrumb + avatar name/role now hidden ≤640px; home two-column rail now uses `two-pane-layout` so it stacks on phones instead of squeezing. _(Full device-matrix QA — real iOS/Android Safari/Chrome — still wants a hands-on pass; tracked under D1.)_

---

## 3. Phase B — Module depth to reach competitive parity

> Each epic is a real product slice: data model + pages + stores + AI hooks +
> acceptance. Build in the order that maximizes "looks like a real product":
> **Sales/CRM → Finance → Ops → HR → Projects → Chat → Docs.**

### B1. CRM → Salesforce / HubSpot

**Target:** HubSpot Sales Hub depth for SMB. **Gap:** activity logging, sequences,
lead scoring, reports, custom fields, email/calendar sync, mobile.

- [ ] **Contacts/Accounts depth** — full contact record: company, role, social,
      owner, lifecycle stage, tags, custom fields; account ↔ contacts ↔ deals graph.
  - Data: `Contact`, `Account`, `Deal`, `Activity`, `CustomFieldDef/Value` Prisma models + relations.
- [ ] **Activity timeline** — log calls, emails, meetings, notes per contact/deal; auto-capture from Chat/Calendar; manual quick-add.
- [ ] **Email sequences / cadences** — multi-step templated outreach with delays, open/click tracking, auto-enroll rules; pause-on-reply.
- [ ] **Lead scoring** — rule-based + AI score (fit × engagement); surfaced on pipeline cards and a "hot leads" view.
- [ ] **Forecasting** — promote `ForecastingTab`: probability-weighted pipeline, commit/best-case/worst-case, quota attainment, period roll-up.
- [ ] **Reports & dashboards** — pipeline by stage/owner, win/loss, velocity, conversion funnel, activity volume; saveable + scheduled email.
- [ ] **Automation workflows** — "when deal stage = X, create task / send email / notify channel"; shared engine with Ops/HR (see D3).
- [ ] **Email + calendar sync** — 2-way Gmail/Outlook + Google/O365 calendar; log emails to contacts automatically.
- [ ] **Custom fields & pipelines** — admin-defined fields, multiple pipelines, stage probability config.
- [ ] **Done when:** a rep can run a full cycle — capture lead → score → sequence → log activity → advance stages → forecast → win — without leaving VYNE, and the AI deal coach reads all of it.

### B2. Ops / ERP → Rithmiq / Odoo / NetSuite

**Target:** Odoo Inventory + Manufacturing + Purchase for SMB. **Gap:** order mgmt
depth, SKU detail, POs, real WOs, warehousing, supplier mgmt, barcode, multi-currency.

- [ ] **Order management (sales orders)** — full lifecycle: draft → confirm → pick/pack → ship → deliver → invoice; partial fulfillment, backorders; line-level status. (Detail page exists — extend it.)
- [ ] **Inventory / SKU detail page** — `/ops/inventory/[sku]`: stock by location, movements ledger, reorder point, lead time, valuation (FIFO/avg), supplier links.
- [ ] **Purchase orders** — create PO from low-stock or manually; receive against PO (full/partial); 3-way match (PO ↔ receipt ↔ bill).
- [ ] **Manufacturing / work orders** — BOM → WO → consume components → produce finished goods; routing/operations; WIP. (Today is surface-only.)
- [ ] **MRP (material requirements planning)** — demand (sales orders + forecasts) vs supply (on-hand + POs + WOs) → auto reorder/production suggestions using BOM explosion + lead times; master production schedule; basic capacity/load planning. This is the "MRP" the nav promises.
- [ ] **Warehousing / locations** — multi-location stock, transfers, bin/zone; per-location reorder.
- [ ] **Supplier management** — supplier records, price lists, lead times, performance, linked POs/bills.
- [ ] **Barcode** — scan-to-find / scan-to-adjust (web camera + manual entry); printable SKU labels.
- [ ] **Multi-currency** — currency per order/PO/bill, FX rate snapshot, base-currency reporting.
- [ ] **AI reorder** — extend existing reorder hints into one-click PO drafts with supplier + qty suggestions.
- [ ] **Data:** `Product`, `StockMovement`, `Location`, `PurchaseOrder/Line`, `WorkOrder`, `Supplier`, `BOM/Component` Prisma models.
- [ ] **Done when:** an SMB can run procure → stock → manufacture → sell → fulfill with accurate on-hand and valuation, and "ERP" in the nav is no longer over-promising.

### B3. Finance → QuickBooks / Xero

**Target:** QuickBooks SMB. **Gap:** invoices, journal, bank rec, tax, payroll, multi-entity.

- [ ] **Invoices** — create/send invoices (from sales orders or standalone), payment links (Stripe), status (draft/sent/paid/overdue), reminders, PDF.
- [ ] **Bills / AP** — vendor bills, approval, pay runs; from POs (3-way match).
- [ ] **Journal entries & double-entry ledger** — real GL behind P&L (today P&L is read-only); manual journals, recurring, reversing.
- [ ] **Chart of accounts** — editable COA, account types, mapping rules.
- [ ] **Bank reconciliation** — import (CSV/Plaid), match transactions, rules, reconcile.
- [ ] **Reports** — P&L (from GL), Balance Sheet, Cash Flow, Trial Balance, AR/AP aging, tax summary; period compare; export.
- [ ] **Tax** — tax codes, per-line tax, tax report; (filing = integration/partner later).
- [ ] **Payroll** — basic run (or Gusto/Rippling integration) feeding GL + HR.
- [ ] **Multi-entity + accountant access** — entity switcher, read-only accountant role.
- [ ] **AI anomaly detection** — flag unusual expenses, duplicate bills, margin drift.
- [ ] **Data:** `Account`, `JournalEntry/Line`, `Invoice`, `Bill`, `Payment`, `BankTxn`, `TaxCode`, `Entity` models.
- [ ] **Done when:** P&L is computed from a real ledger, invoices get paid via VYNE, and books reconcile.

### B4. HR → BambooHR / Rippling

**Target:** BambooHR core. **Gap:** leave, payroll, org chart, reviews, onboarding, benefits, time, compliance.

- [ ] **Leave management** — balances, request → approve flow, calendar, accrual policies, holiday calendars.
- [ ] **Org chart** — interactive reporting tree from `managerId`; drag to re-org; export.
- [ ] **Payroll** — run (or integration) → payslips → GL/Finance sync; comp history.
- [ ] **Performance reviews** — cycles, goals, self/peer/manager reviews, ratings.
- [ ] **Onboarding/offboarding** — checklists, doc collection, provisioning tasks (ties to automation engine).
- [ ] **Benefits & compliance** — enrollments, documents, audit log, policy acknowledgements.
- [ ] **Time tracking** — clock in/out or timesheets feeding Projects + Payroll.
- [ ] **Header summary chips** — headcount/active/on-leave/payroll (Phase A3 #16).
- [ ] **Data:** `Employee`, `LeaveRequest/Policy/Balance`, `ReviewCycle/Review`, `OnboardingTask`, `TimeEntry`, `BenefitPlan` models.
- [ ] **Done when:** an SMB can hire → onboard → manage leave/time → review → offboard in VYNE.

### B5. Projects → Linear / Jira / Asana

**Target:** Linear for small eng teams (closest today). **Gap:** roadmap, Gantt, dependencies, time, workflows, GitHub 2-way.

- [ ] **Roadmap** — real `/roadmap` linked from Projects: initiatives → epics → milestones, timeline view.
- [ ] **Gantt / timeline view** — task bars, dependencies, critical path.
- [ ] **Dependencies & blocking** — blocks/blocked-by, surfaced on board + Gantt.
- [ ] **Time tracking** — estimates vs actuals; feeds HR timesheets + Finance billing.
- [ ] **Custom workflows** — per-project statuses, WIP limits, automation triggers.
- [ ] **GitHub 2-way sync** — PR/branch/commit ↔ task status; deploy events into Timeline.
- [ ] **Cycles/sprints depth** — velocity, burndown, carryover (extend AI sprint planner).
- [ ] **Done when:** an eng team runs sprints with dependencies, time, and GitHub linkage — and the AI planner uses all of it.

### B6. Chat → Slack

**Target:** Slack core + ecosystem. **Gap:** integrations, workflow builder, shared/external channels, deep search, canvas, native mobile.

- [ ] **Deep message search** — full-text across channels/DMs/threads/files, filters (from/in/has).
- [ ] **App integrations + incoming webhooks** — post from GitHub/Stripe/Sentry into channels (reuse Timeline sources); slash commands.
- [ ] **Workflow builder** — trigger → steps (message, form, approval) shared with the automation engine (D3).
- [ ] **Shared/external channels** — guest access, per-channel external membership.
- [ ] **Canvas/docs in chat** — attach a Doc to a channel (ties to B7).
- [ ] **Huddles** — promote the existing voice/video button to real LiveKit huddles + recording (recap already exists).
- [ ] **Done when:** Chat is a daily driver: searchable, integrated, automatable.

### B7. Docs → Notion (lightweight)

**Target:** Notion-lite knowledge base. **Gap:** depth, templates, structure, collaboration.

- [ ] **Rich editor depth** — finish TipTap: tables, embeds, code, callouts, slash menu, cover/icon.
- [ ] **Workspace tree** — nested pages, favorites, recents, sharing/permissions.
- [ ] **Templates** — meeting notes, PRD, runbook, onboarding (tie to AI BRD/TRD generation).
- [ ] **Real-time collaboration** — finish Yjs presence/cursors; comments.
- [ ] **Seed data + empty state** — multiple sample docs; CTA when empty (Phase A3 #15).
- [ ] **Done when:** Docs is usable as the company wiki, not a single placeholder.

### B8. Sales (order-to-cash glue)

- [ ] **Quotations → Sales Orders → Invoices** flow wired across CRM/Ops/Finance (CPQ-lite: products, pricing, discounts, approval).
- [ ] **Customers** as shared entity with CRM Accounts + Finance.
- [ ] **Done when:** a quote becomes an order becomes an invoice with no re-entry.

---

## 3.5 Phase B★ — Customization & extensibility: the VYNE Studio (cross-cutting)

> What makes Odoo, NetSuite, and Salesforce sticky is that every customer molds
> the system to their business **without code**. VYNE must match this. The Studio
> is one admin surface (`/settings?panel=studio`) backed by a metadata engine, so
> customization applies uniformly to every module. Build the engine once; every
> module reads it.

**The metadata engine (foundation — build first):**

- [ ] **Entity/field registry** — a DB-backed schema describing every object and
      its fields (built-in + custom), so UI, validation, search, and the API are
      all metadata-driven instead of hard-coded.
  - Data: `EntityDef`, `FieldDef` (type, required, default, options, formula,
    visibility, help), `RecordValue` (EAV or JSONB column) per org.
- [ ] **Org-scoped config store** — all customization keyed by `orgId`; safe
      defaults so a fresh org still works out of the box.

**Customization surfaces (each reads the engine):**

- [ ] **Custom fields** on any entity (Deals, Contacts, Products, Employees,
      Invoices, Tasks…): text/number/date/select/multiselect/currency/boolean/
      relation/formula; required + default + help; per-field permissions.
- [ ] **Custom objects/modules** — admins define brand-new entities (e.g.
      "Assets", "Contracts", "Tickets") with their own fields, list/detail pages,
      and a sidebar entry — no code.
- [ ] **Layout / form builder** — drag fields into sections/columns on each
      entity's detail + create form; show/hide, reorder, conditional visibility.
- [ ] **View builder** — per-entity saved views (list / kanban / calendar /
      gantt / chart), column pick, filters, sort, group-by, sharing; set a
      default view per role. (Extend the existing `useSavedViews`.)
- [ ] **Custom pipelines & statuses** — define stages/statuses per entity
      (deal pipelines, order states, task workflows, ticket states) with colors,
      probabilities, and allowed transitions.
- [ ] **No-code automation builder** — visual trigger → conditions → actions
      (create/update record, send email/Slack, assign, webhook, AI step); the
      single engine that also powers CRM/Ops/HR/Chat/Projects (shared with §5 D3).
- [ ] **Report & dashboard builder** — pick entity + fields + group/aggregate +
      chart type; save, share, schedule-email; pin to My Dashboard.
- [ ] **Roles & permissions (RBAC)** — custom roles; per-module + per-field +
      per-record (ownership/team) read/write/delete; record-level sharing rules.
- [ ] **Number sequences & templates** — configurable doc numbering (INV-, SO-,
      PO-…), branded PDF/email templates per doc type, fiscal-year reset.
- [ ] **Org/localization config** — base currency + multi-currency, languages,
      timezones, fiscal calendar, units of measure, tax rules.
- [ ] **Branding / white-label** — logo, accent + full theming (accent picker
      already exists), custom domain, login branding.
- [ ] **Navigation config** — show/hide/reorder modules per org; rename modules;
      per-role default landing page.
- [ ] **Import/export & API** — CSV import with field mapping per entity (AI
      column-map already prototyped), bulk export, and a public REST/webhook API
      generated from the entity registry so customers extend programmatically.
- [ ] **AI-assisted customization** — "add a 'Renewal date' field to Contracts and
      remind me 30 days before" → the AI proposes the field + automation; admin
      confirms. Turns the Studio into a conversation.
- [ ] **Done when:** an admin can model their own business — new objects, fields,
      layouts, views, pipelines, automations, roles, reports, branding — entirely
      no-code, and every module + the AI respect it immediately.

---

## 4. Phase C — The AI moat (the differentiator)

> This is the only thing no incumbent can copy quickly. Invest here continuously,
> not just once.

- [ ] **Cross-module grounding** — one retrieval layer over CRM + Ops + Finance + HR + Projects + Chat so the AI answers "what should I focus on today?" with real, current data.
- [ ] **Daily brief v2** — proactive, cross-module: overdue deals, low stock, AR risk, sprint slippage, leave conflicts — ranked by $ impact.
- [ ] **Agentic actions** — let the AI _do_ (draft PO, create invoice, advance deal, schedule review) behind confirm dialogs; full audit log.
- [ ] **Per-module copilots** — deepen "Ask AI about ops/deals/projects/finance" with module-specific tools + grounding.
- [ ] **Correlated Timeline intelligence** — auto-explain "GitHub deploy → Sentry error → $X orders at risk" with suggested actions.
- [ ] **Generation suite** — keep extending BRD/TRD/Spec/Diagram/Sheet/Slides; wire outputs into Docs/Projects.
- [ ] **Done when:** a founder opens VYNE and the AI tells them the 3 things that matter today, with one-click actions, grounded in live data.

---

## 5. Phase D — Platform & infra

- [ ] **D1. Native mobile** (or installable PWA) — sidebar collapse, chat, approvals, notifications on the go.
- [ ] **D2. Integrations marketplace** — Gmail/Outlook, Google/O365 Calendar, Stripe, Plaid, GitHub, Gusto/Rippling, Slack-import; OAuth + webhook framework.
- [ ] **D3. Automation/workflow engine** — one shared trigger→condition→action engine powering CRM, Ops, HR, Chat, Projects.
- [ ] **D4. Multi-tenant + RBAC** — org isolation, roles/permissions per module, audit log, accountant/guest roles.
- [ ] **D5. Billing & plans** — Stripe metered plans, seats, usage limits, in-app upgrade (PlanLimitBanner already exists).
- [ ] **D6. Security & compliance** — SSO/SAML, 2FA (otpauth present), data export/delete, SOC2 runway.
- [ ] **D7. Notifications** — unified web-push + email + in-app, per-module preferences.
- [ ] **D8. Search** — global semantic search across all entities (extend GlobalSearch).

---

## 6. Sequencing / milestones

- [ ] **M0 — Launchable (Phase A):** no dead nav, Sales Orders + Finance Invoices real, critical UI fixed, AI front-and-center.
- [ ] **M1 — "Real persistence + Studio foundation":** move modules off local-only
      state to Postgres; ship the metadata engine (entity/field registry, org config) + custom fields/views so B-work is built customization-ready from day one (§3.5).
- [ ] **M2 — "Real CRM + Finance" (B1, B3, B8):** order-to-cash works end to end.
- [ ] **M3 — "Real Ops/ERP + MRP + HR" (B2, B4):** procure→make→sell→fulfill with MRP; hire→manage→offboard.
- [ ] **M4 — "Team OS" (B5, B6, B7):** Projects/Chat/Docs are daily drivers.
- [ ] **M5 — "Full Studio" (rest of §3.5):** custom objects, layout/automation/report
      builders, RBAC, branding, nav config, public API — no-code customization complete.
- [ ] **M6 — "AI moat" (Phase C):** proactive cross-module intelligence + agentic actions.
- [ ] **M7 — "Platform" (Phase D):** mobile, integrations marketplace, billing, security/SSO.
