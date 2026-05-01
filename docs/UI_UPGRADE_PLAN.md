# VYNE UI Upgrade & Per-Page Dashboard Implementation Plan

Goal: turn every page in VYNE into a best-in-class workspace that beats Salesforce / Odoo / HubSpot / SAP / Notion / Linear on UX, AI, and per-function dashboards.

Scope: all 33 dashboard pages under `apps/web/src/app/(dashboard)/`, plus cross-cutting improvements that apply everywhere.

---

## 0. Cross-cutting wins (apply everywhere)

These are the global upgrades that, if done well, define the product feel.

1. **Cmd+K everywhere** — search any record, run any action, jump to any page; AI fall-through when no exact match.
2. **Inline AI on every list view** — "summarize selection," "find similar," "draft email to all," "explain this row."
3. **Optimistic updates + offline mode** — actions feel instant, sync in background.
4. **Per-row hover toolbar** — edit / archive / share / link / duplicate without opening a panel.
5. **Universal export** to CSV / PDF / Excel with current filters preserved.
6. **Bulk operations** on every list — select N → assign / tag / delete / export / move stage.
7. **Saved views per user** with shareable URLs (Linear / Notion-grade).
8. **Activity timeline on every entity** — single source of truth for deal / project / customer / asset.
9. **Keyboard-first navigation** — every action has a shortcut, `?` shows them all.
10. **Mobile parity** — every workflow completable from phone, not a stripped-down second-class view.

### Shared `<PageDashboard />` component (build first)

Every page gets the same top-of-page strip:

```
┌─────────────────────────────────────────────────────────┐
│  [Page Title]              [Time range ▾] [Filters] [+] │
├─────────────────────────────────────────────────────────┤
│  KPI 1  |  KPI 2  |  KPI 3  |  KPI 4  |  KPI 5         │  ← sparkline-embedded tiles
├─────────────────────────────────────────────────────────┤
│  [Primary Chart 60%]      [Secondary Chart 40%]         │  ← collapsible
├─────────────────────────────────────────────────────────┤
│  [Existing list / kanban / table view]                  │  ← what's already there
└─────────────────────────────────────────────────────────┘
```

API:
```tsx
<PageDashboard
  title="..."
  kpis={[{ label, value, delta, sparkline }]}
  primaryChart={<Chart />}
  secondaryChart={<Chart />}
  timeRange={range}
  onRangeChange={...}
/>
```

Single source of truth, drops into every page. ~1 day to build, ~1 day to wire across 33 pages.

---

## 1. [home](apps/web/src/app/(dashboard)/home/page.tsx) — Daily Cockpit

**UI**
- Replace static stat cards with sparkline-embedded KPI tiles (mini 7d trend inside each).
- Drag-to-reorder grid so users pin what matters (revenue, pipeline, alerts, MRR).
- "Today's Focus" panel pinned top — AI-curated 5 items across modules.

**Features**
- **Morning Brief 2.0**: AI reads overnight Slack/email/CRM activity → "Here's what changed while you slept."
- **One-click standup generator** (commits + tasks closed + PRs reviewed).
- **Burnout signal**: detects late-night closing patterns, suggests delegation.
- **Cross-module "what's blocking me"** card.

**Dashboard:** already the meta-dashboard — make it role-aware, pull top widgets from every other module.

---

## 2. [ai](apps/web/src/app/(dashboard)/ai/page.tsx) — AI Workspace

**UI**
- Split-pane: chat left, live artifact right (Claude.ai canvas style).
- Persistent "Pinned answers" column for reusable insights.
- Voice waveform indicator instead of plain mic icon.

**Features**
- **Cross-module agents**: "Find every overdue invoice from clients with open support tickets."
- **Workflow recorder**: user does something once, AI offers to automate it.
- **Document Q&A** across all uploaded files (true RAG with page-number citations).
- **Agent marketplace** — install pre-built agents (lead scorer, invoice chaser, churn predictor).

**Dashboard:** queries today, tokens used, cost MTD, avg response time, tool-call success rate. Charts: usage by model, top 5 agents, cost trend.

---

## 3. [automations](apps/web/src/app/(dashboard)/automations/page.tsx) — Workflow Builder

**UI**
- Visual node graph (n8n / Make.com style) instead of list.
- Live test run side panel with sample data preview.
- Templates gallery with social proof.

**Features**
- **Natural-language → workflow**: "When deal closes >$10k, post to #wins, create onboarding project, send welcome pack."
- **Time-travel debugger**: replay failed automation step-by-step with state inspection.
- **Cost preview** before activation.
- **Branching with A/B test mode**.

**Dashboard:** active automations, runs today, success %, avg execution, hours saved. Charts: runs over time, top failing workflows, ROI per automation.

---

## 4. [chat](apps/web/src/app/(dashboard)/chat/page.tsx) — Slack Killer

**UI**
- Threaded sidebar always-on (not overlay).
- Compact density toggle (Slack/Discord/Twitter).
- Inline rich previews for VYNE entities (paste deal/issue link → embedded card).

**Features**
- **AI Catch-up summary** when reopening channel after >24h.
- **"Decisions" auto-extract** — AI tags decision messages, lists in Decisions tab.
- **Smart mentions**: @sales-on-call routes to whoever is on shift.
- **Voice channels** (Discord-style always-open rooms).
- **Message → Task** in one click with auto-assignee from context.
- **Translate inline** for global teams.

**Dashboard:** unread, mentions, decisions logged, response time, channels active. Charts: message volume by channel, peak hours heatmap, top contributors.

---

## 5. [code](apps/web/src/app/(dashboard)/code/page.tsx) — DevOps

**UI**
- Deployment pipeline visual (commit → build → staging → prod) with live status.
- PR queue sorted by reviewer SLA breach risk.

**Features**
- **AI PR triage**: "this PR touches billing — flag for senior review."
- **Deploy diff explainer**: AI summarizes what changed for non-engineers.
- **Incident link-back**: deploys correlated with error spikes from observability.

**Dashboard:** deploys today, PR queue, avg review time, build success %, MTTR. Charts: DORA metrics (deploy freq, lead time, change failure rate), repo activity.

---

