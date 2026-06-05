# VYNE — Phase Implementation Prompts

## Give These Prompts to Claude to Build Each Phase

**Version 2.0 — Updated March 2026**

> **CURRENT STATUS (March 2026):** Full MVP v2 is built and demo-ready. All modules live:
> Chat + AI slash commands (Slack++) · Projects with Kanban DnD · Docs editor · ERP/MRP ·
> Finance · Code/DevOps · Observability/Metrics · HR + Payroll · CRM Pipeline + Forecasting ·
> Expenses + Approvals · AI BI Dashboard · Automations/Workflow Builder · Admin Panel ·
> Mobile (Home + Chat + Projects + Finance + ERP tabs) · Light/Dark mode · Roadmap ·
> CommandPalette (⌘K) with all 30+ commands · Vercel deployment config
>
> **HOW TO USE THIS FILE:**
>
> 1. Open a new Claude conversation in the VYNE project directory
> 2. Copy the entire prompt for the phase you want to build
> 3. Paste it — Claude will build that phase completely
> 4. Each prompt is self-contained with all context needed

---

## MASTER CONTEXT BLOCK (v2 — always include this)

Include this at the top of EVERY phase prompt.

```text
VYNE PROJECT CONTEXT (v2 — March 2026):
- Product: Vyne — AI-native Company Operating System
  Replaces: Slack + Jira + Notion + GitHub + Datadog + Odoo in ONE platform
- Stack: TypeScript (Next.js 15 + Node.js Fastify) | C# .NET 9 | Python 3.12 FastAPI
- Mobile: React Native + Expo SDK 52 (apps/mobile — BUILT)
- Cloud: AWS only (ECS Fargate, Aurora PostgreSQL Serverless v2, ElastiCache Valkey, Bedrock,
  Cognito, EventBridge, SQS, ECR, ALB, Route53, ACM, SES, SNS, S3, Secrets Manager)
- Database: PostgreSQL 17 + pgvector + TimescaleDB
- Auth: AWS Cognito + Custom JWT + PostgreSQL RLS for multi-tenancy
- Package manager: pnpm workspaces + Turborepo
- CI/CD: GitHub Actions + ECR + ArgoCD + Argo Rollouts (canary)
- IaC: Terraform (modular, S3 state + DynamoDB lock)
- AI: AWS Bedrock (Claude 3.5 Sonnet + Titan Embeddings v2) + LangGraph multi-step agents
- Design tokens: Dark sidebar #1C1C2E · Content bg uses var(--content-bg) · Brand purple #6C47FF
  Supports LIGHT + DARK mode via CSS custom properties + data-theme attribute on <html>
- SonarQube rules enforced: S1128 (unused imports), S6759 (Readonly props), S3358 (nested ternaries),
  S6848 (non-native interactive), S7773 (Number.parseInt), S7781 (replaceAll), S6853 (label a11y)
- Demo mode: all pages have mock data fallback when backend unavailable
- Solo developer building a startup — optimize for speed AND production quality

WHAT IS ALREADY BUILT (do not rebuild):
- apps/web pages: home, chat (+ AI slash commands), projects, docs, ops, finance, code,
  observe, settings, roadmap, crm, hr, expenses, ai (BI dashboard), automations, admin
- apps/mobile tabs: home, chat, projects, profile, finance, erp (Expo Router v4)
- services: api-gateway, messaging-service, erp-service, projects-service, ai-service,
  observability-service, notification-service
- Theme system: Zustand theme store (light/dark), ThemeApplier component, CSS variables in globals.css
- Auth store: useAuthStore with login(), signup(), setUser(), setToken(), logout()
- API client: src/lib/api/client.ts — authApi, messagingApi, erpApi, codeApi, docsApi, usersApi
- CommandPalette: ⌘K global palette with 30+ commands across all modules
- vercel.json: one-click deploy to Vercel from apps/web/
```

---

## PHASE 5 — ADVANCED ERP MODULES (Beat Odoo)

### Prompt P5-A - CRM Pipeline + Lead Management

```text
[PASTE MASTER CONTEXT BLOCK HERE]

Build a full CRM Pipeline module for VYNE that is faster and more intuitive than Odoo CRM.

TARGET FILE: apps/web/src/app/(dashboard)/crm/page.tsx (NEW FILE)
Also add 'CRM' nav item to apps/web/src/components/layout/Sidebar.tsx under Business section.

WHAT TO BUILD:
1. PIPELINE VIEW — Kanban-style drag-and-drop pipeline:
   - Columns: Lead → Qualified → Proposal → Negotiation → Won → Lost
   - Each card shows: company name, deal value, probability %, assignee avatar, next activity date
   - Color coding: green (won), red (lost), amber (at risk = no activity 7+ days)
   - Click card → right-side panel with full deal details

2. LEADS TABLE — list view with:
   - Name, company, email, phone, source, stage, value, last contact, assignee
   - Filters: stage, assignee, source (website/referral/outbound/inbound), date range
   - Quick actions: Call, Email, Create Proposal, Mark Won/Lost
   - Import from CSV button

3. DEAL DETAIL PANEL — slide-over from right:
   - Contact info + company info sections
   - Deal value + probability + expected close date
   - Activity timeline (calls logged, emails sent, notes added)
   - Files attached
   - Next action + reminder
   - Convert to Order button (creates ERP sales order from won deal)

4. FORECASTING SIDEBAR:
   - This month pipeline value by stage
   - Win rate last 90 days
   - Average deal size
   - Top performing rep

5. MOCK DATA: 8 leads across all stages, realistic company names and deal values.

DESIGN: Match existing VYNE style (inline styles, no Tailwind classes for layout).
All component props must use Readonly<{...}>. No nested ternaries — extract to variables/functions.
Add to Sidebar under Business section with icon "🎯".
```

---

### Prompt P5-B - HR + Payroll Module

```text
[PASTE MASTER CONTEXT BLOCK HERE]

Build an HR module for VYNE that replaces BambooHR/Rippling for SMBs.

TARGET FILE: apps/web/src/app/(dashboard)/hr/page.tsx (NEW FILE)

TABS TO BUILD:
1. EMPLOYEES — employee directory:
   - Card grid: avatar, name, role, department, location, email, phone
   - Status: active/on-leave/remote
   - Click → employee profile modal with full details + history

2. ORG CHART — visual hierarchy:
   - Tree diagram showing reporting structure
   - Drag to reassign (optimistic update)

3. LEAVE MANAGEMENT:
   - Leave balance per employee (vacation, sick, personal)
   - Leave request approval workflow (Approve / Reject buttons)
   - Calendar view of who is out when

4. PAYROLL:
   - Payroll run table: employee, base salary, deductions, bonuses, net pay
   - Run Payroll button (triggers calculation + generates payslips)
   - Download payslips as PDF (mock — show toast "Generating payslips…")
   - YTD summary chart

5. ONBOARDING:
   - Onboarding checklists for new hires
   - IT setup, paperwork, training tasks with checkboxes
   - Assign buddy / manager

MOCK DATA: 8 employees across Engineering, Sales, Operations, Finance departments.
Add to Sidebar under Business with icon "👥". Follow all VYNE design/lint rules.
```

---

### Prompt P5-C - Expense Reports Module

```text
[PASTE MASTER CONTEXT BLOCK HERE]

Build an Expense Reports module better than Expensify/Concur for VYNE.

TARGET FILE: apps/web/src/app/(dashboard)/expenses/page.tsx (NEW FILE)

FEATURES:
1. MY EXPENSES tab:
   - Submit expense form: date, category (travel/meals/software/office/other), amount, currency, description, receipt upload button
   - Expense list with status badges (draft/submitted/approved/rejected/paid)
   - Quick totals: pending approval, approved this month, rejected

2. APPROVALS tab (manager view):
   - List of all team expense submissions needing approval
   - Approve / Reject with note buttons
   - Bulk approve selected

3. REPORTS tab:
   - Expense summary by category (donut chart as CSS bars)
   - Department spend comparison
   - Month-over-month trend
   - Export to CSV button

4. POLICIES tab:
   - Per-category spending limits configurable by admin
   - Auto-flag expenses over limit
   - Receipt required threshold

MOCK DATA: 6 expenses in various states, realistic categories and amounts.
Auto-sync approved expenses to Finance journal entries (call erpApi.listJournalEntries on load).
Add to Sidebar under Business with icon "🧾". Follow VYNE design rules.
```

---

## PHASE 6 — ADVANCED CHAT (Kill Slack)

### Prompt P6-A - AI-Powered Chat Features

```text
[PASTE MASTER CONTEXT BLOCK HERE]

Upgrade the existing chat page with AI-powered features that Slack charges extra for.

TARGET FILE: apps/web/src/app/(dashboard)/chat/page.tsx (EXTEND EXISTING)

ADD THESE FEATURES to the existing chat:

1. AI THREAD SUMMARY BUTTON:
   - In every channel with 5+ messages, show "✨ Summarize thread" button in the header
   - Clicking shows a purple AI bubble at top of messages with a 3-bullet summary
   - Mock the summary with realistic content from the mock messages

2. SMART NOTIFICATION PANEL (new right-side panel):
   - Shows "🧠 AI Priority" section at top with only the 2-3 most important unread items
   - Below: full notification list with priority badges (urgent/normal/low)
   - "Mark all as read" button

3. /SLASH COMMANDS with ERP integration:
   - Show autocomplete dropdown when user types / in message composer
   - Commands: /order [id], /stock [product], /approve [id], /status [service], /help
   - /order ORD-123 → shows order card inline in chat
   - /stock PWR-003 → shows stock level card inline
   - These commands work in demo mode (show mock cards)

4. MESSAGE SCHEDULING:
   - Add "📅 Schedule" option to send button dropdown
   - Time picker modal (today, tomorrow, custom date/time)
   - Show "Scheduled" badge on message, grayed out with clock icon

5. EMOJI STATUS on user profiles:
   - Click user avatar → show status picker (🎯 Focused, 🚗 Commuting, 🤒 Sick, 🏖 Vacation)
   - Status shows next to name in DM list

Follow all VYNE design rules. No nested ternaries. Readonly props. All changes backward-compatible.
```

---

## PHASE 7 — AI INTELLIGENCE ENGINE

### Prompt P7-A - AI Business Intelligence Dashboard

```text
[PASTE MASTER CONTEXT BLOCK HERE]

Build an AI Business Intelligence page that no other tool offers — natural language queries
over all VYNE data (ERP + Projects + Chat + DevOps).

TARGET FILE: apps/web/src/app/(dashboard)/ai/page.tsx (NEW FILE)
Add to Sidebar under "DevOps + AI" section with icon "🧠 AI" (replace existing Observe AI section).

WHAT TO BUILD:

1. QUERY BAR (top, full width):
   - Large input: "Ask anything about your business…"
   - Suggested queries as chips below: "Which customers haven't paid?", "What caused last week's incident?",
     "Which products need reordering?", "Show me top 5 deals by value", "What slowed down deployment?"
   - On submit → show animated "Thinking…" → then show answer card

2. ANSWER CARDS — each query returns a formatted response:
   - Text answer + supporting data table/chart
   - Sources cited (e.g. "From: Orders module, 3 records" with link to /ops)
   - Follow-up question suggestions

3. INSIGHTS FEED (left sidebar):
   - Auto-generated daily insights:
     • "⚠ 3 invoices overdue totaling $8,400"
     • "📦 PWR-003 will stock out in ~4 days at current rate"
     • "🚀 Deployment success rate dropped to 60% this week"
     • "💬 #alerts channel has 47 unread messages"
   - Each insight links to the relevant module

4. AGENT RUNS panel (bottom):
   - Table of recent LangGraph agent runs: type, status, started, result summary
   - Types: incident-investigation, stock-reorder, meeting-summary, anomaly-detection
   - Click row → see full agent reasoning trace (step by step)

5. MOCK ALL DATA — no backend calls needed, all mock data that tells a coherent story.

Design: AI/dark aesthetic — purple gradient header, cards with purple accent borders.
Follow all VYNE lint rules. Readonly props.
```

---

## PHASE 8 — MOBILE APP V2

### Prompt P8-A - Extend Mobile with ERP + AI screens

