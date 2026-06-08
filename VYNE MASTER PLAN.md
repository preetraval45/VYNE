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

- [ ] `/sales/quotations` → `/sales?view=quotations`
- [ ] `/sales/orders` → `/sales?view=orders`
- [ ] `/sales/products` → `/sales?view=products`
- [ ] `/sales/customers` → `/sales?view=customers`
- [ ] `/sales/reports` → `/sales?view=reports`
- [ ] `/contacts/dashboard` → `/contacts?view=dashboard`
- [ ] `/ops/inventory` → `/ops?view=inventory`
- [ ] `/ops/orders` → `/ops?view=orders`
- [ ] `/hr/leave` → `/hr?view=leave`
- [ ] `/hr/payroll` → `/hr?view=payroll`
- [ ] `/hr/org-chart` → `/hr?view=orgchart`
- [ ] `/finance/invoices` → **build real page** (table-stakes), not a redirect
- [ ] `/finance/journal` → `/finance?view=journal`
- [ ] `/crm/forecasting` → `/crm?view=forecasting`
- [ ] `/analytics` → build or remove the nav entry (route doesn't exist)
- [ ] `/projects/roadmap` → `/roadmap` (and fix the wrong error surfaced)
- [ ] **Done when:** clicking/typing every nav item in the app resolves to a real screen; add a route-coverage test that asserts no advertised href 404s.

### A2. Critical UI blockers

- [~] **Ops duplicate Overview** — removed the redundant 4 icon-cards from `OverviewTab`; KPI strip is the single overview. _(done this session, pending deploy)_
- [ ] **Docs recent-card title invisible** — fix near-white-on-white title contrast.
- [ ] **404 page has no app shell** — render inside the shell (sidebar/header) or far more prominent "Back to home / Open dashboard" CTAs + search.
- [ ] **Done when:** a new user never hits a screen that looks broken.

### A3. High/medium/polish UI (condensed from the Jun 8 walkthrough — 22 items)

- [ ] Sidebar collapsed-state tooltips on every item (`title`/Radix tooltip).
- [ ] Breadcrumb reflects active sub-section (module > section).
- [ ] Standardize badge/pill style (one token: filled vs outlined).
- [ ] One `formatCurrency` helper (`$96.8K` convention) used app-wide.
- [ ] One shared Export-CSV button style.
- [ ] One exact "Ask AI" green token (contextual == global Vyne AI).
- [ ] Demote "Get app" to ghost/outline.
- [ ] My Dashboard: prominent drag-onboarding affordance (arrow/ghost slot).
- [ ] Chat formatting toolbar: show only on input focus.
- [ ] Ops low-stock names: `title` tooltip / ellipsis-on-hover.
- [ ] Docs: more sample docs or a real empty-state CTA.
- [ ] HR header summary chip row (match Finance/Ops).
- [ ] Calendar "Up Next": wrap or hover full title.
- [ ] OVERVIEW toggle: inline chevron (▼/▲).
- [ ] Projects sidebar "2" badge: pin precisely to icon corner.
- [ ] Sidebar Vyne AI brain icon: integrate into nav flow / brand area.
- [ ] Sample-data banner: soft blue-gray (not success green).
- [ ] Responsive pass: tablet/mobile sidebar, stat-grid reflow, chat UI.

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
- [ ] **M1 — "Real CRM + Finance" (B1, B3, B8):** order-to-cash works end to end.
- [ ] **M2 — "Real Ops + HR" (B2, B4):** procure→make→sell→fulfill; hire→manage→offboard.
- [ ] **M3 — "Team OS" (B5, B6, B7):** Projects/Chat/Docs are daily drivers.
- [ ] **M4 — "AI moat" (Phase C):** proactive cross-module intelligence + agentic actions.
- [ ] **M5 — "Platform" (Phase D):** mobile, integrations, automation, multi-tenant, billing, security.