## 6. [contacts](apps/web/src/app/(dashboard)/contacts/page.tsx)

**UI**
- Card view + table view toggle.
- Avatar wall for visual scan.
- Inline enrichment badges (LinkedIn, company logo, last contact).

**Features**
- **Auto-enrich on add** (Clearbit/Apollo-style).
- **Relationship graph view**.
- **Cold contact alerts** when key relationships go silent >60d.
- **Email/calendar sync** so every interaction logs automatically.

**Dashboard:** total, new this week, stale (>60d), enrichment %, with deals. Charts: contacts by source, growth trend, engagement heatmap.

---

## 7. [crm](apps/web/src/app/(dashboard)/crm/page.tsx) — Pipeline

**UI**
- Kanban with weighted column totals (sum of value × probability).
- Drag-to-reschedule with date snap.
- Deal cards show last touch + days idle in red if stale.

**Features**
- **AI deal coach**: "21 days in Negotiation — competitors close in 9. Send these 3 nudge templates."
- **Win/loss reason auto-categorization** with quarterly trends.
- **Forecast tab with scenario sliders**.
- **Email thread auto-attached** to deal.
- **Meeting recap → CRM notes** via Otter/Read.ai.

**Dashboard:** pipeline value, weighted forecast, deals won MTD, win rate, avg cycle. Charts: funnel by stage, forecast vs quota, win/loss reasons, deal velocity.

---

## 8. [docs](apps/web/src/app/(dashboard)/docs/page.tsx)

**UI**
- Notion-style slash menu, nested page tree.
- Reading mode with auto-generated TOC.
- Inline comments + suggestions (Google Docs-style).

**Features**
- **AI doc generator from chat threads**.
- **Stale doc detector** (references removed features).
- **Embed live data** (doc page shows current MRR from finance).
- **Permission inheritance from project**.

**Dashboard:** total, edited this week, stale, top viewed, contributors. Charts: views over time, most-edited pages, orphaned docs list.

---

## 9. [expenses](apps/web/src/app/(dashboard)/expenses/page.tsx)

**UI**
- Receipt drop zone (drag image → AI extracts).
- Approval queue with bulk actions.

**Features**
- **Mobile receipt → auto-categorize → submit** in 2 taps.
- **Policy violation flags** before submission.
- **Corporate card auto-match** (skip receipt entry).
- **Per-project profitability drilldown**.

**Dashboard:** pending approval, MTD spend, policy violations, avg approval time, reimbursed. Charts: spend by category, top spenders, trend vs budget.

---

## 10. [finance](apps/web/src/app/(dashboard)/finance/page.tsx)

**UI**
- P&L with drill-through cells.
- Cashflow waterfall chart, runway gauge.

**Features**
- **AI close assistant** flags miscategorized journal entries.
- **13-week cashflow forecast** (Pulse-grade).
- **Anomaly alerts**: "Marketing spend 3× last month."
- **Bank reconciliation auto-match** with confidence score.
- **Investor-ready PDF export** one-click.

**Dashboard:** runway gauge, burn rate sparkline, cash balance, MRR, gross margin sticky top. Existing P&L below.

---

## 11. [hr](apps/web/src/app/(dashboard)/hr/page.tsx)

**UI**
- Org chart visual (zoomable).
- Headcount planner with drag-and-drop to roles.

**Features**
- **PTO calendar overlay** on team availability.
- **Onboarding checklist auto-generated** by role.
- **1:1 prep AI** pulls last week's blockers, commits, peer feedback.
- **Performance review templates** with AI-suggested goals.

**Dashboard:** headcount, open roles, PTO this week, attrition %, avg tenure. Charts: headcount trend, dept distribution, PTO calendar, hiring funnel.

---

## 12. [invoicing](apps/web/src/app/(dashboard)/invoicing/page.tsx)

**UI**
- Invoice preview live as you edit (split-pane).
- Aging buckets visual (0-30, 31-60, 61-90, 90+).

**Features**
- **AI dunning ladder** writes increasingly firm reminders.
- **Stripe/PayPal/wire collect link** in PDF.
- **Recurring invoices** with usage-based billing.
- **Late-payment risk score** per customer.
- **Multi-currency with auto-FX**.

**Dashboard:** AR outstanding, overdue, DSO, paid MTD, avg payment time. Charts: aging buckets, collection trend, top late customers.

---

## 13. [maintenance](apps/web/src/app/(dashboard)/maintenance/page.tsx)

**UI**
- Equipment status board (green/yellow/red tiles).
- Floor-plan view (upload SVG, click equipment).

**Features**
- **Predictive maintenance** from sensor data.
- **QR codes on equipment** → mobile scan opens WO.
- **Spare parts auto-reorder** when threshold hit.
- **MTBF trends per asset**.

**Dashboard:** open WOs, overdue, MTBF, downtime hrs, asset health %. Charts: WO status breakdown, downtime trend, top failing assets.

---

## 14. [manufacturing](apps/web/src/app/(dashboard)/manufacturing/page.tsx)

**UI**
- Gantt of work orders with capacity per workstation.
- BOM tree view (expandable, sub-assemblies).

**Features**
- **Capacity planner**: "If I take this order, when can I deliver?"
- **Real-time shop-floor view** (operators clock in/out per WO).
- **What-if BOM cost** with material price changes.
- **Quality reject loop** auto-creates CAPA tasks.

**Dashboard:** WOs in progress, on-time %, OEE, scrap rate, throughput. Charts: production trend, station utilization, BOM cost trend.

---

## 15. [marketing](apps/web/src/app/(dashboard)/marketing/page.tsx)

**UI**
- Campaign calendar (drag campaigns across channels).
- Funnel visualization with drop-off % per stage.

**Features**
- **AI copywriter** for email/ad/social with brand voice tuning.
- **A/B test designer** with stat sig auto-callout.
- **UTM builder + auto-attribution** to CRM deals.
- **Audience builder from CRM filters**.

**Dashboard:** MQLs, CAC, campaigns active, conversion %, attributed revenue. Charts: funnel by channel, campaign ROI, traffic source mix.

---

## 16. [observe](apps/web/src/app/(dashboard)/observe/page.tsx)

**UI**
- Service map (auto-discovered, Datadog-grade).
- Heatmap of error rate by endpoint × hour.