```text
[PASTE MASTER CONTEXT BLOCK HERE]

The mobile app at apps/mobile/ is already built with: Login, Home, Chat, Projects, Profile.
Now extend it with ERP and AI screens.

ADD THESE SCREENS:

1. apps/mobile/app/(tabs)/ops.tsx — Mobile ERP overview:
   - Summary cards: Open Orders, Low Stock Items, Pending Approvals
   - Recent orders list (tap to see detail)
   - Quick actions: + New Order, Check Stock, Approve PO
   - Pull to refresh

2. apps/mobile/app/(tabs)/finance.tsx — Mobile Finance:
   - This month revenue vs expenses (simple bar visualization)
   - Recent transactions list
   - 3 quick KPI cards (revenue, expenses, profit margin)

3. Update apps/mobile/app/(tabs)/_layout.tsx:
   - Add "Ops" tab with icon "package" between Projects and Profile
   - Keep max 5 tabs total

4. Add notification badge support to all tabs (read from mock unread counts)

5. apps/mobile/components/AIAlertBanner.tsx:
   - Reusable purple banner component for AI incidents/alerts
   - Props: message, severity (info/warning/critical), onDismiss, onAction
   - Use on Home screen and Ops screen

Follow React Native best practices. Use StyleSheet.create (not inline styles where possible).
All mock data — no backend needed. Expo SDK 52 + expo-router v4.
```

---

## PHASE 9 — MULTI-TENANT SAAS + WHITE-LABEL

### Prompt P9-A - White-Label + Tenant Customization

```text
[PASTE MASTER CONTEXT BLOCK HERE]

Build the white-label and multi-tenant customization system that lets Preet sell VYNE to companies.

WHAT TO BUILD:

1. ADMIN PANEL at /admin (separate from main dashboard, admin-only route):
   - /admin/tenants — list of all customer organizations
     • Create new org (name, slug, plan, admin email)
     • Org card: name, plan, users count, monthly revenue, status
     • Click → manage org settings
   - /admin/tenants/[id]/branding — customize per org:
     • Upload logo (mock upload → base64 preview)
     • Primary color picker (replaces #6C47FF brand purple)
     • Custom domain field
     • Welcome message
   - /admin/tenants/[id]/modules — enable/disable modules per org:
     • Toggle switches for: Chat, Projects, Docs, ERP, Finance, Code, HR, CRM, AI
     • Each toggle disables nav item for that org's users
   - /admin/billing — subscription management:
     • Tenant table with plan (Starter/Growth/Enterprise), MRR, next billing date
     • Change plan buttons
     • Revenue summary at top

2. TENANT-AWARE SIDEBAR:
   - Read org branding from settings store
   - Apply custom primary color as CSS variable override
   - Show custom logo if set, otherwise Vyne logo

3. ONBOARDING WIZARD at /onboarding (new auth flow route):
   - Step 1: Company name + industry + size
   - Step 2: Choose which modules to activate
   - Step 3: Invite team members (email list)
   - Step 4: Done — redirect to /home with confetti animation

All mock data. Admin route protected by role === 'owner'. Follow all VYNE design/lint rules.
```

---

## PHASE 0 — FOUNDATION

### Prompt P0-A - Project Setup and Monorepo

```text
[PASTE MASTER CONTEXT BLOCK HERE]

I am starting Phase 0 of building Vyne. Help me set up the complete monorepo foundation.

TASK: Create the complete monorepo scaffolding from scratch.

OUTPUT EVERYTHING IN FULL — no placeholders, no "add your code here":

1. ROOT LEVEL FILES:
   - package.json (pnpm workspace root with workspaces config)
   - pnpm-workspace.yaml (pointing to apps/*, services/*, packages/*)
   - turbo.json (Turborepo with pipeline: build, lint, test, typecheck)
   - .gitignore (comprehensive — Node, Python, .NET, Docker, .env, Terraform)
   - .env.example (ALL env vars Vyne needs across all services)
   - docker-compose.yml (local dev: postgres, redis, all services with hot reload)
   - README.md (setup instructions, architecture overview, how to run locally)

2. PACKAGES:
   - packages/shared-types/package.json + src/index.ts (export all TypeScript interfaces)
   - packages/shared-types/src/api.ts (API request/response types)
   - packages/shared-types/src/events.ts (EventBridge CloudEvents schemas)
   - packages/shared-types/src/entities.ts (User, Org, Issue, Message, Product, Order types)
   - packages/shared-config/eslint/index.js (shared ESLint config)
   - packages/shared-config/typescript/base.json (shared tsconfig base)
   - packages/shared-config/prettier/.prettierrc (shared Prettier config)

3. SCRIPTS:
   - scripts/setup.sh (installs everything, creates .env from .env.example, starts Docker)
   - scripts/db-migrate.sh (runs all pending migrations across all services)
   - scripts/seed.sh (seeds dev DB with test org, users, sample data)

Give me every file fully written. Include exact versions for all dependencies.
After generating, tell me the exact commands to run to get this working locally.
```

---

### Prompt P0-B - Terraform Infrastructure

```text
[PASTE MASTER CONTEXT BLOCK HERE]

I need to build the complete Terraform infrastructure for Vyne on AWS.

Environment: dev (development/MVP)
AWS Region: us-east-1
Account: personal AWS account (apply for AWS Activate Founders $1,000 credits)

BUILD COMPLETE TERRAFORM CODE for these modules:

1. infrastructure/terraform/versions.tf — provider versions, required_providers
2. infrastructure/terraform/backend.tf — S3 backend + DynamoDB locking (create these manually first, then reference them)
3. infrastructure/terraform/modules/networking/
   - main.tf: VPC (10.0.0.0/16), 3 public subnets, 3 private subnets, 3 isolated subnets (across us-east-1a/b/c), IGW, NAT Gateway (single for dev cost savings), route tables
   - variables.tf, outputs.tf
4. infrastructure/terraform/modules/ecs/
   - main.tf: ECS Fargate cluster, task execution IAM role (ECR pull + Secrets Manager), CloudWatch log groups per service
   - variables.tf, outputs.tf
5. infrastructure/terraform/modules/rds/
   - main.tf: Aurora PostgreSQL Serverless v2 cluster (min 0.5 ACU, max 4 ACU for dev), subnet group in isolated subnets, security group (only from ECS security group), parameter group (pgvector + TimescaleDB extensions enabled)
   - variables.tf, outputs.tf
6. infrastructure/terraform/modules/redis/
   - main.tf: ElastiCache Valkey (cache.t4g.micro), subnet group, security group
   - variables.tf, outputs.tf
7. infrastructure/terraform/modules/cognito/
   - main.tf: User Pool (email/password auth, custom attributes: org_id, role), App Client (no secret for SPA), custom domain
   - variables.tf, outputs.tf
8. infrastructure/terraform/modules/ecr/
   - main.tf: ECR repository for each service (api-gateway, core-service, erp-service, projects-service, messaging-service, ai-service, observability-service, notification-service, web)
   - variables.tf, outputs.tf
9. infrastructure/terraform/modules/alb/
   - main.tf: ALB (internet-facing), HTTPS listener (ACM cert), HTTP→HTTPS redirect, target groups per service, health check paths
   - variables.tf, outputs.tf
10. infrastructure/terraform/modules/eventbridge/
    - main.tf: Custom event bus "vyne-events", EventBridge rules for routing events to SQS
    - variables.tf, outputs.tf
11. infrastructure/terraform/modules/sqs-sns/
    - main.tf: FIFO queues (one per domain: erp.fifo, messaging.fifo, notifications.fifo, ai.fifo) with dead-letter queues, SNS topic for push notifications
    - variables.tf, outputs.tf
12. infrastructure/terraform/modules/s3/
    - main.tf: buckets (vyne-files-{env}, vyne-terraform-state, vyne-logs-{env}), lifecycle policies, CORS for file uploads
    - variables.tf, outputs.tf
13. infrastructure/terraform/modules/iam/
    - main.tf: GitHub Actions OIDC role, ECS task roles per service with least-privilege policies (Bedrock, Secrets Manager, S3, SQS, EventBridge, ECR)
    - variables.tf, outputs.tf
14. infrastructure/terraform/modules/secrets-manager/
    - main.tf: Secret resources (database-url, redis-url, cognito-client-secret, stripe-key, github-app-key)
    - variables.tf, outputs.tf
15. infrastructure/terraform/environments/dev/main.tf
    - Compose ALL modules with dev-appropriate sizing
16. infrastructure/terraform/environments/dev/terraform.tfvars
    - All variable values for dev

ALSO PROVIDE:
- Step-by-step commands to bootstrap the Terraform state bucket before first apply
- Full `terraform init`, `terraform plan`, `terraform apply` command sequence
- How to handle secrets (never in tfvars, use AWS CLI to set them after creation)
- GitHub Actions workflows: tf-plan.yml (on PR) + tf-apply.yml (on merge to main)

Write every .tf file completely. No placeholder values except where I need to fill in my specific AWS account ID.
```

---

### Prompt P0-C - Core Service (Auth + Multi-tenancy)

```text
[PASTE MASTER CONTEXT BLOCK HERE]

Build the complete core-service for Vyne — C# .NET 9 Web API handling auth, organizations, users, and RBAC.

DELIVERABLES (write every file completely):

1. services/core-service/Vyne.Core.sln + project structure
2. Vyne.Core.csproj — all NuGet packages:
   - Microsoft.AspNetCore.Authentication.JwtBearer
   - AWSSDK.SecretsManager, AWSSDK.EventBridge
   - Npgsql.EntityFrameworkCore.PostgreSQL
   - OpenTelemetry.Exporter.OpenTelemetryProtocol, OpenTelemetry.Extensions.Hosting
   - FluentValidation.AspNetCore
   - Stripe.net
   - Serilog.AspNetCore
3. Program.cs — Minimal API setup, middleware pipeline, dependency injection
4. Infrastructure/Data/VyneDbContext.cs — EF Core context with RLS middleware
5. Infrastructure/Data/Migrations/ — Initial migration: organizations + users + RBAC tables
6. Infrastructure/Middleware/TenantMiddleware.cs — Extracts org_id from JWT, sets PostgreSQL session variable for RLS
7. Infrastructure/Middleware/AuthorizationMiddleware.cs — Permission-based RBAC check
8. Domain/Organizations/Organization.cs — Entity + value objects
9. Domain/Users/User.cs — Entity with role enum
10. Controllers/AuthController.cs — POST /auth/register (create Cognito user), POST /auth/me (get current user + org)
11. Controllers/OrganizationsController.cs — GET /orgs, POST /orgs, GET /orgs/{id}, PATCH /orgs/{id}
12. Controllers/UsersController.cs — GET /users, POST /users/invite, PATCH /users/{id}/role, DELETE /users/{id}
13. Vyne.Core.Tests/ — xUnit tests for auth, tenant isolation (using Testcontainers for real PostgreSQL)
14. Dockerfile — Multi-stage build (.NET SDK → Alpine ASP.NET runtime)
15. SQL migration file showing exact RLS policies

REQUIREMENTS:
- JWT contains: { sub (Cognito ID), email, org_id, role, permissions[] }
- Every database query must be tenant-scoped via RLS — no exceptions
- Write a test that proves cross-tenant data cannot be accessed
- Use Secrets Manager to load database URL (not environment variable)
- OpenTelemetry traces to OTLP endpoint
- Health check endpoint: GET /health

Make every file production-quality. Include error handling, logging, validation.
```

---

## PHASE 1 — PROJECTS MODULE

### Prompt P1-A - Projects Service (Backend)

