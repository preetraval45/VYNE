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
- [ ] Deploy to Vercel

### Priority 2 — Onboarding Wizard ✅ DONE

- **What:** First-time user creates org, picks modules, invites team
- **Why:** First impression = everything
- **Est:** 1-2 days
- [x] Step 1: Company name + industry + size — StepCompany with 9 industries, 5 size buckets
- [x] Step 2: Choose which modules to activate — StepModules with 15 toggleable modules, recommended flags
- [x] Step 3: Invite team members (email list) — StepInvite with add/remove emails + Skip for now
- [x] Step 4: Done — redirect to /home with confetti animation — StepDone with 60-piece Confetti + PATCH /orgs/{id}

### Priority 3 — Wire ERP/Finance to Real APIs
- **What:** Connect ERP, Finance, CRM pages to real backend services
- **Why:** Core value prop needs real data, not fixtures
- **Est:** 3-5 days
- [ ] Inventory CRUD → erp-service
- [ ] Orders CRUD → erp-service
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
- [ ] Usage tracking per tenant
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

### Priority 6 — AI Slash Commands (Real)
- **What:** /approve-order → hits ERP API → confirms order → posts result in chat
- **Why:** Your unique differentiator — no other tool does this
- **Est:** 2-3 days
- [ ] Wire /order [id] → fetch from ERP, show inline card
- [ ] Wire /stock [product] → fetch inventory level
- [ ] Wire /approve [id] → update order status via ERP API
- [ ] Wire /status [service] → fetch from observability
- [ ] Response cards rendered inline in chat

### Priority 7 — Email Notifications
- **What:** Real email delivery for @mentions, assignments, alerts
- **Why:** Retention/engagement driver
- **Est:** 1-2 days
- [ ] Wire notification-service SES templates
- [ ] @mention in chat → email if user offline
- [ ] Issue assigned → email notification
- [ ] Daily digest email (opt-in)

### Priority 8 — Cross-Domain AI Alerts
- **What:** "Deployment failed → 47 orders stuck → $12,400 risk"
- **Why:** The "wow" demo moment that sells VYNE
- **Est:** 2-3 days
- [ ] Wire IncidentAgent to real deployment + order data
- [ ] Auto-post rich embed to #alerts channel
- [ ] Revenue impact calculation from affected orders
- [ ] Rollback suggestion with action button

### Priority 9 — Basic E2E Tests
- **What:** Playwright tests for critical user flows
- **Why:** Confidence to ship fast without breaking things
- **Est:** 1-2 days
- [ ] Auth flow (login → dashboard)
- [ ] Create project → create issue → move status
- [ ] Send message in chat
- [ ] Create doc → edit → save

### Priority 10 — Flip DEMO_MODE Off
- **What:** Set DEMO_MODE=false in vercel.json, go live for real
- **Why:** Real users, real data, real business
- **Est:** 1 day
- [ ] Remove hardcoded DEMO_MODE=true
- [ ] Verify all API connections work
- [ ] Error handling for offline/unavailable services
- [ ] Graceful degradation when a service is down

---

## IMPROVEMENTS & NEW FEATURES (Post-Launch)

### Tier 2 — Competitive Differentiators
- [ ] Real-time collaboration in Docs (Yjs + y-websocket)
- [ ] CSV import/export with real parsing + backend ingestion
- [ ] PDF invoice generation (QuestPDF)
- [ ] AI daily digest auto-posted to #general
- [ ] Smart notifications (AI priority ranking)

### Tier 3 — Growth & Moat
- [ ] Zapier/webhook integrations
- [ ] Public API + API keys for customers
- [ ] Custom drag-and-drop dashboard builder
- [ ] Audit log (who changed what, when)
- [ ] SSO/SAML for enterprise
- [ ] GDPR data export
- [ ] White-label (resellers brand VYNE as their own)
- [ ] Mobile push notifications (SNS → FCM/APNs)
- [ ] QR scanner for inventory
- [ ] Biometric auth on mobile

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

*This is the active implementation plan. Update checkboxes as tasks complete.*
*Last updated: April 7, 2026*