**Features**
- **AI incident commander**: alert fires → AI pulls logs, suggests root cause, drafts postmortem.
- **SLO dashboard** with error budget burn rate.
- **Trace → log → metric correlation** in one click.
- **Customer-impact estimator**: "this error hit 47 paying users."

**Dashboard:** SLO burn rate, active incidents, p95 latency sticky top. Existing dashboards below.

---

## 17. [ops](apps/web/src/app/(dashboard)/ops/page.tsx) — Inventory

**UI**
- Stock map by warehouse with heatmap.
- Reorder dashboard as primary view.

**Features**
- **Demand forecast per SKU** (Prophet/LightGBM).
- **ABC/XYZ classification** auto-applied.
- **Multi-warehouse transfer suggestions**.
- **Barcode/RFID mobile scan** for cycle counts.

**Dashboard:** SKUs, low stock, out of stock, inventory value, turnover. Charts: stock by warehouse, reorder alerts, ABC distribution.

---

## 18. [purchase](apps/web/src/app/(dashboard)/purchase/page.tsx)

**UI**
- Approval workflow visual with current step highlighted.
- Vendor scorecards on each PO.

**Features**
- **3-way match auto** (PO ↔ receiving ↔ invoice).
- **Spend-by-vendor analytics** with consolidation suggestions.
- **AI RFQ generator** from a spec.
- **Contract expiry alerts**.

**Dashboard:** open POs, pending approval, MTD spend, avg cycle, top vendor. Charts: spend by vendor, PO status mix, on-time delivery %.

---

## 19. [reporting](apps/web/src/app/(dashboard)/reporting/page.tsx)

**UI**
- Drag-and-drop report builder (Looker Studio style).
- Saved report shelf with sharing + scheduled email.

**Features**
- **Natural-language reports**: "MRR by plan, last 12mo, by region."
- **Embeddable dashboards** (iframe + signed URL).
- **Cross-module joins** (CRM × invoicing × support tickets).
- **Anomaly callouts in every chart**.

**Dashboard:** saved-report shelf with thumbnails sticky top.

---

## 20. [roadmap](apps/web/src/app/(dashboard)/roadmap/page.tsx)

**UI**
- Now / Next / Later columns (ProductBoard-style).
- Timeline + Kanban + List toggle.

**Features**
- **Customer-request → roadmap auto-link** from chat/CRM.
- **Vote weighting by ARR**.
- **Public-facing share URL** with subscribe-to-updates.
- **Competitor parity matrix** with auto-highlighted gaps.

**Dashboard:** items shipped MTD, in progress, customer requests, votes received. Charts: ship velocity, request → shipped funnel, theme distribution.

---

## 21. [sales](apps/web/src/app/(dashboard)/sales/page.tsx)

**UI**
- Quota gauge per rep with pace-vs-target.
- Leaderboard with weekly delta (gamified, tasteful).

**Features**
- **Call recording + AI summary** auto-attached to deal.
- **Email sequences with AI-personalized intros** per recipient.
- **Territory designer** with map view.
- **Commission calculator** transparent to reps.

**Dashboard:** bookings MTD, quota %, calls today, meetings booked, top rep. Charts: rep leaderboard, activity heatmap, quota pace, conversion funnel.

---

## 22. [settings](apps/web/src/app/(dashboard)/settings/page.tsx)

**UI**
- Search across all settings (Cmd+K within settings).
- Settings change audit log visible to admins.

**Features**
- **Per-module enable/disable** with billing impact preview.
- **SSO/SCIM** with one-click providers.
- **API key + webhook builder** with live event tester.
- **White-label** in 3 fields (logo, colors, domain).

**Dashboard:** seats used, modules active, API calls MTD, last backup, security score. Charts: seat utilization, audit log activity, module adoption.

---

## 23. [projects](apps/web/src/app/(dashboard)/projects/page.tsx) + [projectId]

**UI**
- List/Board/Timeline/Calendar view toggle (Linear-grade).
- Inline edit on hover.
- Subtask depth indicator with progress rollup.

**Features**
- **AI sprint planner** (estimate, group by epic, balance load).
- **Dependency graph view** with critical path.
- **Time-tracking inline** (start/stop on task row).
- **Auto-create issues from chat thread** with full context.

**Dashboard:** active projects, on-track %, overdue tasks, velocity, team load. Charts: burndown, velocity trend, status breakdown, risk register.

---

## 24. [calendar](apps/web/src/app/(dashboard)/calendar/page.tsx)

**UI**
- Day/week/month + agenda view.
- Color-by source (CRM / project / personal).

**Features**
- **AI scheduler**: "Find 30min next week with these 4 people."
- **Meeting cost calculator** (attendees × hourly).
- **Auto-prep brief** sent 15min before meeting.
- **No-meeting Friday** policy enforcement.

**Dashboard:** meetings today, hrs in meetings this week, focus time %, no-shows. Charts: meeting load by day, meeting cost, recurring vs one-off.

---

## 25. [activity](apps/web/src/app/(dashboard)/activity/page.tsx)

**UI**
- Filter by user / module / time chips.
- Group by entity ("all changes to Acme Corp deal").

**Features**
- **Audit-grade export** for compliance (SOC2/HIPAA-ready CSV).
- **Anomaly highlights**: "User exported 50× normal records yesterday."

**Dashboard:** events today, top user, top entity, anomalies flagged. Charts: events by module, user activity heatmap, anomaly timeline.

---

## 26. [timeline](apps/web/src/app/(dashboard)/timeline/page.tsx)

**UI**
- Multi-resource Gantt (people, equipment, projects on one axis).
- Zoom from quarter → hour.

**Features**
- **What-if rescheduling** (drag milestone, see downstream impact).
- **Resource conflict highlights**.

**Dashboard:** milestones this month, on-track, at-risk, delayed. Charts: milestone calendar, dependency conflicts, resource utilization.

---

## 27. [timesheet](apps/web/src/app/(dashboard)/timesheet/page.tsx)

**UI**
- Week-grid with drag-to-fill.
- Suggested entries from calendar + commits + tasks closed.