```text
[PASTE MASTER CONTEXT BLOCK HERE]

Build the complete projects-service for Vyne — C# .NET 9 Web API for project management (Linear-quality).

DELIVERABLES:

DATABASE SCHEMA (write full migration SQL):
- projects (id, org_id, name, description, status, lead_id, icon, color, identifier e.g. "PRJ", settings JSONB, created_at)
- issues (id, org_id, project_id, title, description, status, priority, assignee_id, reporter_id, sprint_id, parent_issue_id, labels TEXT[], due_date, estimate, position DECIMAL for ordering, embedding VECTOR(1536), search_vector TSVECTOR, created_at, updated_at)
- sprints (id, org_id, project_id, name, start_date, end_date, status, goal)
- issue_comments (id, org_id, issue_id, user_id, content, created_at)
- issue_activities (id, org_id, issue_id, user_id, type, from_value, to_value, created_at)
- labels (id, org_id, name, color)
- issue_labels (issue_id, label_id)

API ENDPOINTS (write all controllers):

Projects:
- GET /projects — list all with member count, issue counts by status
- POST /projects — create with auto-generate identifier
- GET /projects/{id} — project detail with settings
- PATCH /projects/{id} — update settings
- DELETE /projects/{id} — archive (soft delete)

Issues:
- GET /projects/{id}/issues — list with filters (status, priority, assignee, label, sprint), pagination, sort
- POST /projects/{id}/issues — create, auto-assign position
- GET /issues/{id} — full detail with comments and activities
- PATCH /issues/{id} — update (triggers activity log + EventBridge event)
- DELETE /issues/{id} — soft delete
- PATCH /issues/{id}/status — status transition with validation
- PATCH /issues/reorder — update positions for drag-and-drop

Sprints:
- GET /projects/{id}/sprints
- POST /projects/{id}/sprints
- PATCH /sprints/{id}/start — start sprint
- PATCH /sprints/{id}/close — close sprint (move incomplete issues to backlog)

Comments:
- GET /issues/{id}/comments
- POST /issues/{id}/comments
- PATCH /comments/{id}
- DELETE /comments/{id}

Search:
- GET /search/issues?q={query} — hybrid tsvector + pgvector search

REAL-TIME EVENTS (EventBridge):
- Publish event when issue status changes: issue_status_changed { issue_id, from, to, org_id }
- Publish event when issue created: issue_created { issue_id, project_id, org_id }

ALSO BUILD:
- SignalR hub for real-time issue updates (client subscribes to project channel)
- Background job: embed new issues into pgvector on creation
- Full xUnit test suite
- Dockerfile
- OpenTelemetry instrumentation

Write every file completely. Pay special attention to the position-based ordering for Kanban drag-and-drop (use LexoRank or decimal midpoint algorithm).
```

---

### Prompt P1-B - Projects Frontend (Next.js 15)

```text
[PASTE MASTER CONTEXT BLOCK HERE]

Build the complete Next.js 15 web application for Vyne — starting with the app shell and Projects module.

DESIGN REQUIREMENTS (strict):
- Exactly like Slack/Linear — NOT like Jira or traditional project tools
- Dark sidebar (#1C1C2E), light content area (#FFFFFF)
- Geist font (import from next/font)
- shadcn/ui components throughout
- Every interaction under 100ms feel (optimistic updates everywhere)
- Keyboard shortcuts: C=create issue, E=edit, Esc=close panel, Cmd+K=command palette

DELIVERABLES (write every file completely):

SETUP:
- apps/web/package.json — all exact dependencies with versions
- apps/web/next.config.ts — optimized for production
- apps/web/tailwind.config.ts — custom colors for Vyne design system
- apps/web/src/app/globals.css — CSS variables (colors, spacing, fonts)
- apps/web/src/lib/api/client.ts — axios-based API client with auth token injection
- apps/web/src/lib/stores/auth.ts — Zustand auth store
- apps/web/src/lib/stores/ui.ts — Zustand UI store (sidebar open/closed, active item)

LAYOUT:
- apps/web/src/app/(dashboard)/layout.tsx — main app layout with Sidebar + Topbar
- apps/web/src/components/layout/Sidebar.tsx — full Slack-like sidebar:
  - Workspace switcher (org name + dropdown)
  - AI Assistant button (Cmd+K)
  - Navigation: Projects, Docs, Chat, Code, Observe, Ops
  - Under Chat: channel list with unread counts, bold unread
  - DM list with presence indicators
  - Bottom: user avatar, settings, notifications bell
- apps/web/src/components/layout/Topbar.tsx — breadcrumb + search + user menu
- apps/web/src/components/layout/CommandPalette.tsx — Cmd+K modal with search

PROJECTS MODULE:
- apps/web/src/app/(dashboard)/projects/page.tsx — projects grid
- apps/web/src/app/(dashboard)/projects/[projectId]/page.tsx — issues Kanban
- apps/web/src/components/projects/ProjectCard.tsx — project card with stats
- apps/web/src/components/projects/CreateProjectModal.tsx — create project form
- apps/web/src/components/projects/IssueKanban.tsx — drag-and-drop Kanban (dnd-kit)
- apps/web/src/components/projects/IssueCard.tsx — compact issue card in column
- apps/web/src/components/projects/IssuePanel.tsx — slide-in issue detail panel (full right side)
- apps/web/src/components/projects/IssueForm.tsx — create/edit form
- apps/web/src/components/projects/IssuePicker.tsx — status, priority, assignee pickers
- apps/web/src/components/projects/FilterBar.tsx — status/assignee/label/priority filters
- apps/web/src/components/projects/SprintSelector.tsx — sprint picker and management
- apps/web/src/hooks/useIssues.ts — TanStack Query hooks for issues CRUD
- apps/web/src/hooks/useProjects.ts — TanStack Query hooks for projects
- apps/web/src/hooks/useSocket.ts — Socket.io connection + real-time updates

REAL-TIME:
- Socket.io client: connect on mount, join org room, listen for issue:updated events
- Optimistic updates: drag issue → update position locally → sync to server

AUTH:
- apps/web/src/app/(auth)/login/page.tsx — login with Cognito
- apps/web/src/app/(auth)/signup/page.tsx — signup + create org flow

Write every component completely with full TypeScript types. Make the UI beautiful — I want it to look as good as Linear.app. Include Framer Motion animations for panel slide-in/out and drag animations.
```

---

## PHASE 2 — CHAT/MESSAGING MODULE

### Prompt P2-A - Messaging Service (Backend)

````text
[PASTE MASTER CONTEXT BLOCK HERE]

Build the complete messaging-service for Vyne — Node.js + Fastify + TypeScript.
This is the Slack-like real-time messaging backend. It must handle:
- Thousands of concurrent WebSocket connections
- Messages with thread replies, reactions, attachments
- System channels auto-populated by AI/events
- Full-text + semantic search over messages

DELIVERABLES:

DATABASE SCHEMA (PostgreSQL):
- channels (id, org_id, name, description, type [public|private|dm|system], is_system, topic, created_by, archived_at, created_at)
- channel_members (channel_id, user_id, role [owner|admin|member], joined_at, last_read_at, notification_preference)
- messages (id, org_id, channel_id, user_id, content TEXT, content_rich JSONB, type [text|system|ai_bot|rich_embed], thread_id UUID, reply_count, reactions JSONB, attachments JSONB, rich_embed JSONB, is_edited, edited_at, deleted_at, embedding VECTOR(1536), created_at)
- dm_conversations (id, org_id, created_at)
- dm_participants (conversation_id, user_id)
- message_bookmarks (id, message_id, user_id, created_at)
- user_presence (user_id, org_id, status [online|away|offline], last_seen_at)

SOCKET.IO EVENTS (server emits, client listens):
- message:new — new message in channel
- message:updated — message edited
- message:deleted — message deleted
- message:reaction_added — emoji reaction added
- message:reaction_removed — emoji reaction removed
- channel:new — new channel created (user needs to see it in sidebar)
- user:typing — user is typing in channel
- user:presence — user came online/went offline
- thread:updated — reply added to thread

SOCKET.IO EVENTS (client emits, server handles):
- channel:join — subscribe to channel events
- channel:leave — unsubscribe
- message:send — send message (server validates, saves, broadcasts)
- user:typing — I am typing in channel X
- user:presence_update — I am active/idle

API ENDPOINTS:
- GET /channels — list channels user is member of
- POST /channels — create channel
- POST /channels/dm — create or get DM conversation
- GET /channels/{id} — channel detail
- PATCH /channels/{id} — update name/description/topic
- DELETE /channels/{id} — archive channel
- POST /channels/{id}/members — add member
- DELETE /channels/{id}/members/{userId}
- GET /channels/{id}/messages — paginated message history (cursor-based)
- POST /channels/{id}/messages — send message (also via Socket.io)
- PATCH /messages/{id} — edit message
- DELETE /messages/{id} — soft delete
- POST /messages/{id}/reactions — add reaction {emoji}
- DELETE /messages/{id}/reactions/{emoji} — remove reaction
- GET /messages/{id}/thread — get thread replies
- POST /messages/search — full-text + vector search across all messages
- PUT /channels/{id}/read — mark channel as read (update last_read_at)
- GET /attachments/upload-url — S3 pre-signed URL for file upload
- GET /presence — get presence for list of user_ids