**Features**
- **AI fills 80% of timesheet** from your day's activity.
- **Billable vs non-billable auto-classification**.
- **Direct sync to invoicing** for client billing.

**Dashboard:** hrs logged this week, billable %, utilization, top project. Charts: hrs by project, billable trend, team utilization heatmap.

---

## 28. [training](apps/web/src/app/(dashboard)/training/page.tsx)

**UI**
- Course cards with progress rings.
- Skill tree visual per role.

**Features**
- **AI tutor** answers questions about company docs.
- **Auto-quizzes** generated from uploaded content.
- **Compliance training tracking** with reminder cadence.

**Dashboard:** courses active, completion %, avg score, compliance status, hrs trained MTD. Charts: completion by team, skill gap matrix, compliance expiry calendar.

---

## 29. [playbooks](apps/web/src/app/(dashboard)/playbooks/page.tsx)

**UI**
- Step-by-step guided runner (one card at a time, Tango-style).
- Branching logic visual.

**Features**
- **AI executes playbook steps** (semi-autonomous).
- **Outcome tracking** — which playbooks correlate with deal wins / fast incident resolution.

**Dashboard:** playbooks active, runs MTD, avg completion time, success %, top performer. Charts: playbook usage, outcome correlation, abandonment points.

---

## 30. [runbooks](apps/web/src/app/(dashboard)/runbooks/page.tsx)

**UI**
- Linked from incidents in observe.
- Inline shell command runner (with audit log).

**Features**
- **AI-generated runbook from past incidents**.
- **Auto-suggest runbook** when matching alert fires.

**Dashboard:** runbooks linked to incidents, MTTR delta with vs without, last triggered, success %. Charts: trigger frequency, resolution time impact, top-used runbooks.

---

## 31. [help](apps/web/src/app/(dashboard)/help/page.tsx)

**UI**
- Search-first layout (Algolia-style).
- Chatbot pinned bottom-right.

**Features**
- **AI agent that answers + actions** ("reset my password" → does it).
- **Video walkthroughs** auto-generated from changelogs.

**Dashboard:** tickets open, avg resolution, AI deflection %, CSAT, top topic. Charts: ticket volume trend, deflection rate, top search queries.

---

## 32. [dashboard](apps/web/src/app/(dashboard)/dashboard/page.tsx)

**UI**
- Custom dashboards per role (CEO / Sales lead / Ops / Engineer).
- Widget library with drag-drop.

**Features**
- **Cross-module composite KPIs** (CAC, LTV, gross margin, NPS in one place).
- **Goal tracking** with weekly check-ins.

**This page is the canvas** — make it user-composable with widgets pulled from every other page's KPI set above.

---

## Implementation order (priority)

### Phase 1 — Foundation (1 week)

- [x] **1.1** Build shared `<PageDashboard />` component (KPIs + 2 chart slots + time-range filter). → [PageDashboard.tsx](apps/web/src/components/shared/PageDashboard.tsx)
- [x] **1.2** Build shared `<KpiTile />` with sparkline. → [KpiTile.tsx](apps/web/src/components/shared/KpiTile.tsx)
- [x] **1.3** Build shared `<ChartCard />` wrapper. → [ChartCard.tsx](apps/web/src/components/shared/ChartCard.tsx)
- [x] **1.4** Build `usePageDashboard` hook + time-range types. → [usePageDashboard.ts](apps/web/src/hooks/usePageDashboard.ts)
- [x] **1.5** Build `useSavedViews` hook (URL state + persistence). → [useSavedViews.ts](apps/web/src/hooks/useSavedViews.ts)
- [x] **1.6** Build shared `<HoverRowToolbar />` for inline edit / archive / share / duplicate. → [HoverRowToolbar.tsx](apps/web/src/components/shared/HoverRowToolbar.tsx) + CSS in [globals.css](apps/web/src/app/globals.css)
- [x] **1.7** Audit `<BulkActionsBar />` and pair with `useBulkSelection` hook (range-select, select-all, persistent toolbar). → existing [BulkActionsBar.tsx](apps/web/src/components/shared/BulkActionsBar.tsx) + new [useBulkSelection.ts](apps/web/src/hooks/useBulkSelection.ts)
- [x] **1.8** Add Cmd+K cross-module action handler — registry store + `useRegisterCommands(scope, items)` hook + CommandPalette wiring (scoped commands rank above global). → [commandRegistry.ts](apps/web/src/lib/stores/commandRegistry.ts), [useRegisterCommands.ts](apps/web/src/hooks/useRegisterCommands.ts), [CommandPalette.tsx](apps/web/src/components/layout/CommandPalette.tsx)

### Phase 2 — Wire dashboards into top 10 pages (1 week)

- [x] **2.1** home — `<PageDashboard />` with sparkline KPIs replaces fixture stats grid; registers Cmd+K commands. → [home/page.tsx](apps/web/src/app/(dashboard)/home/page.tsx)
- [x] **2.2** crm — `<PageDashboard />` with real KPIs (pipeline value, weighted forecast, won revenue, win rate) computed from store; 14-day forecast sparkline; 4 Cmd+K commands. → [crm/page.tsx](apps/web/src/app/(dashboard)/crm/page.tsx)
- [x] **2.3** sales — 5-KPI dashboard (open pipeline, weighted forecast, order revenue, quote win rate, customers) with 14-day order revenue sparkline; 4 Cmd+K commands. → [sales/page.tsx](apps/web/src/app/(dashboard)/sales/page.tsx)
- [x] **2.4** projects — 4-KPI dashboard (active projects, tasks completed with 14d sparkline, in progress, overdue) + 2 Cmd+K commands. → [projects/page.tsx](apps/web/src/app/(dashboard)/projects/page.tsx)
- [x] **2.5** finance — 5-KPI dashboard (revenue MTD with delta, expenses, profit, margin, draft entries) using monthly P&L series for sparklines + 3 Cmd+K commands. → [finance/page.tsx](apps/web/src/app/(dashboard)/finance/page.tsx)
- [x] **2.6** ops — 6-KPI dashboard (SKUs, low stock, out of stock, inventory value, pending orders with sparkline, active WOs) + 4 Cmd+K commands. → [ops/page.tsx](apps/web/src/app/(dashboard)/ops/page.tsx)
- [x] **2.7** invoicing — 5-KPI dashboard (AR outstanding, overdue, paid MTD with sparkline, DSO, drafts) + 4 Cmd+K commands. → [invoicing/page.tsx](apps/web/src/app/(dashboard)/invoicing/page.tsx)
- [x] **2.8** ai — page itself is the AI dashboard (chat + live insights sidebar); top-strip dashboard intentionally skipped to preserve chat UX. Added 4 Cmd+K commands (focus input, toggle insights, suggested queries, export latest as MD). → [ai/page.tsx](apps/web/src/app/(dashboard)/ai/page.tsx)
- [x] **2.9** automations — replaced legacy `KpiStrip` with shared `<PageDashboard />` (active, runs with 14d sparkline, success rate, hours saved) + 2 Cmd+K commands. → [automations/page.tsx](apps/web/src/app/(dashboard)/automations/page.tsx)
- [x] **2.10** observe — 5-KPI dashboard (services healthy/total, error rate, p95 latency, request volume sparkline, active alerts) + 4 Cmd+K commands. → [observe/page.tsx](apps/web/src/app/(dashboard)/observe/page.tsx)