SYSTEM CHANNEL EVENTS:
- Listen on EventBridge/SQS for: deployment_failed, inventory_low, incident_created, order_failed
- Auto-post formatted rich embed message to relevant system channel (#alerts, #inventory, etc.)

RICH EMBED FORMAT (for #alerts messages):
```json
{
  "type": "deployment_failed",
  "title": "Deployment Failed — api-service v2.4.1",
  "status": "failed",
  "fields": [
    {"label": "Service", "value": "api-service"},
    {"label": "Version", "value": "v2.4.1"},
    {"label": "Triggered by", "value": "Preet Singh"},
    {"label": "Impact", "value": "47 orders affected — $12,400 revenue risk"}
  ],
  "actions": [
    {"label": "Rollback", "url": "/code/deployments/xyz/rollback"},
    {"label": "View Logs", "url": "/observe/logs?deployment=xyz"}
  ]
}
```

ALSO BUILD:
- BullMQ job queue for async message processing (embedding, notification dispatch)
- Background worker: embed each new message into pgvector (async, non-blocking)
- Rate limiting: max 60 messages/minute per user
- Dockerfile (Node.js 22 Alpine)
- Full TypeScript types throughout

Write everything completely. The WebSocket architecture is critical — make sure reconnection logic is correct.
````

---

### Prompt P2-B - Chat Frontend (Slack Clone UI)

```text
[PASTE MASTER CONTEXT BLOCK HERE]

Build the complete Chat module frontend for Vyne — Slack-quality real-time messaging UI.

DESIGN REQUIREMENT: This must look and feel EXACTLY like Slack. Someone should think they're using Slack but smarter.

DELIVERABLES:

ROUTING:
- apps/web/src/app/(dashboard)/chat/layout.tsx — two-panel: channel list + message area
- apps/web/src/app/(dashboard)/chat/[channelId]/page.tsx — channel message view
- apps/web/src/app/(dashboard)/chat/dm/[conversationId]/page.tsx — DM view

COMPONENTS (write every component completely):

MessageList:
- Virtualized with react-virtual (handles 10K+ messages without lag)
- Date separators between messages on different days
- "New messages" divider when there are unread messages above
- Unread scroll-to indicator at bottom

MessageBubble:
- Avatar (with fallback initials), name, timestamp (hover shows full date)
- Hover actions: emoji reaction picker, thread button, edit, copy link, delete
- Edited indicator "(edited)" after content
- Deleted message shows "[message deleted]"
- System messages in italics, different styling
- Support for @mention highlighting (bold purple)
- Support for #channel mentions (linked)
- Code blocks with syntax highlighting (shiki)

RichEmbedCard:
- Renders rich_embed JSON as a visual card (deployment card, order card, incident card)
- Status badge (success/warning/error) with color coding
- Action buttons that link to relevant sections

MessageEditor (TipTap):
- Bold, italic, strikethrough, inline code
- Code block with language selector
- Bullet list, numbered list
- @mention autocomplete (searches users, shows avatar + name)
- #channel mention autocomplete
- Emoji picker (emoji-mart)
- File upload button (S3 pre-signed URL)
- Keyboard: Enter to send, Shift+Enter for newline, Escape to cancel edit
- Paste image → auto-upload

ThreadPanel:
- Slides in from right when thread button clicked
- Shows parent message at top
- Reply list below
- Editor at bottom for thread replies
- Close with Escape or X button

EmojiReactionBar:
- Shows up to 5 reactions inline below message
- Count next to each emoji
- Click to add/remove your reaction
- Hover shows who reacted

TypingIndicator:
- "Preet is typing..." appears after 0.5s of typing
- "Preet and Sarah are typing..."
- "Several people are typing..." for 3+
- Auto-disappears after 3s of no typing

ChannelHeader:
- Channel name + description
- Member count
- Search in channel button
- Notification settings (all, mentions only, off)

STORES (Zustand):

- src/lib/stores/chat.ts:
  - channels: Channel[] (sidebar data)
  - activeChannelId: string
  - messages: Record<channelId, Message[]> (cached messages per channel)
  - unreadCounts: Record<channelId, number>
  - typingUsers: Record<channelId, string[]>
  - userPresence: Record<userId, PresenceStatus>

SOCKET.IO INTEGRATION:
- Auto-reconnect with exponential backoff
- Join all channels user is member of on connect
- Handle all server events and update Zustand store
- Optimistic message sending (show message immediately, then sync)

HOOKS:
- useMessages(channelId) — paginated fetch + real-time Socket.io updates
- useTypingIndicator(channelId) — emit typing event, show other users typing
- usePresence() — track online users

Write every component with complete implementation. Include Framer Motion animations for:
- Thread panel sliding in/out
- Message appearing (subtle fade+slide up)
- Emoji reaction pop animation
- Typing indicator pulse
```

---

## PHASE 3 — DOCS MODULE

### Prompt P3-A - Docs Module (Full)

```text
[PASTE MASTER CONTEXT BLOCK HERE]

Build the complete Docs module for Vyne — Notion-quality block editor integrated with Projects.

DATABASE (add to projects-service migrations):
- documents (id, org_id, parent_id UUID nullable, title, icon VARCHAR(10), cover_url, is_published, is_template, created_by, updated_by, position, created_at, updated_at)
- document_versions (id, document_id, content JSONB, version INT, created_by, created_at)
- document_members (document_id, user_id, permission [view|edit|comment])

BACKEND API (add to projects-service):
- GET /docs — list root docs for org
- GET /docs/{id}/children — list child pages
- POST /docs — create page
- GET /docs/{id} — get page with content
- PATCH /docs/{id} — update title/icon/content
- DELETE /docs/{id} — delete (move children to parent)
- POST /docs/{id}/duplicate — duplicate page
- GET /docs/search?q={query} — search docs
- PATCH /docs/reorder — reorder in sidebar

FRONTEND COMPONENTS:

DocsSidebar (left panel):
- Tree of pages with icons
- Drag to reorder (dnd-kit)
- Collapse/expand nested pages
- + New Page button
- Search docs

TipTap Editor (full implementation):

BLOCK TYPES:
  - /paragraph — normal text
  - /h1, /h2, /h3 — headings
  - /bullet — bulleted list
  - /numbered — ordered list
  - /todo — checklist with checkboxes
  - /quote — blockquote with left border
  - /code — code block with language selector + syntax highlighting
  - /divider — horizontal rule
  - /image — image upload (drag-drop or file picker → S3)
  - /table — table with add row/column, resize
  - /callout — note/warning/tip callout box with emoji icon
  - /issue — link to Vyne issue (shows inline card)
  - /embed — embed external URL

EDITOR FEATURES:
  - Slash command menu (type "/" to trigger)
  - Drag handle on left of each block (drag to reorder)
  - Block-level comments (select text → comment button → shows comment thread)
  - @mention users (shows notification)
  - Markdown shortcuts: ## for H2, ** for bold, ` for code
  - Auto-save every 5 seconds (debounced)
  - Real-time collaboration with Yjs + y-websocket CRDT (2 users editing simultaneously, no conflicts)
  - Version history modal (click Clock icon)
  - Breadcrumb navigation at top

Write full TipTap extension configuration, custom extensions for issue embeds, and complete collaborative editing setup.
```

---

## PHASE 4 — AI MODULE

### Prompt P4-A - AI Service (RAG + Agents)

```text
[PASTE MASTER CONTEXT BLOCK HERE]

Build the complete AI service for Vyne — Python 3.12 + FastAPI + AWS Bedrock + LangGraph.

This is the most important differentiator: AI that understands BOTH business AND infrastructure.

DELIVERABLES:

services/ai-service/ complete codebase:

1. main.py — FastAPI app with lifespan, routes registration, OTLP tracing setup

2. requirements.txt — exact versions:
   - fastapi==0.115.x
   - uvicorn[standard]==0.32.x
   - langchain==0.3.x
   - langgraph==0.2.x
   - langchain-aws==0.2.x (Bedrock integration)
   - psycopg2-binary==2.9.x
   - pgvector==0.3.x
   - scikit-learn==1.5.x
   - prophet==1.1.x
   - opentelemetry-sdk==1.27.x
   - opentelemetry-exporter-otlp==1.27.x
   - boto3==1.35.x
   - pydantic==2.9.x
   - pytest==8.3.x, pytest-asyncio==0.24.x

3. src/config.py — Pydantic Settings loading from AWS Secrets Manager

4. src/bedrock/client.py — Bedrock client wrapper:
   - invoke_claude(prompt, max_tokens=4096, temperature=0.1) → str
   - embed(text) → list[float] (Titan Embeddings v2, 1536 dimensions)
   - embed_batch(texts) → list[list[float]]

5. src/rag/ingestion.py — complete implementation:
   - semantic_chunk(content, max_tokens=512, overlap=0.15) → list[str]
   - ingest_document(source_type, source_id, content, tenant_id, metadata) → None
   - ingest_batch(documents) → None (batch process, 10 at a time)
   - DELETE endpoint to remove embeddings when source deleted

6. src/rag/retrieval.py — complete hybrid search:
   - embed query via Bedrock
   - Run vector similarity search (pgvector)
   - Run BM25 keyword search (PostgreSQL tsvector)
   - Reciprocal Rank Fusion to merge results
   - Return top_k results with scores and source metadata

7. src/agents/tools.py — ALL tool implementations (Python functions):
   - query_issues(project_id, status, limit) → list[Issue]
   - query_messages(channel_id, hours_ago) → list[Message]
   - query_orders(status, limit) → list[Order]
   - query_inventory(below_reorder_point) → list[Product]
   - query_metrics(service_name, metric_name, hours_ago) → list[MetricPoint]
   - query_recent_deployments(hours_ago) → list[Deployment]
   - calculate_revenue_impact(order_ids) → RevenueImpact
   - create_incident(title, description, severity, affected_services) → Incident
   - send_channel_message(channel_id, content, rich_embed) → Message
   - create_issue(project_id, title, description, priority) → Issue
   - suggest_rollback(deployment_id) → RollbackSuggestion

8. src/agents/incident_agent.py — LangGraph agent:
   - StateGraph with nodes: analyze_incident, query_context, assess_impact, generate_report, post_to_channel
   - RAG over: past incidents, runbooks, deployment history
   - Outputs structured incident report + posts to #alerts channel
   - CROSS-DOMAIN CORRELATION: "Deployment X failed → 47 orders stuck → $12,400 impact"

9. src/agents/finance_agent.py — LangGraph agent:
   - Triggered by: order_failed events, EOD schedule
   - Tools: query_orders, query_revenue, calculate_revenue_impact
   - Outputs: Revenue impact report, demand forecast

10. src/agents/ops_agent.py — LangGraph agent:
    - Triggered by: inventory_low, manufacturing_delay
    - Tools: query_inventory, query_suppliers, suggest_reorder
    - Outputs: Procurement recommendations, draft PO data

11. src/agents/orchestrator.py — LangGraph supervisor:
    - Classify incoming query intent
    - Route to appropriate specialist agent
    - Handle general Q&A (workspace-wide RAG search)

12. src/ml/anomaly_detection.py:
    - IsolationForest model per service (trained on metric history)
    - detect_anomaly(service_name, metric_values) → AnomalyResult
    - Auto-retrain weekly
    - When anomaly detected → trigger IncidentAgent

13. src/ml/demand_forecast.py:
    - Prophet model per product (trained on order history)
    - forecast(product_id, days_ahead) → ForecastResult

14. API ROUTES:
    - POST /search — hybrid search with tenant isolation
    - POST /agents/query — natural language query, auto-route to agent
    - POST /agents/analyze-incident — analyze specific incident
    - POST /embeddings/ingest — ingest document for RAG
    - DELETE /embeddings/{source_type}/{source_id}
    - POST /ml/anomaly/detect — real-time anomaly check
    - GET /ml/forecast/{product_id}

15. src/events/consumer.py — SQS consumer:
    - Poll SQS queue for EventBridge events
    - deployment_failed → trigger IncidentAgent
    - inventory_low → trigger OpsAgent
    - order_failed → trigger FinanceAgent

16. Dockerfile — Python 3.12 slim, non-root user
17. Full pytest test suite

IMPORTANT: Every agent must include tenant_id in all database queries (RLS enforcement).
The cross-domain correlation (infrastructure ↔ business) is THE killer feature — make it exceptional.
```

---

## PHASE 5 — ERP/MRP MODULE

### Prompt P5-ERP-A - ERP Service (Backend)

```text
[PASTE MASTER CONTEXT BLOCK HERE]

Build the complete ERP service for Vyne — C# .NET 9 Web API for inventory, orders, manufacturing, and finance.

UI STYLE REQUIREMENT: Even though this is ERP, the UI should look like Slack/Linear — NOT like SAP or Odoo. Card-based, clean, with the same dark sidebar.

DATABASE SCHEMA (complete SQL migrations):
- products (id, org_id, sku, name, description, category, unit_of_measure, cost_price, sale_price, reorder_point, reorder_quantity, barcode, weight, dimensions JSONB, images JSONB, is_active, created_at)
- product_variants (id, product_id, sku, name, attributes JSONB, price_override, stock_offset)
- warehouses (id, org_id, name, address, is_active)
- warehouse_locations (id, warehouse_id, code, type [bin|shelf|zone])
- inventory_levels (id, org_id, product_id, location_id, qty_on_hand, qty_reserved, qty_available GENERATED)
- stock_movements (id, org_id, product_id, from_location_id, to_location_id, qty, type [purchase|sale|transfer|adjustment|return], reference_id, reference_type, notes, created_by, created_at)
- customers (id, org_id, name, email, phone, address JSONB, created_at)
- orders (id, org_id, order_number UNIQUE, customer_id, status, total_amount, tax_amount, shipping_amount, currency, shipping_address JSONB, notes, metadata JSONB, created_by, created_at, updated_at)
- order_lines (id, order_id, product_id, variant_id, qty, unit_price, discount_percent, total_price)
- suppliers (id, org_id, name, email, phone, address JSONB, lead_time_days, payment_terms, notes)
- purchase_orders (id, org_id, supplier_id, status, expected_date, total_amount, notes, created_by, created_at)
- purchase_order_lines (id, po_id, product_id, qty_ordered, qty_received, unit_cost, total_cost)
- bill_of_materials (id, org_id, product_id, version, is_active, notes, created_at)
- bom_components (id, bom_id, component_product_id, quantity, unit_of_measure, notes)
- work_orders (id, org_id, product_id, bom_id, qty_planned, qty_produced, status [draft|confirmed|in_progress|qc|done|cancelled], scheduled_start, scheduled_end, actual_start, actual_end, assigned_to UUID, notes)
- invoices (id, org_id, order_id, invoice_number UNIQUE, status [draft|sent|paid|overdue|cancelled], amount_due, amount_paid, due_date, issued_at)

COMPLETE API ENDPOINTS (all controllers):

Inventory:
- GET /products — search/filter/paginate
- POST /products — create product
- GET /products/{id} — with stock levels
- PATCH /products/{id}
- GET /products/{id}/stock — stock by location
- GET /inventory/alerts — products below reorder point
- POST /inventory/adjustment — manual stock adjustment
- POST /inventory/transfer — move stock between locations

Orders:
- GET /orders — list with filters (status, date range, customer)
- POST /orders — create order
- GET /orders/{id} — full detail with lines and timeline
- PATCH /orders/{id}/status — state machine: draft→confirmed→processing→shipped→delivered
- POST /orders/{id}/invoice — generate invoice from order

Manufacturing:
- GET /bom — list BOMs
- POST /bom — create BOM
- GET /bom/{id} — BOM with components
- POST /work-orders — create work order
- GET /work-orders — list with filters
- PATCH /work-orders/{id}/status — transition status
- POST /mrp/explosion — given product + qty → calculate material requirements

Finance:
- GET /invoices — list
- POST /invoices/{id}/send — mark as sent
- PATCH /invoices/{id}/payment — record payment
- GET /finance/summary — total AR, AP, revenue this month

DOMAIN EVENTS (publish to EventBridge):
- order_confirmed — when order moves to confirmed
- inventory_low — when qty falls below reorder_point
- inventory_depleted — when qty reaches 0
- work_order_started, work_order_completed
- invoice_overdue

ALSO BUILD:
- Background service: check inventory daily, publish inventory_low events
- PDF invoice generation with QuestPDF
- MRP explosion algorithm: BOM → component requirements → compare to inventory → highlight shortages
- Dockerfile
- Full xUnit tests

Write everything completely. The MRP explosion algorithm is complex — implement it correctly.
```

---

### Prompt P5-ERP-B - ERP Frontend (Slack-Style UI)

```text
[PASTE MASTER CONTEXT BLOCK HERE]

Build the complete ERP/Ops module frontend for Vyne.

CRITICAL: This ERP must look NOTHING like SAP, Odoo, or QuickBooks.
It should look like Slack/Linear — card-based, clean, dark sidebar, beautiful.
Traditional ERP is the enemy of good UX. Solve it.

DELIVERABLES:

ROUTING:
- /ops — ops home dashboard
- /ops/inventory — product catalog + stock levels
- /ops/inventory/[productId] — product detail + stock history
- /ops/orders — order list
- /ops/orders/[orderId] — order detail with timeline
- /ops/manufacturing — work orders Kanban
- /ops/manufacturing/[workOrderId] — work order detail
- /ops/suppliers — supplier directory
- /ops/finance — finance overview

COMPONENTS:

OpsDashboard:
- 4 metric cards (Today's Orders, Revenue, Low Stock Items, Active Work Orders)
- Revenue chart (last 30 days, Recharts)
- Recent orders feed (last 10)
- Alerts feed (inventory_low, overdue invoices)

InventoryView:
- Toggle: Card view (product image, name, SKU, stock level indicator) / Table view (TanStack Table)
- Search + filter by category/status
- Stock level indicator: green=healthy, yellow=low, red=depleted
- Bulk actions: adjust stock, export CSV

ProductDetail:
- Product info card (image, SKU, pricing)
- Stock by location (mini table)
- Stock movement history (timeline)
- Related orders using this product

OrderList:
- Column: Order #, Customer, Status (colored badge), Date, Total, Actions
- Status filter pills (All, Draft, Confirmed, Processing, Shipped, Delivered)
- Click row → order detail panel (similar to issue panel in Projects)

OrderDetail (side panel):
- Order info (customer, date, address)
- Status badge with transitions dropdown
- Order lines table (product, qty, price, total)
- Order timeline (status history with timestamps)
- Invoice section at bottom

ManufacturingKanban:
- Columns: Draft / Confirmed / In Progress / QC / Done
- Work order card: product name, qty, assigned to, due date, progress bar
- Drag to change status (same as issue Kanban)

FinanceDashboard:
- Accounts Receivable: total outstanding, overdue amount
- Monthly revenue bar chart
- Invoice list with status indicators
- Cash flow simple line chart

Write every component completely with TypeScript types and TanStack Query for data fetching.
```

---

## PHASE 6 — OBSERVABILITY MODULE

### Prompt P6-OBS-A - Observability Service + Frontend

```text
[PASTE MASTER CONTEXT BLOCK HERE]

Build the complete Observability module for Vyne — metrics, logs, traces, and alerts.

The goal: Vyne users never need to open Datadog. Everything lives in Vyne.
DESIGN: Beautiful dark metric charts, not a Grafana clone. Vyne-branded.

BACKEND (services/observability-service — Python FastAPI):

DATABASE:
- TimescaleDB hypertable: metrics (time, org_id, service_name, metric_name, value DOUBLE, labels JSONB)
- alerts_rules (id, org_id, name, condition, threshold, comparison, evaluation_window, severity, channel_id for notification, is_active)
- alerts_history (id, rule_id, org_id, triggered_at, resolved_at, value_at_trigger, status)
- logs_index (id, org_id, service_name, level, message, trace_id, span_id, attributes JSONB, timestamp)

API:
- POST /metrics/ingest — accept Prometheus remote write format
- POST /traces/ingest — accept OTLP protobuf traces
- POST /logs/ingest — structured log ingestion
- GET /metrics/query — time range + filter query
- GET /metrics/services — list services reporting metrics
- POST /alerts/rules — create alert rule
- GET /alerts/rules — list rules
- PATCH /alerts/rules/{id} — update rule
- GET /alerts/history — alert firing history
- GET /logs/search — full-text search over logs

ALERT ENGINE (background worker):
- Every 30s: evaluate all active alert rules
- If threshold crossed: publish event to EventBridge → posts to #alerts channel

FRONTEND COMPONENTS:

ObservabilityDashboard:
- Service health grid: each service as a card (green/yellow/red based on error rate)
- Top row: 4 metrics cards (total requests, avg latency, error rate, uptime)

MetricsView:
- Service selector dropdown
- Time range picker (15m, 1h, 6h, 24h, 7d, custom)
- Line charts (Recharts) per metric: request rate, latency p50/p95/p99, error rate, CPU, memory
- Chart interactions: hover tooltip, zoom

LogViewer (like Splunk but beautiful):
- Log stream with level badges (INFO=blue, WARN=yellow, ERROR=red, DEBUG=gray)
- Filters: service, level, time range, search text
- Click log row → expanded view with all attributes
- Live tail mode: stream new logs in real-time

TracesView:
- List of recent traces with service, operation, duration, status
- Click trace → waterfall visualization showing spans

AlertRules:
- List of configured rules with status
- Create rule form: metric + condition + threshold + channel
- Alert history timeline

Write all files completely.
```

---

## PHASE 7 — MOBILE APP

### Prompt P7-MOB-A - Mobile App (React Native + Expo)

```text
[PASTE MASTER CONTEXT BLOCK HERE]

Build the complete mobile app for Vyne — React Native + Expo SDK 52.

The mobile app focuses on:
1. Real-time messaging (primary use case on mobile)
2. Project/issue management (view + update issues)
3. Notifications (push notifications for @mentions, alerts)
4. QR scanning for inventory (Expo Camera)

DELIVERABLES:

SETUP:
- apps/mobile/package.json — all dependencies
- apps/mobile/app.json — Expo config
- apps/mobile/eas.json — EAS Build config (dev/staging/prod)
- apps/mobile/babel.config.js

NAVIGATION (Expo Router v3):
- apps/mobile/src/app/_layout.tsx — root layout with auth gate + push notification setup
- apps/mobile/src/app/(auth)/login.tsx — login screen
- apps/mobile/src/app/(auth)/signup.tsx — signup screen
- apps/mobile/src/app/(tabs)/_layout.tsx — bottom tab bar (Inbox, Chat, Projects, Scan, Profile)
- apps/mobile/src/app/(tabs)/index.tsx — Inbox (AI summary + notifications)
- apps/mobile/src/app/(tabs)/chat/index.tsx — Channel list
- apps/mobile/src/app/(tabs)/chat/[channelId].tsx — Messages view
- apps/mobile/src/app/(tabs)/projects/index.tsx — My issues list
- apps/mobile/src/app/(tabs)/projects/[issueId].tsx — Issue detail
- apps/mobile/src/app/(tabs)/scan.tsx — Inventory QR scanner

KEY COMPONENTS:

MobileMessageView:
- FlashList (ultra-fast list from Shopify) for message rendering
- Same rich message format as web (reactions, threads, attachments)
- Bottom message editor with keyboard-aware scrolling
- Haptic feedback on send (Expo Haptics)

MobileChannelList:
- Section list: Channels / Direct Messages
- Unread count badges
- Pull-to-refresh

PushNotificationSetup:
- Request permissions on first login
- Register device token with notification-service
- Handle notification tap → navigate to relevant screen

QRScanner:
- Expo Camera + barcode scanner
- Scan product barcode → open product detail
- Scan QR → auto-fill stock adjustment form

OFFLINE SUPPORT (WatermelonDB):
- Sync messages, issues, channel list from API into WatermelonDB
- Show cached data when offline with "offline" indicator
- Queue messages sent offline → deliver when connection restored

ANIMATIONS (React Native Reanimated 3):
- Message send animation (bubble scale + fade in)
- Tab switch transition
- Pull-to-refresh custom animation

Write every file completely. Test on both iOS and Android. Include proper TypeScript types.
```

---

## PRODUCTION HARDENING

### Prompt PROD-A - Production Deployment + Security

```text
[PASTE MASTER CONTEXT BLOCK HERE]

Help me harden Vyne for production and perform the initial production deployment.

TASKS:

1. SECURITY HARDENING:
   - Review and complete all IAM policies (least privilege)
   - Security group rules audit — ensure only required ports open
   - WAF rules on ALB: OWASP Top 10, rate limiting (1000 req/min per IP)
   - Enable AWS GuardDuty for threat detection
   - Enable AWS Config for compliance monitoring
   - Enable CloudTrail for API audit logging
   - Enable S3 bucket versioning and MFA delete protection
   - Cognito advanced security mode

2. PERFORMANCE OPTIMIZATION:
   - PostgreSQL: connection pooling via PgBouncer in transaction mode
   - Add database indexes for all frequent queries
   - Redis caching strategy: which queries get cached, TTL values
   - API response compression (gzip)
   - Next.js: ISR for static pages, RSC for dynamic
   - CDN for static assets (CloudFront)
   - Image optimization (Next.js Image component)

3. KUBERNETES MIGRATION (if ECS Fargate hits limits):

   Write complete EKS migration guide:
   - EKS cluster Terraform module
   - Helm charts for each service
   - ArgoCD ApplicationSet
   - KEDA for event-driven autoscaling (scale on SQS queue depth)
   - Linkerd service mesh for mTLS
   - Horizontal Pod Autoscaler configurations
   - Pod Disruption Budgets
   - Resource requests/limits for each service

4. OBSERVABILITY (self-monitoring):
   - OpenTelemetry instrumentation for all services (write complete setup for each language)
   - Grafana Cloud free tier connection
   - Custom dashboards: Platform Health, AI Costs, ERP Metrics
   - Alerting: PagerDuty integration for critical alerts

5. PRODUCTION DEPLOYMENT CHECKLIST:
   - Final `terraform apply` to prod environment
   - Database migrations applied
   - Cognito domain configured
   - SSL certificate validated
   - DNS cutover
   - Load test with k6: 100 concurrent users, 30 minutes
   - Smoke test all critical flows
   - Monitor for 24 hours

Write everything completely — Terraform, k8s manifests, Helm values, GitHub Actions workflows.
```

---

## LAUNCH PROMPTS

### Prompt LAUNCH-A - ProductHunt Launch Assets

```text
[PASTE MASTER CONTEXT BLOCK HERE]

Vyne is ready to launch on ProductHunt. Help me create all launch assets.

1. PRODUCTHUNT LISTING:
   - Product name: Vyne
   - Tagline (60 chars max): compelling, Slack-style, not salesy
   - Short description (260 chars): for the thumbnail
   - Full description (what Vyne does, key features, who it's for)
   - First comment (founder's note — personal, story-driven)
   - 5 Product Hunt launch day comments responding to common questions

2. SHOW HN POST:
   - Title (under 80 chars)
   - Full Show HN post body (technical, honest about what it does and doesn't do)
   - Anticipated HN questions and how to respond

3. TWITTER/X LAUNCH THREAD:
   - 10-tweet thread about Vyne (what problem it solves, the story, screenshots, call to action)

4. README.md (GitHub):
   - Complete, beautiful README with badges, architecture diagram (ASCII), quick start, features list, screenshots section, contributing guide

5. LANDING PAGE COPY:
   - Hero headline + subheadline
   - 3 feature sections with descriptions
   - Social proof section placeholder
   - Pricing section
   - FAQ section (10 questions)
   - CTA copy

Make everything authentic, developer-focused, and honest. Don't over-promise.
```

---

## REFERENCE PROMPTS

### Prompt REF-A - Debug Help

```text
[PASTE MASTER CONTEXT BLOCK HERE]

I am stuck on: [DESCRIBE YOUR PROBLEM]

The specific error or unexpected behavior: [PASTE ERROR MESSAGE]

Files involved: [LIST FILE PATHS]

Current code: [PASTE RELEVANT CODE]

What I've tried: [LIST WHAT YOU TRIED]

Please:
1. Explain why this is happening
2. Give me the fixed code (complete files, not snippets)
3. Explain what I should learn from this to avoid it next time
4. Check if this bug might affect any other part of Vyne's architecture
```

### Prompt REF-B - Code Review

```text
[PASTE MASTER CONTEXT BLOCK HERE]

Please review this code I wrote for Vyne:

FILE: [path/to/file]
[PASTE CODE]

Review it for:
1. Security issues (especially: SQL injection, tenant isolation, auth bypass)
2. Performance issues (N+1 queries, missing indexes, memory leaks)
3. Production concerns (error handling, logging, edge cases)
4. Code quality (readability, TypeScript types, naming)
5. Missing tests

Give me the improved version of every file that needs changes.
```

---

Save this file. Use one prompt per Claude conversation for best results.
Each prompt is designed to produce complete, production-quality code.
Version 1.0 — March 2026

---

## PHASE 12 — PRODUCTION HARDENING (PAID-LAUNCH READINESS)

> **Purpose.** These ten prompts close the gap between "live demo at vyne.vercel.app" and "B2B SaaS that can charge a credit card." Run them in the order at the bottom of this section — the earlier prompts unblock the later ones (e.g. real Postgres persistence must land before integration tests are meaningful).
>
> **Read first.** [VYNE MASTER PLAN.md → 🛡️ PAID-LAUNCH READINESS section](./VYNE%20MASTER%20PLAN.md) holds the matching task breakdown with acceptance criteria, time estimates, and dependencies. Keep the two documents in sync when scope changes.

---

### Prompt PH-A — Postgres-back every Zustand store (P0 — biggest blocker)

```text
[PASTE MASTER CONTEXT BLOCK HERE]

GOAL: Make user data follow the user across devices. Today only `User` + a handful of mirror routes hit Postgres; CRM deals, Ops products/orders/suppliers/BOMs/work-orders, Finance journal entries, Expenses, Invoicing (customers/invoices/credit-notes/payments/vendors/bills/refunds), Contacts (accounts/contacts), Projects/Tasks, Field-service jobs/technicians all live in localStorage via `persist()`. A user who signs in on a second device sees an empty workspace.

TARGET FILES:
- apps/web/prisma/schema.prisma — add tables for every entity (see list below)
- apps/web/src/app/api/<resource>/route.ts — REST CRUD for each resource (use the existing /api/projects + /api/tasks routes as the reference)
- apps/web/src/app/api/<resource>/[id]/route.ts — single-resource GET/PATCH/DELETE
- apps/web/src/lib/stores/<store>.ts — add `hydrateFromServer()` to every store that doesn't have one yet; keep the localStorage `persist()` for offline cache only
- apps/web/src/middleware.ts — make sure /api/* is authenticated (tenant scoping)

ENTITIES TO MIGRATE (in priority order):
1. CRM: Deal, DealActivity
2. Ops: ERPProduct, ERPOrder, ERPSupplier, ERPBOM, ERPWorkOrder, ERPCategory, ERPWarehouse
3. Finance: ERPJournalEntry, ERPJournalLine, ERPAccount
4. Invoicing: Customer, Invoice, InvoiceLineItem, CreditNote, Payment, Vendor, Bill, BillLineItem, Refund
5. Expenses: Expense (+ category limits via ERPSettings)
6. Contacts: Account, Contact, ContactActivity
7. Projects: ProjectDetail, Task, Subtask, TaskComment, TaskActivity, TaskAttachment, TeamMember (already partially done — finish the migration of subtasks/comments/activity/attachments)
8. Field service: FieldJob, Technician
9. HR: Employee, LeaveRequest (currently fixtures-only — promote to Postgres)
10. Activity log: ActivityEntry (centralised cross-record feed)

PATTERN PER STORE (reference: apps/web/src/lib/stores/projects.ts):
1. Define wire-shape (matches Prisma row) — `XxxWire`
2. `mirrorXxxCreate / Update / Delete` that POST/PATCH/DELETE `/api/xxx/:id` (fire-and-forget on success path; do NOT block the optimistic UI update)
3. `hydrateXxxFromServer()` action — GET `/api/xxx`, set state, mark `xxxHydrated = true`. Idempotent.
4. Replace `seedOrEmpty(MOCK_XXX)` with empty array — demo users still see fixtures because `useEffect(() => { if (shouldSeedFixtures()) setXxx(MOCK_XXX); }, [])` runs on first mount.
5. Add `seedOrServer()` helper in seedMode.ts that picks between demo fixtures and live hydration.

TENANT SCOPING:
- Every Prisma model gets `orgId String` + `@@index([orgId])`
- Every API route filters `where: { orgId: session.orgId }` for SELECT and includes `orgId` on INSERT
- Add a thin `tenantGuard()` helper at apps/web/src/lib/auth/tenantGuard.ts that returns `{ userId, orgId }` from the session cookie — every /api/* route imports it
- 401 if no session; 403 if the resource's orgId doesn't match

OFFLINE QUEUE:
- The existing apps/web/src/lib/offlineQueue.ts (IndexedDB) is good. Make sure every mirror function goes through `csrfFetch` so the interceptor catches offline cases and enqueues automatically.

ACCEPTANCE CRITERIA:
- [ ] Sign up Account A on browser X, add 5 deals, sign out
- [ ] Open browser Y (different machine / incognito), sign in as Account A — the 5 deals appear
- [ ] Add a 6th deal on browser Y, close it offline, come back online — deal syncs
- [ ] Across all 10 entity domains, the test above passes
- [ ] Demo-mode (cookie `vyne-demo=1`) still loads fixtures and never hits /api/*
- [ ] `prisma db push --skip-generate` runs clean in the Vercel build step
- [ ] No request goes out without a session cookie

TIME ESTIMATE: 3-4 days for a solo dev. Split as: schema + migrations (4h) → CRM (3h) → Ops (6h) → Invoicing (6h) → Finance (3h) → Expenses (2h) → Contacts (3h) → Projects finish (3h) → Field service (3h) → HR (3h) → end-to-end QA across all 10 (4h).

ROLLBACK: each store keeps its old `persist()` localStorage path. If a server hydrate fails, the store stays on the cached snapshot — log the error to errorReporter, show a soft "Working offline" badge, don't crash.

DEPENDENCIES: none. This is the blocker every other paid-launch prompt depends on. Ship this FIRST.
```

---

### Prompt PH-B — Real Sentry / observability instrumentation (P0)

```text
[PASTE MASTER CONTEXT BLOCK HERE]

GOAL: See production errors and slow requests within 60s of them happening. Today apps/web/src/lib/errorReporter.ts is Sentry-shaped but writes only to console — a paying customer hitting a 500 produces nothing actionable.

TARGET FILES:
- apps/web/package.json — add `@sentry/nextjs` (latest)
- apps/web/sentry.client.config.ts (NEW)
- apps/web/sentry.server.config.ts (NEW)
- apps/web/sentry.edge.config.ts (NEW)
- apps/web/next.config.ts — wrap with `withSentryConfig`
- apps/web/src/lib/errorReporter.ts — replace stub with real `Sentry.captureException`, keep the same exported API so nothing else needs to change
- apps/web/src/app/providers.tsx — wire `Sentry.init` browser side
- apps/web/src/app/global-error.tsx (NEW) — Sentry.captureUnderscoreError pattern
- apps/web/src/middleware.ts — add `Sentry.setTag('orgId', session.orgId)` per request

ENV VARS (set in Vercel project settings):
- SENTRY_DSN — server-side
- NEXT_PUBLIC_SENTRY_DSN — client-side (same value, public-safe)
- SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN — for sourcemap upload at build time
- SENTRY_RELEASE — set to `${VERCEL_GIT_COMMIT_SHA}` so each deploy gets a release

WHAT TO INSTRUMENT:
1. Uncaught exceptions on client + server (the `@sentry/nextjs` defaults cover this)
2. Every API route — wrap handlers with `withSentry()` and tag with `route.name`
3. Slow queries — `Sentry.startSpan({ op: 'db.prisma', name: model })` around prisma calls
4. AI streaming — `Sentry.startSpan({ op: 'ai.chat', name: provider })` around Groq/Gemini/Claude calls; capture `usage.total_tokens` as a measurement
5. Auth failures — `Sentry.captureMessage('auth.failure', { extra: { ip, email_hash } })` with `level: 'warning'` (never log the email itself)

PERFORMANCE & SAMPLING:
- tracesSampleRate: 0.1 (10% of requests get a full transaction)
- replaysSessionSampleRate: 0.05, replaysOnErrorSampleRate: 1.0
- profilesSampleRate: 0.1 (server only — Node profiler)
- Use Sentry's `beforeSend` to scrub: cookies, authorization headers, password fields, anything matching /token|key|secret|password/i

PII REDACTION:
- Strip `req.body.password`, `req.body.token`, `Authorization` header, `vyne-token` cookie before sending
- `denyUrls: [/\/api\/auth\/login/, /\/api\/auth\/signup/]` — these are noisy and contain secrets

DASHBOARDS:
- Create 3 Sentry dashboards: (a) Errors by route, (b) p95 latency by route, (c) AI provider costs by user
- Alert rules: >5 errors/min on auth, >2s p95 on /api/projects, any AI 5xx

ACCEPTANCE CRITERIA:
- [ ] Force a 500 in /api/projects → Sentry shows the stack trace within 60s, tagged with orgId
- [ ] Source-mapped stack traces show original TypeScript, not minified JS
- [ ] No secret leaks into the Sentry event payload (verify in the Sentry "raw event" view)
- [ ] Vercel deploy produces a Sentry release matching the commit SHA
- [ ] Session replay captures the user click flow for the most recent error

TIME ESTIMATE: 1 day. Install + wrap + scrub + dashboard configuration.

DEPENDENCIES: none — can run in parallel with PH-A. Ideally land before PH-A so the migration errors show up in Sentry.
```

---

### Prompt PH-C — Rate limiting on auth endpoints (P0)

```text
[PASTE MASTER CONTEXT BLOCK HERE]

GOAL: Make credential-stuffing not work. Today /api/auth/login, /api/auth/signup, /api/auth/forgot-password have ZERO rate limit. Anyone can try 10k passwords per second from a single IP.

TARGET FILES:
- apps/web/src/lib/rateLimit.ts (NEW) — Upstash Redis Rest API client; sliding-window algorithm
- apps/web/src/app/api/auth/login/route.ts — wrap with rateLimit('auth:login', 5/min, 50/hour)
- apps/web/src/app/api/auth/signup/route.ts — wrap with rateLimit('auth:signup', 3/min, 10/day)
- apps/web/src/app/api/auth/forgot-password/route.ts — wrap with rateLimit('auth:forgot', 3/15min)
- apps/web/src/app/api/auth/reset-password/route.ts — wrap with rateLimit('auth:reset', 5/hour)
- apps/web/src/middleware.ts — generic /api/* rate limit at 100 req/min/IP as backstop
- apps/web/.env.example — document UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN

WHY UPSTASH:
- Vercel functions are stateless; in-memory rate limit doesn't survive cold starts
- Upstash Redis REST API has a free tier (10k commands/day) — enough for early traffic
- Latency: ~10ms from Vercel edge to Upstash — acceptable for auth paths

ALGORITHM (sliding window):
- Key: `rl:${bucket}:${ip}` (sha256 of IP if you want PII-clean keys)
- Use ZADD with score = now, ZREMRANGEBYSCORE to drop entries older than the window, ZCARD for the count
- If count >= limit, return 429 with `Retry-After` header

PER-LIMIT CONFIG:
- login: 5/min per IP, 5/min per email_hash, 50/hour per IP
- signup: 3/min per IP, 10/day per IP
- forgot-password: 3/15min per email_hash (also dedup: same email within 15min returns the existing token)
- generic /api/*: 100/min per session (or per IP if anonymous)

LOCKOUT vs THROTTLE:
- After 10 failed logins on a single email in 1 hour: temporarily lock that account for 15 min (separate Redis key `lock:${email_hash}`)
- Surface to UI as a soft message: "Too many attempts — try again in 12 min"

ACCEPTANCE CRITERIA:
- [ ] 6 rapid login attempts from one IP → the 6th returns 429
- [ ] 4 rapid signups from one IP → the 4th returns 429
- [ ] Different IPs are not rate-limited together
- [ ] On Redis outage, the limiter fails OPEN (lets traffic through) but logs a Sentry warning — never DoS yourself
- [ ] Per-route limit overrides the generic backstop
- [ ] 429 responses include `Retry-After: <seconds>` and a human-readable JSON body

TIME ESTIMATE: 4 hours. Redis setup (30min) → rateLimit.ts (1h) → wrap 4 routes + middleware (1h) → tests + manual abuse-attempt verification (1.5h).

DEPENDENCIES: PH-B (Sentry) — so Redis outages are observable. Otherwise standalone.
```

---

### Prompt PH-D — MFA + real password-reset email flow (P1)

```text
[PASTE MASTER CONTEXT BLOCK HERE]

GOAL: Two pieces — (1) password reset emails actually leave the building, (2) accounts can enable TOTP MFA.

TARGET FILES — PASSWORD RESET:
- apps/web/src/lib/email/index.ts (NEW) — Resend SDK wrapper (Resend has a generous free tier; SES later if you want vendor independence)
- apps/web/src/lib/email/templates/passwordReset.tsx (NEW) — React Email template
- apps/web/src/app/api/auth/forgot-password/route.ts — generate reset token (PostgreSQL `PasswordResetToken` table: id, userId, tokenHash (sha256), expiresAt (now + 1h), usedAt), send email with link `${BASE_URL}/reset-password?token=${raw}`
- apps/web/src/app/api/auth/reset-password/route.ts — accept `{ token, newPassword }`, verify by hashing + checking expiresAt + usedAt is null + validatePassword, update password_hash + password_salt, mark token used, log audit entry
- apps/web/prisma/schema.prisma — add `PasswordResetToken` model

TARGET FILES — MFA (TOTP):
- apps/web/src/lib/auth/totp.ts (NEW) — use `otpauth` package for HOTP/TOTP generation + verification
- apps/web/src/app/api/auth/mfa/setup/route.ts — POST: generate secret, return `{ secret, otpauthUrl, qrPngBase64 }` (use `qrcode` package to render); user scans, then POSTs the first code to confirm
- apps/web/src/app/api/auth/mfa/confirm/route.ts — verify code, persist secret to User row (encrypted at rest with `AES-256-GCM` keyed off `MFA_ENCRYPTION_KEY` env var)
- apps/web/src/app/api/auth/mfa/disable/route.ts — requires password re-entry + valid TOTP
- apps/web/src/app/api/auth/login/route.ts — after password verify, if `user.mfaEnabled` then return `{ mfaRequired: true, mfaSessionToken }` instead of full session; client posts the 6-digit code to /api/auth/mfa/verify with that token
- apps/web/src/components/settings/MfaSettings.tsx (NEW) — UI to enable / disable / regenerate recovery codes
- apps/web/src/app/(auth)/login/page.tsx — second step: show 6-digit input when `mfaRequired`

ACCEPTANCE CRITERIA:
- [ ] Forgot-password sends a real email via Resend with a working link
- [ ] Reset token is single-use (second click on the same link returns "expired")
- [ ] Reset token expires after 1 hour
- [ ] Password reset path is rate-limited (3/15min, see PH-C)
- [ ] User can enable MFA from Settings → Security
- [ ] On login with MFA enabled, password alone returns `{ step: "mfa" }` — no full session issued
- [ ] Recovery codes work once and only once
- [ ] Disabling MFA requires both password AND valid TOTP
- [ ] Stored TOTP secret is AES-256-GCM encrypted, key from env, not stored in plain text

TIME ESTIMATE: 1.5 days. Password reset (4h) + TOTP MFA (6h) + UI (3h) + tests (3h).

DEPENDENCIES: PH-A (need Postgres for PasswordResetToken + User.totpSecret), PH-C (rate-limit the reset endpoints).
```

---

### Prompt PH-E — Stripe webhook + subscription lifecycle (P1)

```text
[PASTE MASTER CONTEXT BLOCK HERE]

GOAL: Take money. Today /pricing exists but nothing happens on click. Need: real Stripe Checkout, webhook → DB sync, customer portal, dunning emails, plan-aware feature gating.

TARGET FILES:
- apps/web/package.json — add `stripe` (server SDK) and `@stripe/stripe-js` (client)
- apps/web/src/lib/stripe/server.ts (NEW) — Stripe SDK init, `getOrCreateCustomer(userId)`
- apps/web/src/lib/stripe/products.ts (NEW) — map plan codes → Stripe price IDs (env-driven)
- apps/web/src/app/api/billing/checkout/route.ts — create Stripe Checkout Session for the picked plan, return URL
- apps/web/src/app/api/billing/portal/route.ts — create Stripe Billing Portal Session (so users can update card, cancel)
- apps/web/src/app/api/billing/webhook/route.ts — receive Stripe webhooks, verify signature, dispatch by event type (use raw body — Next.js needs `runtime = 'nodejs'` + `dynamic = 'force-dynamic'`)
- apps/web/src/components/admin/BillingSettings.tsx — show current plan, next billing date, "Manage subscription" → portal
- apps/web/prisma/schema.prisma — add Subscription model (orgId, stripeCustomerId, stripeSubscriptionId, plan, status, currentPeriodEnd, cancelAtPeriodEnd)
- apps/web/src/lib/billing/planGuard.ts (NEW) — `requirePlan(['pro', 'enterprise'])` middleware for feature flags

WEBHOOK EVENTS TO HANDLE:
- `customer.subscription.created` → create Subscription row
- `customer.subscription.updated` → patch status, plan, currentPeriodEnd
- `customer.subscription.deleted` → mark canceled, schedule downgrade at currentPeriodEnd
- `invoice.paid` → reset any `delinquent` flag
- `invoice.payment_failed` → mark `delinquent: true`, fire dunning email (uses PH-D email infra)
- `invoice.payment_action_required` → email user "action required" link to /admin/billing
- Verify signature with `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)`. Reject 400 on bad signature.

DUNNING LADDER:
- Day 0: first payment fail → "We couldn't charge your card" email
- Day 3: retry — "Card still failing"
- Day 7: final notice — "Account will downgrade in 3 days"
- Day 10: downgrade to free tier (set Subscription.plan = 'free')

PLAN GATING:
- `planGuard.ts` exports `requirePlan(['pro', 'enterprise'])` — wraps an API route
- Free plan: 1 user, 3 projects, 100 tasks, no AI
- Pro: 10 users, unlimited projects, AI included
- Enterprise: SSO, audit log export, custom retention

ACCEPTANCE CRITERIA:
- [ ] /pricing → click Upgrade → Stripe Checkout opens → use Stripe test card 4242 → redirected back to /admin/billing with Pro plan active
- [ ] Webhook events fire and DB reflects Stripe state within 5s
- [ ] Failed payment (4000 0000 0000 0341) triggers dunning email immediately
- [ ] After 10 days of failed payments, plan downgrades automatically (cron-tested)
- [ ] Webhook endpoint rejects requests with invalid signature
- [ ] AI chat returns 402 Payment Required for free-plan accounts after 50 messages/month
- [ ] Customer Portal works end-to-end (update card → next webhook → DB updated)

TIME ESTIMATE: 2 days. Setup + price IDs (3h) + checkout (3h) + webhook (6h, including idempotency + signature verify) + dunning ladder (3h) + plan gates (3h) + tests with Stripe CLI replay (4h).

DEPENDENCIES: PH-A (need Subscription table in Postgres), PH-D (email infra for dunning), PH-B (Sentry for webhook failures).
```

---

### Prompt PH-F — Tests + CI gating (P1)

```text
[PASTE MASTER CONTEXT BLOCK HERE]

GOAL: Stop shipping broken code. Today `pnpm typecheck` has pre-existing failures; there are zero integration tests; CI doesn't block merges on anything.

TARGET FILES:
- apps/web/package.json — add vitest, @vitest/ui, @testing-library/react, @testing-library/jest-dom, msw (for API mocking), playwright (already maybe?)
- apps/web/vitest.config.ts (NEW)
- apps/web/playwright.config.ts (NEW or update existing)
- apps/web/src/**/__tests__/*.test.ts(x) — unit tests
- apps/web/tests/integration/*.spec.ts — API integration tests against a test Postgres
- apps/web/tests/e2e/*.spec.ts — Playwright flows
- .github/workflows/ci.yml — gate PRs on typecheck + unit + integration + e2e
- .github/workflows/required-checks.yml — GitHub Actions ruleset blocking merge until all green

WHAT TO BUILD:
1. Fix existing typecheck errors (from the deploy logs there are real ones in ai/chat, channels, invoicing, computer-use, pdf-parse). Wire `tsc --noEmit` into CI as a required check. No new typecheck errors may land.

2. Unit tests (vitest) — coverage targets:
   - apps/web/src/lib/dsa/* — 100% (pure data)
   - apps/web/src/lib/dashboard/aggregations.ts — 100% (pure data)
   - apps/web/src/lib/auth/* — 90% (security-critical)
   - apps/web/src/lib/optimistic.ts — 100% (concurrency-critical)
   - apps/web/src/lib/offlineQueue.ts — 100% (data-loss risk)
   - Component snapshot/interaction tests for: GradientKpiTile, BOMFlowchart, ProjectsDashboardView
   - Overall target: >70% line coverage, enforced in CI

3. Integration tests (vitest + msw + supertest-style API harness):
   - Spin up `pg_tmp` or testcontainers Postgres in CI
   - Run prisma migrate, seed two orgs
   - For each /api/* route: GET/POST/PATCH/DELETE happy path + auth-required test + tenant-isolation test (org A cannot see org B's rows)
   - Auth flows: signup → login → forgot → reset → MFA enable → MFA verify

4. E2E tests (Playwright):
   - Critical flows only: signup → onboard → create deal → log out → log back in → deal still there
   - Demo mode toggle on /login
   - Stripe checkout flow (use stripe-mock or Stripe test mode)
   - Mobile viewport regression for dashboard tab

5. CI workflow:
   - On every PR: lint → typecheck → unit tests → integration tests → e2e tests → build
   - Block merge until all required checks pass (GitHub branch protection rules)
   - Parallelise where possible (typecheck + unit can run in parallel)
   - Cache pnpm store + Playwright browsers + Prisma client between runs
   - Fail CI if test coverage drops below threshold

6. Pre-commit hook (husky + lint-staged):
   - Format changed files
   - Run typecheck on changed files only (faster than full tsc)
   - No bypass without `--no-verify` (which is itself discouraged)

ACCEPTANCE CRITERIA:
- [ ] `pnpm typecheck` exits 0 on main (clear the backlog)
- [ ] Pushing a PR that breaks a test blocks merge
- [ ] Coverage report posted to PR conversation
- [ ] CI runs in <5 minutes on a clean cache
- [ ] Tenant isolation test catches a deliberate `where: {}` regression

TIME ESTIMATE: 1.5 days. Fix existing TS errors (3h) → vitest setup + 15 unit tests (4h) → integration harness + 30 route tests (5h) → 6 Playwright flows (3h) → CI workflow + branch protection (3h).

DEPENDENCIES: PH-A (integration tests need real Postgres + tenant guard), PH-B (e2e tests instrument Sentry to verify error reporting).
```

---

### Prompt PH-G — Backup / restore tested + documented (P2)

```text
[PASTE MASTER CONTEXT BLOCK HERE]

GOAL: Prove that a corrupted prod DB can be restored from backup in <30 minutes with <5 min of data loss.

TARGET FILES:
- docs/runbooks/db-restore.md (NEW) — step-by-step playbook
- apps/web/src/app/api/admin/backup/route.ts (already exists from Phase 8 — verify it actually runs)
- apps/web/src/app/api/admin/restore/route.ts (NEW) — admin-only endpoint to load a backup file
- .github/workflows/backup-verify.yml (NEW) — weekly job that pulls the latest backup, restores to a throwaway Neon branch, runs smoke tests
- scripts/restore-test.sh (NEW) — local script to validate a backup snapshot

WHAT TO BUILD:
1. Inventory the current backup cron — confirm it runs, where it writes (Neon point-in-time? S3? local?), retention policy, encryption at rest
2. If Neon: enable Point-in-Time-Restore (PITR) — 7-day window minimum, 30-day for paid
3. Document the restore procedure step by step:
   a. Stop new writes (set a maintenance flag in env or feature gate)
   b. Take a final snapshot of the corrupted DB (for forensics)
   c. Restore from the chosen point-in-time to a new database
   d. Update DATABASE_URL in Vercel + redeploy
   e. Verify smoke tests (login works, recent deal visible, AI chat responds)
   f. Re-enable writes
4. Weekly verification job (GitHub Actions on cron):
   - Pull last week's backup
   - Restore to ephemeral Neon branch
   - Run `prisma migrate status` (must be clean)
   - Run a curl-based smoke test against the restored DB
   - Post the result to #incidents Slack channel
   - Alert in Sentry if verification fails
5. RPO/RTO commitments:
   - RPO (max data loss): 5 minutes (Neon WAL + PITR)
   - RTO (max downtime): 30 minutes (worst case: full restore from snapshot)
   - Document these numbers in the runbook so support knows what to tell users
6. Customer-facing trust signal: add /status page metric "Last verified restore: <date>"

ACCEPTANCE CRITERIA:
- [ ] docs/runbooks/db-restore.md exists and a non-author engineer can follow it end-to-end
- [ ] Weekly verification job has run successfully at least 4 times
- [ ] Smoke test catches a deliberately-broken backup (mutate a row, restore, fail the test)
- [ ] /status page reflects last-verified-restore timestamp
- [ ] Sentry alert fires when verification fails

TIME ESTIMATE: 1 day. Mostly documentation + GitHub Actions wiring + actually running a restore manually once.

DEPENDENCIES: PH-A (need a real Postgres with real data to back up).
```

---

### Prompt PH-H — Legal review (privacy + terms + DPA + cookie policy) (P2)

```text
[PASTE MASTER CONTEXT BLOCK HERE]

GOAL: Make the legal pages defensible. Today /privacy and /terms are templates copied from a generic SaaS — they reference data we don't collect (cookies we don't set) and don't reference data we DO collect (AI prompts, audit logs).

TARGET FILES:
- apps/web/src/app/(marketing)/privacy/page.tsx — rewrite
- apps/web/src/app/(marketing)/terms/page.tsx — rewrite
- apps/web/src/app/(marketing)/dpa/page.tsx (NEW) — Data Processing Addendum for B2B
- apps/web/src/app/(marketing)/cookie-policy/page.tsx (NEW)
- apps/web/src/app/(marketing)/security/page.tsx (NEW) — security posture page
- apps/web/src/components/marketing/CookieBanner.tsx (NEW) — GDPR-compliant consent

WHAT TO BUILD (engineering side; legal side requires a lawyer):
1. Audit what data is actually collected:
   - Auth: email, password hash, IP (for rate-limit), user-agent
   - App: every CRUD action via the audit log → ActivityEntry table
   - AI: every prompt + response + tokens (current implementation logs to errorReporter only)
   - Analytics: none currently (consider adding privacy-respecting analytics like Plausible)
2. Generate a data-collection inventory and link from /privacy — must list:
   - Field name
   - Purpose
   - Retention period
   - Lawful basis (GDPR Art. 6) — consent / contract / legitimate interest
   - Third-party processors (Vercel, Neon, Resend, Stripe, Sentry, AI providers)
3. Rewrite /privacy with these sections:
   - What we collect
   - Why we collect it (with lawful basis)
   - Who we share it with (subprocessors)
   - Retention periods
   - User rights (access, deletion, portability, rectification)
   - Contact for DSAR (data subject access request)
   - International transfers (US ↔ EU — SCCs in DPA)
4. Rewrite /terms:
   - Acceptable use (no spam, no malware, etc.)
   - SLA — be honest (no five-9s claim)
   - Limitation of liability
   - Termination (their end + ours)
   - Data export on termination
5. DPA template (Standard Contractual Clauses) — required for EU customers; have a lawyer review before publishing
6. Cookie banner:
   - Strictly necessary (vyne-token, csrf, vyne-theme) — no consent needed
   - Functional (vyne-modules, vyne-saved-views) — opt-in
   - Analytics — opt-in
   - Marketing — opt-in
   - Store consent in `localStorage['vyne-consent']` + a `Consent` Postgres row keyed by userId
7. /security page:
   - Encryption: TLS in transit, AES-256 at rest (Neon default), envelope-encrypted secrets (Vercel)
   - Backups: PH-G policy
   - Vulnerability reporting: email security@vyne.com (set up the inbox)
   - Bug bounty: link or "not yet"

ACCEPTANCE CRITERIA:
- [ ] Privacy page lists every actual data field collected, with retention + lawful basis
- [ ] DPA page exists, lawyer-reviewed (track who + when in a comment at the top of the file)
- [ ] Cookie banner appears for new visitors, persists consent for 12 months, easily reopenable from footer
- [ ] User can request deletion → /api/account/delete kicks off a 30-day grace then hard-deletes everything (PII first, audit logs anonymised at 90d)
- [ ] /security page reflects reality, not aspirations

TIME ESTIMATE: 4 hours of engineering + 1-2 weeks of legal review (out of scope for engineering). Budget $500-2000 for a lawyer to review the DPA + terms.

DEPENDENCIES: PH-A (account-deletion endpoint needs to walk Postgres tables).
```

---

### Prompt PH-I — SOC2 / security review preparation (P2 — only if selling to enterprise)

```text
[PASTE MASTER CONTEXT BLOCK HERE]

GOAL: Get to "SOC2 Type 1 ready" — auditors can certify the controls are designed correctly. Type 2 (operating effectively for 6+ months) comes later.

TARGET FILES:
- docs/soc2/control-matrix.md (NEW) — list every SOC2 Trust Service Criterion + which Vyne control satisfies it
- docs/soc2/access-control.md (NEW) — who has prod access, MFA enforcement, review cadence
- docs/soc2/incident-response.md (NEW) — playbook
- docs/soc2/vendor-management.md (NEW) — subprocessor list + SOC2 reports on file
- docs/soc2/change-management.md (NEW) — PR review + CI gate process (links to PH-F)
- apps/web/src/app/api/admin/audit-export/route.ts — let admins export an audit log range as CSV
- apps/web/src/lib/auth/permissions.ts — formalise RBAC (already started in Phase 7 — finish)

WHAT TO BUILD:
1. Access control:
   - Vercel: only owner + 1 ops engineer have prod access; both have MFA on Vercel + GitHub
   - Neon: only owner + ops engineer have prod-DB access; SSH-key + IP allowlist
   - All prod access reviewed quarterly (document the review process)
2. Encryption:
   - In transit: TLS 1.2+ everywhere (Vercel + Neon + Resend + Stripe — verify with sslyze)
   - At rest: Neon default (AES-256), Vercel Build outputs not stored long-term
   - Application-level: TOTP secrets encrypted (PH-D), audit log signed-and-stored
3. Logging:
   - Audit log: every privileged action (admin login, user invite, plan change, data export, account delete) → ActivityEntry with `actor`, `verb`, `subject`, `ip`, `userAgent`
   - Retention: 7 years (financial-grade)
   - Tamper-evidence: write a daily checksum chain (hash of today's entries + yesterday's checksum) → tamper-detectable
   - Export: /api/admin/audit-export → CSV with the manifest + checksum
4. Incident response:
   - Defined severities: SEV1 (data breach / total outage), SEV2 (partial outage), SEV3 (degradation)
   - On-call rotation (even for solo: pager via SMS/PagerDuty free tier)
   - Playbook: detect → triage → contain → eradicate → recover → post-mortem
   - 72-hour breach notification process (GDPR Art. 33)
5. Vendor management:
   - Inventory all subprocessors: Vercel, Neon, Resend, Stripe, Sentry, Upstash, AI providers (Groq, Anthropic, Google AI)
   - Get a SOC2 Type 2 report from each
   - Document Vyne's reliance + risk per vendor
6. Change management:
   - All code changes via PR with one approver (even solo — review your own PR after a 1h cooling-off period)
   - PR template requires: risk assessment, rollback plan, testing notes
   - Production changes via CI/CD only (no manual `vercel deploy` from a laptop — though we do this now, change it)
7. Vulnerability management:
   - Weekly `pnpm audit` in CI; fail on high/critical
   - Snyk or Dependabot on dependency updates
   - Annual penetration test (budget $5-15k for an external pen-test)

ACCEPTANCE CRITERIA:
- [ ] All 5 SOC2 Trust Service Criteria (Security, Availability, Confidentiality, Processing Integrity, Privacy) have a matching control documented
- [ ] Auditor sample test: pull 5 random PRs from the last 30 days → all have an approver, a passing CI, a deploy log entry — none missing
- [ ] Audit log export produces a CSV with valid checksum chain (verify with the included verification script)
- [ ] Incident response playbook ran through a tabletop exercise (document the dry-run)

TIME ESTIMATE: 1 week (engineering) + 3-6 months (auditor engagement). Budget $20-40k for the Type 1 audit, $30-60k for Type 2.

DEPENDENCIES: PH-A (audit log needs Postgres), PH-B (incidents need to surface in Sentry), PH-F (change management needs CI gates).
```

---

### Prompt PH-J — Realtime always-on (P1)

```text
[PASTE MASTER CONTEXT BLOCK HERE]

GOAL: Collaboration features (presence, share links, live cursors) work in prod without a manual env-var dance. Today PresenceBubbles + ShareLinkButton silently no-op when NEXT_PUBLIC_PUSHER_KEY is unset.

TARGET FILES:
- apps/web/src/lib/realtime/index.ts — refactor: pick the right provider at runtime, expose a single `subscribe(channel, handler)` and `publish(channel, event)` API
- apps/web/src/lib/realtime/pusher.ts — keep existing
- apps/web/src/lib/realtime/supabase.ts — already exists from Phase 8 (with a TS error — fix)
- apps/web/src/lib/realtime/sse.ts (NEW) — pure-Vercel fallback using Server-Sent Events from a /api/realtime/[channel] route
- apps/web/src/components/shared/PresenceBubbles.tsx — drop the "if no key, render nothing" guard; use the always-on API
- apps/web/src/components/shared/ShareLinkButton.tsx — same
- apps/web/.env.example — document all three options (pusher / supabase / sse-only)

WHAT TO BUILD:
1. Provider abstraction (RealtimeProvider interface with subscribe / publish / presence methods)
2. SSE fallback (pure Vercel):
   - GET /api/realtime/[channel] → returns `Content-Type: text/event-stream`
   - Connection held open via Vercel Edge runtime (limit: 30s; reconnect on close with last-event-id)
   - In-memory pub/sub on the server (acceptable for low traffic; replace with Upstash Redis pub/sub when scaling)
   - Auth: validate session cookie before opening the stream; tag connections with `userId + orgId`
   - Presence: heartbeat every 15s via separate POST /api/realtime/[channel]/presence; server tracks `Set<userId>` per channel, broadcasts join/leave
3. Provider auto-select at boot:
   - If `NEXT_PUBLIC_PUSHER_KEY` set → Pusher
   - Else if `NEXT_PUBLIC_SUPABASE_URL` set → Supabase Realtime
   - Else → SSE fallback (always works on Vercel)
4. Drop the no-op guards in PresenceBubbles + ShareLinkButton + anywhere else that does `if (!NEXT_PUBLIC_PUSHER_KEY) return null` — instead let the abstraction handle it
5. Fix the existing `apps/web/src/lib/realtime/supabase.ts` TS error (`"broadcast" not assignable to "system"` — wrong channel-type cast)
6. Reconnection handling: on visibility change (`document.visibilityState === 'visible'`), if the connection has been idle >30s, reconnect from the last seen event id

ACCEPTANCE CRITERIA:
- [ ] With NO env vars set, presence bubbles still update across two tabs in <500ms
- [ ] With Pusher key set, traffic routes through Pusher
- [ ] With Supabase URL set, traffic routes through Supabase
- [ ] Killing the Vercel function (cold start) drops the SSE connection; client reconnects within 2s with no event loss (last-event-id replay)
- [ ] Reverted typecheck error in supabase.ts (PH-F now passes typecheck on this file)
- [ ] No silent no-ops anywhere in the codebase

TIME ESTIMATE: 1.5 days. Abstraction (3h) + SSE fallback (5h) + auto-select logic (1h) + presence + ShareLink rewrite (3h) + Supabase TS fix (30min) + tests (3h).

DEPENDENCIES: PH-F (need typecheck-clean), PH-B (realtime connection failures show in Sentry).
```

---

### Final ordering

Run the prompts in this order — each unblocks the next:

| #   | Prompt                             | Severity             | Days                  | Week                   |
| --- | ---------------------------------- | -------------------- | --------------------- | ---------------------- |
| 1   | **PH-A** Postgres-back every store | P0                   | 3-4                   | 1                      |
| 2   | **PH-B** Sentry observability      | P0                   | 1                     | 1 (parallel with PH-A) |
| 3   | **PH-C** Auth rate limiting        | P0                   | 0.5                   | 2                      |
| 4   | **PH-D** MFA + password reset      | P1                   | 1.5                   | 2                      |
| 5   | **PH-F** Tests + CI gating         | P1                   | 1.5                   | 2                      |
| 6   | **PH-E** Stripe + dunning          | P1                   | 2                     | 3                      |
| 7   | **PH-G** Backup verification       | P2                   | 1                     | 3                      |
| 8   | **PH-J** Realtime always-on        | P1                   | 1.5                   | 3 (parallel)           |
| 9   | **PH-H** Legal review              | P2                   | 0.5 + 2 wks legal     | 4                      |
| 10  | **PH-I** SOC2 prep                 | P2 (enterprise only) | 1 wk + auditor 3-6 mo | post-launch            |

After PH-A → PH-G are live and verified for two weeks of clean prod traffic, the app is **paid-launch ready** for early SMB customers. Enterprise tier needs PH-I + a signed BAA/DPA per customer.