### Phase 3 — Wire dashboards into remaining 23 pages (1 week)

- [x] **3.1** chat — split-pane (sidebar+chat) preserved; top-strip dashboard intentionally skipped to keep the Slack-style UX. 3 Cmd+K commands (new channel, AI catch-up, jump to #general). → [chat/page.tsx](apps/web/src/app/(dashboard)/chat/page.tsx)
- [x] **3.2** code — 4-KPI dashboard (deploys with 14d sparkline, build success rate, open PRs, repos) + 3 Cmd+K commands. → [code/page.tsx](apps/web/src/app/(dashboard)/code/page.tsx)
- [x] **3.3** contacts — 4-KPI dashboard (accounts, contacts, stale 60d+, account revenue) + 3 Cmd+K commands. → [contacts/page.tsx](apps/web/src/app/(dashboard)/contacts/page.tsx)
- [x] **3.4** docs — 4-KPI dashboard (total, edited this week, stale 90d+, root pages) on welcome view (preserves editor real-estate when a doc is open) + 2 Cmd+K commands. → [docs/page.tsx](apps/web/src/app/(dashboard)/docs/page.tsx)
- [x] **3.5** expenses — 4-KPI dashboard (MTD spend with 14d sparkline, pending approval, drafts, reimbursed) + 3 Cmd+K commands. → [expenses/page.tsx](apps/web/src/app/(dashboard)/expenses/page.tsx)
- [x] **3.6** hr — 5-KPI dashboard (headcount, remote, on leave, pending leave, payroll) + 3 Cmd+K commands. → [hr/page.tsx](apps/web/src/app/(dashboard)/hr/page.tsx)
- [x] **3.7** maintenance — replaced legacy `KPICard` row with shared `<PageDashboard />` (equipment, active requests, overdue, open WOs, uptime) + 3 Cmd+K commands. → [maintenance/page.tsx](apps/web/src/app/(dashboard)/maintenance/page.tsx)
- [x] **3.8** manufacturing — 5-KPI dashboard (MOs in progress, done, active BOMs, work centers, QC pass rate) + 3 Cmd+K commands. → [manufacturing/page.tsx](apps/web/src/app/(dashboard)/manufacturing/page.tsx)
- [x] **3.9** marketing — 4-KPI dashboard (active campaigns, leads, budget, avg ROI) + 3 Cmd+K commands. → [marketing/page.tsx](apps/web/src/app/(dashboard)/marketing/page.tsx)
- [x] **3.10** purchase — 4-KPI dashboard (open POs, PO value, active vendors, unpaid bills) + 3 Cmd+K commands. → [purchase/page.tsx](apps/web/src/app/(dashboard)/purchase/page.tsx)
- [x] **3.11** reporting — page is itself the report-builder dashboard; top-strip skipped to avoid redundancy. 3 Cmd+K commands (new report, ask in natural language, schedule email). → [reporting/page.tsx](apps/web/src/app/(dashboard)/reporting/page.tsx)
- [x] **3.12** roadmap — 4-KPI dashboard (shipped, in progress, planned, under consideration) + 3 Cmd+K commands. → [roadmap/page.tsx](apps/web/src/app/(dashboard)/roadmap/page.tsx)
- [x] **3.13** settings — sidebar+panel layout preserved; top-strip dashboard skipped. All 15 settings panels registered as Cmd+K commands ("Settings: General", "Settings: Members", …) for instant deep-link. → [settings/page.tsx](apps/web/src/app/(dashboard)/settings/page.tsx)
- [x] **3.14** calendar — 4-KPI dashboard (today, this week, focus blocks, total events) + 4 Cmd+K commands. → [calendar/page.tsx](apps/web/src/app/(dashboard)/calendar/page.tsx)
- [x] **3.15** activity — 4-KPI dashboard (events, today, warnings, critical) + 2 Cmd+K commands. → [activity/page.tsx](apps/web/src/app/(dashboard)/activity/page.tsx)
- [x] **3.16** timeline — 4-KPI dashboard (events, today, deploys, incidents) + 2 Cmd+K commands. → [timeline/page.tsx](apps/web/src/app/(dashboard)/timeline/page.tsx)
- [x] **3.17** timesheet — 4-KPI dashboard (today, this week, total, issues) + 2 Cmd+K commands. → [timesheet/page.tsx](apps/web/src/app/(dashboard)/timesheet/page.tsx)
- [x] **3.18** training — 3-KPI dashboard (progress, time spent, status) + 2 Cmd+K commands. → [training/page.tsx](apps/web/src/app/(dashboard)/training/page.tsx)
- [x] **3.19** playbooks — 4-KPI dashboard (active, in flight, total runs, avg conversion) + 1 Cmd+K command. → [playbooks/page.tsx](apps/web/src/app/(dashboard)/playbooks/page.tsx)
- [x] **3.20** runbooks — split-pane sidebar+detail preserved; top-strip skipped. Each runbook registered as Cmd+K command + simulate/reset actions. → [runbooks/page.tsx](apps/web/src/app/(dashboard)/runbooks/page.tsx)
- [x] **3.21** help — 3-KPI dashboard (articles, categories, filtered) + 2 Cmd+K commands. → [help/page.tsx](apps/web/src/app/(dashboard)/help/page.tsx)
- [x] **3.22** dashboard — page IS the user-composable widget canvas; top-strip skipped (redundant). 2 Cmd+K commands (save layout, reset to default). → [dashboard/page.tsx](apps/web/src/app/(dashboard)/dashboard/page.tsx)
- [x] **3.23** projects/[projectId] — 5-KPI dashboard (total tasks, in progress, blocked, overdue, progress %) + 3 Cmd+K commands (board view, list view, back to projects). Scope key is `project-${projectId}` so commands are scoped per project. → [projects/[projectId]/page.tsx](apps/web/src/app/(dashboard)/projects/[projectId]/page.tsx)

### Phase 4 — High-leverage AI features (2 weeks)

- [x] **4.1** Cross-module AI agent — added 5 query tools (queryDeals, queryTasks, queryInvoices, queryContacts, queryProducts) to TOOL_CATALOG + executor. The agent can now answer "find every overdue invoice from clients with open tasks" by chaining read tools, then chain follow-up writes (updateDeal, createTask) using returned ids. → [tools/route.ts](apps/web/src/app/api/ai/tools/route.ts), [toolExecutor.ts](apps/web/src/lib/ai/toolExecutor.ts)
- [x] **4.2** AI deal coach on CRM — surfaces top 3 stalled deals (idle vs. stage-specific median), explains why they're at risk, and links to AI for a personalized re-engagement draft. Computed locally from deal store; visible only when stalled deals exist. → [DealCoachCard.tsx](apps/web/src/components/crm/DealCoachCard.tsx) wired in [crm/page.tsx](apps/web/src/app/(dashboard)/crm/page.tsx)
- [x] **4.3** AI close assistant on finance — flags drafts aged 7d+, round-number entries (placeholders), and same-day duplicate descriptions (potential double-posts) as month-end close blockers. Visible on both P&L and Journal tabs. → [CloseAssistantCard.tsx](apps/web/src/components/finance/CloseAssistantCard.tsx) wired in [finance/page.tsx](apps/web/src/app/(dashboard)/finance/page.tsx)
- [x] **4.4** AI sprint planner on projects — recommends a balanced sprint by scoring open tasks (priority + age) and packing them into team capacity (30h/person/sprint). Shows top 6 tasks, hours, assignees, and a load indicator (balanced / tight / over). → [SprintPlannerCard.tsx](apps/web/src/components/projects/SprintPlannerCard.tsx) wired in [projects/page.tsx](apps/web/src/app/(dashboard)/projects/page.tsx)
- [x] **4.5** AI catch-up on chat — already shipped: `SmartCatchupBar` (top of `ChatArea`) tracks per-channel last-read in localStorage, shows a "Brief me" banner when ≥3 unread messages exist, calls `/api/ai/catchup` (Claude/Groq with localFallback), renders headline + bullets + mention count. → [SmartCatchupBar.tsx](apps/web/src/components/chat/SmartCatchupBar.tsx), [api/ai/catchup/route.ts](apps/web/src/app/api/ai/catchup/route.ts)
- [x] **4.6** AI dunning ladder on invoicing — bins each overdue invoice into Friendly / Firm / Final notice / Collections by days overdue (0/14/30/60). Pre-drafts an escalating template per stage and links to AI to refine before sending. → [DunningLadderCard.tsx](apps/web/src/components/invoicing/DunningLadderCard.tsx) wired in [invoicing/page.tsx](apps/web/src/app/(dashboard)/invoicing/page.tsx)
- [x] **4.7** AI incident commander on observe — surfaces critical+warning alerts, names the most likely runbook (DB / latency / errors / auth) and links to the AI page with a primed prompt that asks for root cause, mitigations, paging plan, and a draft status-page update. → [IncidentCommanderCard.tsx](apps/web/src/components/observe/IncidentCommanderCard.tsx) wired in [observe/page.tsx](apps/web/src/app/(dashboard)/observe/page.tsx)

### Phase 5 — Module-specific UI (2-3 weeks)

- [x] **5.1** Kanban with weighted column totals (CRM) — column header now shows raw `$total`, weighted `≈ $value × probability`, % of overall pipeline, and a tiny share-of-pipeline bar. Won pins to 100%, Lost suppresses the weighted line. → [crm/page.tsx](apps/web/src/app/(dashboard)/crm/page.tsx)
- [x] **5.2** Visual workflow node graph (automations) — new "Visual Graph" tab on the detail panel renders Trigger → Conditions → Actions → End as connected node cards with color-coded variants and config previews. Auto-derived from the same automation state the editor uses. → [WorkflowGraph.tsx](apps/web/src/components/automations/WorkflowGraph.tsx) wired in [AutomationDetailPanel.tsx](apps/web/src/components/automations/AutomationDetailPanel.tsx)
- [x] **5.3** Service map (observe) — SVG topology auto-discovers a hub-and-spoke layout (api-gateway centered, frontends inbound, backends outbound). Nodes color-coded by health (healthy/degraded/down) with p95 + error rate inline. Renders at the top of the Overview tab. → [ServiceMap.tsx](apps/web/src/components/observe/ServiceMap.tsx) wired in [observe/page.tsx](apps/web/src/app/(dashboard)/observe/page.tsx)
- [x] **5.4** Org chart visual (HR) — replaced the hardcoded 3-level tree with a recursive `<OrgChartTree>` that handles arbitrary depth, color-codes nodes by department, and adds zoom controls (+/-/reset) for large orgs. → [OrgChartTree.tsx](apps/web/src/components/hr/OrgChartTree.tsx) wired in [hr/page.tsx](apps/web/src/app/(dashboard)/hr/page.tsx)
- [x] **5.5** Multi-resource Gantt (timeline) — swimlane Gantt with one row per source (GitHub / Stripe / VYNE / Sentry / etc.), 24h/7d/30d range toggle, severity-coded markers (yellow/red for sev≥2/3 with halo), and a 6-tick axis. → [GanttSwimlanes.tsx](apps/web/src/components/timeline/GanttSwimlanes.tsx) wired in [timeline/page.tsx](apps/web/src/app/(dashboard)/timeline/page.tsx)
- [x] **5.6** Aging buckets visual (invoicing) — stacked horizontal bar (Current / 0-30 / 31-60 / 61-90 / 90+) with color-coded bucket tiles (count, $ total, % of AR). Distinct from finance's `ARAgingCard` — drops above the dunning ladder on the Invoices tab. → [AgingBucketsCard.tsx](apps/web/src/components/invoicing/AgingBucketsCard.tsx) wired in [invoicing/page.tsx](apps/web/src/app/(dashboard)/invoicing/page.tsx)
- [x] **5.7** Funnel visualization (marketing) — generic `<FunnelCard />` renders proportional bars (Visitors → MQL → SQL → Opportunity → Won), shows stage-to-stage conversion %, and flags drop-offs >50%. Wired into the Analytics tab. → [FunnelCard.tsx](apps/web/src/components/marketing/FunnelCard.tsx) wired in [marketing/page.tsx](apps/web/src/app/(dashboard)/marketing/page.tsx)

### Phase 6 — Polish (1 week)

- [x] **6.1** Mobile parity sweep — added responsive overrides ≤640px: PageDashboard tiles 2-col, charts stack, BulkActionsBar full-width, HoverRowToolbar drops raised styling and sits below the row, ServiceMap/WorkflowGraph horizontal-scroll, AgingBuckets 2-col tiles, FunnelCard labels wrap. Coarse-pointer hit targets bumped to 36×36. → [globals.css](apps/web/src/app/globals.css)
- [x] **6.2** Keyboard shortcuts pass — added "Lists & rows" and "Dashboards" sections to `?` modal; wired Alt+1 / Alt+7 / Alt+3 to switch dashboard range to 24h / 7d / 30d (skips when focus is in input/textarea/contenteditable). → [KeyboardShortcutsModal.tsx](apps/web/src/components/layout/KeyboardShortcutsModal.tsx), [usePageDashboard.ts](apps/web/src/hooks/usePageDashboard.ts)
- [x] **6.3** Saved-view URLs wired — built shared `<SavedViewsBar />` (chips for built-ins + user views, save / pin / delete / copy share URL). Wired into CRM as the reference; same pattern drops into projects/invoicing/contacts/ops without per-page changes thanks to `useSavedViews`. → [SavedViewsBar.tsx](apps/web/src/components/shared/SavedViewsBar.tsx) wired in [crm/page.tsx](apps/web/src/app/(dashboard)/crm/page.tsx)
- [x] **6.4** Audit-grade exports — new `exportToCSVAudit` prepends a comment-style manifest (noun, generatedAt, user, rowCount, view, filters, FNV-1a checksum, columns) so SOC2/HIPAA reviewers can verify integrity. `<ExportButton audit={…} />` opt-in. Wired into CRM as reference. → [csv.ts](apps/web/src/lib/utils/csv.ts), [ExportButton.tsx](apps/web/src/components/shared/ExportButton.tsx), [crm/page.tsx](apps/web/src/app/(dashboard)/crm/page.tsx)
- [x] **6.5** Empty states on every new component — built `<InlineEmptyState />` (compact card-friendly placeholder). Wired into DealCoachCard, CloseAssistantCard, DunningLadderCard, IncidentCommanderCard so the AI assistants render a "all clear" message instead of vanishing when there's nothing to flag. → [InlineEmptyState.tsx](apps/web/src/components/shared/InlineEmptyState.tsx)
- [x] **6.6** Loading skeletons on every dashboard — `<PageDashboard loading />` renders 4 KPI shimmer tiles (transform-only animation, GPU-composited, respects `prefers-reduced-motion`). Drops in for any page that gates on async data. → [PageDashboard.tsx](apps/web/src/components/shared/PageDashboard.tsx) + shimmer keyframes in [globals.css](apps/web/src/app/globals.css)
- [x] **6.7** Accessibility sweep — `<KpiTile />` now emits a single composite `aria-label` (label + value + delta + hint) and `role="group"` for non-button tiles. Added focus-visible rings across all Phase 4–5 components (saved views, AI cards, dashboard, hover toolbar, bulk actions). Reduced-motion honors disable transitions/animations across the new component family. → [KpiTile.tsx](apps/web/src/components/shared/KpiTile.tsx), [globals.css](apps/web/src/app/globals.css)

### Phase 7 — Theming & personalization (in progress)

Lets every user own the look of their workspace. CSS-variable single-source-of-truth means a colour change cascades across sidebar, FAB, focus rings, KPI tiles, badges, link colour, gradient avatars, and stage chips automatically.

- [x] **7.1** Accent colour store + applier — added `customAccentHex` to `useThemeStore` (zustand + persist v3 migration). `ThemeApplier` derives light/dark variants via sRGB blend and writes the full `--vyne-accent-*` / `--vyne-teal-*` token family to `:root`, so legacy code keeps working. → [theme.ts](apps/web/src/lib/stores/theme.ts), [ThemeApplier.tsx](apps/web/src/components/layout/ThemeApplier.tsx)
- [x] **7.2** Expanded preset palette — bumped `ACCENT_COLORS` from 6 to **14 named presets** (Cyan, Blue, Teal, Red, Orange, Green, Indigo, Pink, Yellow, Violet, Lime, Rose, Amber, Sky). Each preset ships `primary / light / dark` so the picker doesn't need to compute variants. → [theme.ts](apps/web/src/lib/stores/theme.ts)
- [x] **7.3** Full Tailwind-style colour chart — sidebar `<AccentPicker />` now shows a 17-hue × 5-shade grid (Slate → Rose, 300 / 400 / 500 / 600 / 700) for **85 ready-made swatches**, plus a hex text input (commits on Enter/blur) and a Reset button. Native `<input type="color">` overlay gives any-hex picking. → [Sidebar.tsx](apps/web/src/components/layout/Sidebar.tsx)
- [x] **7.4** Picker overflow fix — sidebar has `overflow: hidden` which was clipping the wide popup so users only saw the first 6 swatches. Switched popup to `position: fixed` anchored via `useRef + getBoundingClientRect`, plus click-outside dismiss, viewport clamping, and re-position on scroll/resize. → [Sidebar.tsx:778](apps/web/src/components/layout/Sidebar.tsx#L778)
- [ ] **7.5** Logo / favicon override — let workspace admins upload a custom logomark + favicon (per-tenant brand). Persist via Settings → Branding (already has `accentColor` field — extend with `logoUrl` and `faviconUrl`). Wire `<head>` to read tenant favicon at the app root.
- [x] **7.6** Density modes — Compact / Comfortable / Spacious toggle in Settings → Appearance. ThemeApplier sets `data-density` on `<html>` and writes a token family (`--density-row-h`, `--density-pad-card`, `--density-gap`, `--density-font`); existing globals.css `[data-density]` selectors flip `--density-row-py/px/fs` instantly. Persisted in zustand v4 migration. → [theme.ts](apps/web/src/lib/stores/theme.ts), [ThemeApplier.tsx](apps/web/src/components/layout/ThemeApplier.tsx), [GeneralSettings.tsx](apps/web/src/components/settings/GeneralSettings.tsx)
- [ ] **7.7** Per-module accent override — power users may want CRM teal but Finance amber. Add a `moduleAccents: Record<ModuleId, AccentColor | hex>` map; `ThemeApplier` listens to route changes and rebinds `--vyne-accent-*` per module.
- [ ] **7.8** Custom font picker — Inter (default) / IBM Plex Sans / SF Pro / Geist / JetBrains Mono (for code-heavy users). Loads via `next/font` and writes `--font-sans` to `:root`.
- [ ] **7.9** Wallpaper / sidebar texture — subtle gradient or pattern behind the sidebar so workspaces feel distinct (Notion-style). Off by default; opt-in from Settings → Appearance.
- [x] **7.10** Theme presets — 8 curated bundles (VYNE / Linear / Notion / Salesforce / GitHub / Stripe / Solarized / Rose noir) in Settings → Theme presets. Each click sets `theme + accent + customHex + density` in one shot. → [GeneralSettings.tsx](apps/web/src/components/settings/GeneralSettings.tsx)
- [ ] **7.11** Export / import theme JSON — copy a workspace theme to clipboard or import a teammate's; powers a future "themes gallery" community share.
- [x] **7.12** Custom workspace background — added `customBgHex` to theme store. ThemeApplier rebinds the surface family (`--bg`, `--content-bg`, `--content-elevated`, `--content-border`, `--sidebar-bg`, `--input-bg`) and derives elevated/border tones by lightening or darkening the chosen hex based on perceived luminance, so light or dark backgrounds both look right. Sidebar accent picker now has Accent / Background tabs with 16 curated presets (8 dark + 8 light) and a hex input + native picker. → [theme.ts](apps/web/src/lib/stores/theme.ts), [ThemeApplier.tsx](apps/web/src/components/layout/ThemeApplier.tsx), [Sidebar.tsx](apps/web/src/components/layout/Sidebar.tsx)

### Phase 8 — Inline edit, bulk ops, presence (planned)

The remaining cross-cutting wins from §0 that aren't yet wired everywhere.

- [ ] **8.1** Inline edit on every list view — double-click any cell (CRM deals, projects tasks, invoices line items, ops products) to edit in place; Enter saves, Esc cancels, optimistic update with toast on rollback.
- [ ] **8.2** Bulk actions universal sweep — `<BulkActionsBar />` is shipped (CRM); replicate across projects, contacts, invoicing, ops, sales, expenses with the standard select-all / shift-click range / Ctrl-click cherry-pick pattern.
- [ ] **8.3** Multi-user presence indicators — show avatar bubbles on rows / records currently being viewed by another teammate (Linear/Notion-style). Reuse existing LiveKit channel for ephemeral presence broadcast.
- [ ] **8.4** Optimistic updates everywhere — extract the `optimisticAction` helper that wraps mutation + rollback + toast, apply uniformly so no list view ever shows a spinner on a row update.
- [ ] **8.5** Offline mode — IndexedDB queue of mutations + service worker that replays on reconnect. "You're offline · 3 changes queued" banner.
- [ ] **8.6** Universal share-link generator — every entity (deal, task, invoice, runbook, dashboard) gets a short shareable URL with a QR-code popover from the kebab menu.

### Phase 9 — Mobile parity (planned)

- [ ] **9.1** Bottom nav for mobile — replace sidebar with a 5-tab bottom nav (Home / Search / +Create / Notifications / Me) when viewport ≤ 640px.
- [ ] **9.2** Pull-to-refresh on every list view.
- [ ] **9.3** Swipe actions on rows (left=archive, right=star) parallel to HoverRowToolbar on desktop.
- [ ] **9.4** Mobile-native command palette — `+Create` tab launches the Cmd+K experience adapted for thumb input.
- [ ] **9.5** Phone-completable workflows audit — walk every page on a real device, flag any flow that requires desktop, and cut the gap.

---

## Top-5 highest-leverage upgrades (if you only ship a few)

1. **Cmd+K with cross-module actions + AI fall-through** — defines the product.
2. **Cross-module AI agent** that can read/write across CRM, projects, finance, ops.
3. **Inline edit + bulk actions + per-page dashboards** on every list view.
4. **Saved views + shareable URLs** for every list.
5. **Mobile feature parity** — every workflow completable from phone.

---

## File structure (proposed)

```
apps/web/src/components/shared/
  PageDashboard.tsx          ← shared KPI strip + chart slots
  HoverRowToolbar.tsx        ← inline row actions
  BulkActionBar.tsx          ← select-N actions
  SavedViews.tsx             ← URL-state saved views
  KpiTile.tsx                ← sparkline-embedded tile
  ChartCard.tsx              ← consistent chart wrapper

apps/web/src/lib/hooks/
  usePageDashboard.ts        ← KPI fetch + time range
  useSavedViews.ts           ← URL state + persistence
  useBulkSelection.ts        ← select-N state

apps/web/src/lib/dashboards/
  home.ts, crm.ts, sales.ts, ...  ← per-page KPI definitions
```

Each page imports `<PageDashboard />` and its KPI definitions, drops in above existing content. Net change per page: ~10 lines.
