# VYNE — Company Operating System
## Master Implementation Plan & Engineering Specification
**Version 1.0 | Personal Startup Project | Solo Developer**

> **What is Vyne?** A single AI-native platform that replaces Slack + Jira + Notion + GitHub + Datadog + Odoo for modern companies. The AI correlates business events with infrastructure events — "Your deployment failure caused 47 orders to fail = $12,400 revenue impact." No tool does this today.

---

## 📌 QUICK REFERENCE

| Item | Value |
|------|-------|
| **Product Name** | Vyne |
| **Tagline** | The Operating System for Modern Companies |
| **Domain** | vyne.io / vyne.dev |
| **Cloud** | AWS (no personal servers) |
| **Primary Language** | TypeScript (Frontend + API Gateway) |
| **Secondary Languages** | C# .NET 9 (ERP/Auth), Python 3.12 (AI/ML) |
| **Mobile** | React Native + Expo SDK 52 |
| **Architecture** | Modular Monolith → Microservices at scale |
| **Database** | PostgreSQL 17 + pgvector (Aurora Serverless v2) |
| **AI** | AWS Bedrock (Claude 3.5 Sonnet) + LangGraph |
| **Infra** | ECS Fargate + Terraform + GitHub Actions + ArgoCD |
| **Auth** | AWS Cognito + Custom RBAC |
| **MVP Target** | Week 8 (Projects + Docs + Chat modules working) |

---

## 🗂️ MONOREPO STRUCTURE

```
vyne/
├── apps/
│   ├── web/                          # Next.js 15 (App Router)
│   │   ├── src/
│   │   │   ├── app/                  # Route segments
│   │   │   │   ├── (auth)/           # Login, signup, onboarding
│   │   │   │   ├── (dashboard)/      # Main app shell
│   │   │   │   │   ├── layout.tsx    # Sidebar + topbar shell
│   │   │   │   │   ├── projects/     # Projects module
│   │   │   │   │   ├── docs/         # Docs module
│   │   │   │   │   ├── chat/         # Messaging module
│   │   │   │   │   ├── observe/      # Observability module
│   │   │   │   │   ├── code/         # DevOps module
│   │   │   │   │   └── ops/          # ERP/MRP module
│   │   │   │   └── api/              # Next.js API routes (BFF layer)
│   │   │   ├── components/
│   │   │   │   ├── ui/               # shadcn/ui components
│   │   │   │   ├── layout/           # Sidebar, topbar, command palette
│   │   │   │   ├── projects/         # Project-specific components
│   │   │   │   ├── chat/             # Chat-specific components
│   │   │   │   ├── docs/             # Editor, blocks
│   │   │   │   └── shared/           # Shared across modules
│   │   │   ├── lib/
│   │   │   │   ├── api/              # API client functions
│   │   │   │   ├── hooks/            # Custom React hooks
│   │   │   │   ├── stores/           # Zustand stores
│   │   │   │   └── utils/            # Utility functions
│   │   │   └── types/                # TypeScript types
│   │   ├── public/
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   └── mobile/                       # React Native + Expo SDK 52
│       ├── src/
│       │   ├── app/                  # Expo Router v3 routes
│       │   │   ├── (auth)/
│       │   │   ├── (tabs)/
│       │   │   │   ├── index.tsx     # Home/inbox
│       │   │   │   ├── chat.tsx      # Messaging
│       │   │   │   ├── projects.tsx  # Project list
│       │   │   │   └── profile.tsx   # Settings
│       │   │   └── _layout.tsx
│       │   ├── components/           # Mobile-specific components
│       │   ├── hooks/                # Mobile hooks
│       │   └── stores/               # Zustand (shared with web via package)
│       ├── app.json
│       ├── package.json
│       └── eas.json
│
├── services/
│   ├── api-gateway/                  # Node.js + Express (TypeScript)
│   │   ├── src/
│   │   │   ├── routes/               # Route proxying + aggregation
│   │   │   ├── middleware/           # Auth, tenant, rate limit, logging
│   │   │   ├── websocket/            # WebSocket server (Socket.io)
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── core-service/                 # C# .NET 9 Web API
│   │   ├── Vyne.Core/
│   │   │   ├── Controllers/
│   │   │   │   ├── AuthController.cs
│   │   │   │   ├── UsersController.cs
│   │   │   │   ├── OrganizationsController.cs
│   │   │   │   └── BillingController.cs
│   │   │   ├── Domain/
│   │   │   │   ├── Users/
│   │   │   │   ├── Organizations/
│   │   │   │   └── Billing/
│   │   │   ├── Infrastructure/
│   │   │   │   ├── Data/             # EF Core DbContext
│   │   │   │   ├── Repositories/
│   │   │   │   └── Events/           # EventBridge publisher
│   │   │   └── Program.cs
│   │   ├── Vyne.Core.Tests/
│   │   ├── Vyne.Core.sln
│   │   └── Dockerfile
│   │
│   ├── erp-service/                  # C# .NET 9 Web API
│   │   ├── Vyne.ERP/
│   │   │   ├── Controllers/
│   │   │   │   ├── InventoryController.cs
│   │   │   │   ├── OrdersController.cs
│   │   │   │   ├── SuppliersController.cs
│   │   │   │   ├── ManufacturingController.cs
│   │   │   │   └── FinanceController.cs
│   │   │   ├── Domain/
│   │   │   │   ├── Inventory/
│   │   │   │   ├── Orders/
│   │   │   │   ├── BillOfMaterials/
│   │   │   │   └── WorkOrders/
│   │   │   └── Program.cs
│   │   ├── Vyne.ERP.Tests/
│   │   └── Dockerfile
│   │
│   ├── projects-service/             # C# .NET 9 Web API
│   │   ├── Vyne.Projects/
│   │   │   ├── Controllers/
│   │   │   │   ├── ProjectsController.cs
│   │   │   │   ├── IssuesController.cs
│   │   │   │   ├── SprintsController.cs
│   │   │   │   └── RoadmapsController.cs
│   │   │   └── Domain/
│   │   └── Dockerfile
│   │
│   ├── messaging-service/            # Node.js + Fastify (TypeScript)
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── channels.ts
│   │   │   │   ├── messages.ts
│   │   │   │   ├── threads.ts
│   │   │   │   └── dm.ts
│   │   │   ├── events/               # EventBridge consumers
│   │   │   ├── realtime/             # Socket.io handlers
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── ai-service/                   # Python 3.12 + FastAPI
│   │   ├── src/
│   │   │   ├── api/
│   │   │   │   ├── routers/
│   │   │   │   │   ├── analyze.py
│   │   │   │   │   ├── search.py
│   │   │   │   │   ├── agents.py
│   │   │   │   │   └── embeddings.py
│   │   │   ├── agents/
│   │   │   │   ├── incident_agent.py
│   │   │   │   ├── finance_agent.py
│   │   │   │   ├── ops_agent.py
│   │   │   │   └── orchestrator.py
│   │   │   ├── rag/
│   │   │   │   ├── ingestion.py
│   │   │   │   ├── retrieval.py
│   │   │   │   └── reranking.py
│   │   │   ├── ml/
│   │   │   │   ├── anomaly_detection.py
│   │   │   │   └── demand_forecast.py
│   │   │   └── main.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   ├── observability-service/        # Python 3.12 + FastAPI
│   │   ├── src/
│   │   │   ├── collectors/           # Prometheus, OpenTelemetry ingest
│   │   │   ├── processors/           # Metric aggregation
│   │   │   ├── alerts/               # Alert rules engine
│   │   │   └── main.py
│   │   └── Dockerfile
│   │
│   └── notification-service/         # Node.js (TypeScript)
│       ├── src/
│       │   ├── channels/
│       │   │   ├── push.ts           # AWS SNS → mobile push
│       │   │   ├── email.ts          # AWS SES
│       │   │   └── inapp.ts          # WebSocket notification
│       │   └── index.ts
│       └── Dockerfile
│
├── packages/                         # Shared packages (pnpm workspaces)
│   ├── shared-types/                 # TypeScript interfaces shared across apps+services
│   │   ├── src/
│   │   │   ├── api.ts                # API request/response types
│   │   │   ├── events.ts             # EventBridge event schemas
│   │   │   ├── entities.ts           # Core entity types
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── shared-ui/                    # React components shared web+mobile
│   │   ├── src/
│   │   │   ├── components/           # Platform-agnostic components
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── shared-config/                # ESLint, Prettier, TypeScript configs
│       ├── eslint/
│       ├── typescript/
│       └── prettier/
│
├── infrastructure/
│   ├── terraform/
│   │   ├── modules/
│   │   │   ├── networking/           # VPC, subnets, security groups
│   │   │   ├── ecs/                  # ECS Fargate cluster + task defs
│   │   │   ├── rds/                  # Aurora PostgreSQL Serverless v2
│   │   │   ├── redis/                # ElastiCache (Valkey)
│   │   │   ├── s3/                   # Storage buckets
│   │   │   ├── sqs-sns/              # Queues + topics
│   │   │   ├── eventbridge/          # Event bus
│   │   │   ├── cognito/              # Auth user pool
│   │   │   ├── bedrock/              # IAM for Bedrock
│   │   │   ├── ecr/                  # Container registries
│   │   │   ├── alb/                  # Application load balancer
│   │   │   ├── route53/              # DNS
│   │   │   ├── acm/                  # TLS certificates
│   │   │   ├── iam/                  # Roles + policies
│   │   │   └── ses/                  # Email service
│   │   ├── environments/
│   │   │   ├── dev/
│   │   │   │   ├── main.tf
│   │   │   │   ├── variables.tf
│   │   │   │   └── terraform.tfvars
│   │   │   ├── staging/
│   │   │   └── prod/
│   │   ├── backend.tf                # S3 state + DynamoDB locking
│   │   └── versions.tf
│   │
│   └── kubernetes/                   # K8s manifests (Phase 3 onwards)
│       ├── base/
│       ├── overlays/
│       │   ├── dev/
│       │   ├── staging/
│       │   └── prod/
│       └── argocd/
│           └── applicationset.yaml
│
├── .github/
│   └── workflows/
│       ├── ci-web.yml
│       ├── ci-mobile.yml
│       ├── ci-core-service.yml
│       ├── ci-erp-service.yml
│       ├── ci-projects-service.yml
│       ├── ci-messaging-service.yml
│       ├── ci-ai-service.yml
│       ├── ci-observability-service.yml
│       ├── ci-notification-service.yml
│       ├── tf-plan.yml
│       └── tf-apply.yml
│
├── docs/
│   ├── architecture/                 # Architecture decision records (ADRs)
│   ├── api/                          # OpenAPI specs
│   └── runbooks/                     # Operational runbooks
│
├── scripts/
│   ├── setup.sh                      # One-command dev environment setup
│   ├── db-migrate.sh                 # Run all pending migrations
│   └── seed.sh                       # Seed dev database
│
├── package.json                      # Root package (pnpm workspace)
├── pnpm-workspace.yaml
├── turbo.json                        # Turborepo config
├── docker-compose.yml                # Local development
└── .env.example                      # Environment variable template
```

---

## 🎨 DESIGN SYSTEM (Slack/Linear-inspired)

### Visual Philosophy
- **Dark sidebar** (#1A1A2E or similar deep navy) with light text
- **Light content area** (white/near-white) for main work surfaces
- **High contrast** — inspired by Linear's precise, clean aesthetic
- **Micro-interactions** — every click, hover, transition is fluid
- **Keyboard-first** — Cmd+K opens command palette for everything

### Color Tokens
```css
/* CSS Variables — defined in globals.css */
:root {
  /* Brand */
  --vyne-purple: #6C47FF;
  --vyne-purple-light: #8B6BFF;
  --vyne-purple-dark: #5235CC;

  /* Sidebar */
  --sidebar-bg: #1C1C2E;
  --sidebar-text: #A0A0B8;
  --sidebar-text-active: #FFFFFF;
  --sidebar-hover: #2A2A3E;
  --sidebar-active: #6C47FF;

  /* Content */
  --content-bg: #FFFFFF;
  --content-bg-secondary: #F8F8FC;
  --content-border: #E8E8F0;

  /* Text */
  --text-primary: #1A1A2E;
  --text-secondary: #6B6B8A;
  --text-tertiary: #A0A0B8;

  /* Status */
  --status-success: #22C55E;
  --status-warning: #F59E0B;
  --status-danger: #EF4444;
  --status-info: #3B82F6;

  /* Chat-specific */
  --message-bg-self: #EEE9FF;
  --message-bg-other: #F4F4F8;
  --online-indicator: #22C55E;
}
```

### Typography
```css
/* Font stack — Geist (Vercel's font, free) */
font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
font-family: 'Geist Mono', 'Fira Code', monospace; /* for code */

/* Scale */
--text-xs: 11px;
--text-sm: 13px;
--text-base: 14px;   /* Default body */
--text-md: 15px;
--text-lg: 17px;
--text-xl: 20px;
--text-2xl: 24px;
--text-3xl: 30px;
```

### Component Patterns (Slack-inspired)
```
┌─────────────────────────────────────────────────────────┐
│ [SIDEBAR - 240px]          [CONTENT AREA]               │
│                                                         │
│ ⬡ Vyne                     ┌─────────────────────────┐ │
│                             │ Channel: #general       │ │
│ 📁 Projects          ←      │                         │ │
│   └ Sprint Q4               │ [Message history]       │ │
│   └ Bug Tracker             │                         │ │
│                             │                         │ │
│ 💬 Channels                 │ [Message input with     │ │
│   └ #general          •     │  TipTap editor]         │ │
│   └ #alerts           ●     │                         │ │
│   └ #deployments            └─────────────────────────┘ │
│                                                         │
│ 📦 Ops                     [AI Sidebar - 280px]         │
│ 👁️ Observe                  ┌─────────────────────────┐ │
│ 🔧 Code                     │ Vyne AI                 │ │
│                             │ Ask anything...         │ │
│ ─────────────────           └─────────────────────────┘ │
│ [User Avatar] Preet                                     │
└─────────────────────────────────────────────────────────┘
```

### Figma Setup (How to use Figma for this project)
1. Create Figma project: "Vyne — Design System"
2. Page 1: **Foundations** — Colors, Typography, Spacing, Icons
3. Page 2: **Components** — Buttons, Inputs, Cards, Badges, Avatars
4. Page 3: **Layout Patterns** — Sidebar, Topbar, Message bubble, Modal
5. Page 4: **Module Screens** — Projects, Chat, Docs, Ops, Observe
6. Page 5: **Mobile Screens** — iOS/Android adaptations
7. Use Auto Layout everywhere — critical for responsive design
8. Create a **Design Token** file that maps directly to CSS variables

---

## 🛠️ COMPLETE TECH STACK

### Frontend — Web (Next.js 15 + TypeScript)

| Technology | Version | Why |
|-----------|---------|-----|
| **Next.js** | 15.x (App Router) | Server components, Turbopack 2-3x faster builds, streaming |
| **TypeScript** | 5.7+ | Type safety across entire codebase |
| **Tailwind CSS** | 4.x | Utility-first, no CSS files to maintain |
| **shadcn/ui** | Latest | Source-owned components, no dependency lock-in, Radix UI primitives |
| **Zustand** | 5.x | 3KB, hook-based, no boilerplate vs Redux |
| **TanStack Query** | v5 | Server state, caching, background refetch, optimistic updates |
| **TanStack Table** | v8 | Headless table for ERP data grids (inventory, orders) |
| **Socket.io Client** | 4.x | Real-time chat, presence, live updates |
| **TipTap** | 2.x | Block-based rich text editor (Notion-like docs) |
| **Framer Motion** | 11.x | Animations for message transitions, sidebar collapses |
| **dnd-kit** | 6.x | Drag-and-drop for Kanban boards, reordering |
| **React Flow** | 12.x | Service dependency graph, workflow builder |
| **Recharts** | 2.x | Charts for ERP dashboards, observability metrics |
| **date-fns** | 3.x | Date manipulation |
| **Lucide React** | Latest | Icon library (consistent with shadcn/ui) |
| **Geist Font** | Latest | Typography (same as Vercel uses) |

### Frontend — Mobile (React Native + Expo)

| Technology | Version | Why |
|-----------|---------|-----|
| **Expo** | SDK 52 | Managed workflow, OTA updates, EAS Build |
| **Expo Router** | v3 | File-based routing, type-safe navigation |
| **React Native Reanimated** | 3.x | 60fps animations on native thread |
| **Expo Notifications** | Latest | Push notifications via AWS SNS |
| **WatermelonDB** | Latest | Offline-first database, 100K+ records smooth |
| **React Native MMKV** | Latest | Ultra-fast key-value storage (replaces AsyncStorage) |
| **Expo Camera** | Latest | QR code scanning for inventory |
| **Socket.io Client** | 4.x | Real-time messaging (same as web) |
| **Zustand** | 5.x | Same stores shared from `packages/shared-config` |
| **Expo EAS** | Latest | Build + Submit to App Store / Google Play |

**Code sharing estimate:** ~40% of business logic, types, and utility functions shared between web and mobile via `packages/shared-types` and `packages/shared-ui`.

### Backend Services

#### Service 1: API Gateway (TypeScript + Node.js + Fastify)
```
Framework:     Fastify 5.x (2x faster than Express)
WebSockets:    Socket.io 4.x (namespace per org)
Auth:          JWT verification middleware (Cognito public key)
Rate Limiting: @fastify/rate-limit (Redis-backed)
Logging:       Pino (structured JSON logs → CloudWatch)
Tracing:       OpenTelemetry @opentelemetry/sdk-node
Port:          3000
```

#### Service 2: Core Service (C# .NET 9)
```
Framework:     .NET 9 Minimal APIs
ORM:           Entity Framework Core 9 + Npgsql
Auth:          ASP.NET Core Identity + Cognito JWT validation
Multi-tenancy: Custom ITenantContext + RLS via EF Core
Events:        AWS EventBridge SDK
Testing:       xUnit + FluentAssertions + Testcontainers
Port:          5001
Key libs:
  - AWSSDK.EventBridge
  - AWSSDK.SecretsManager
  - OpenTelemetry.Exporter.OpenTelemetryProtocol
  - Stripe.net (billing)
```

#### Service 3: ERP Service (C# .NET 9)
```
Framework:     .NET 9 Minimal APIs
ORM:           Entity Framework Core 9
Patterns:      CQRS (MediatR), Domain Events
Background:    IHostedService for scheduled jobs (reorder alerts)
Port:          5002
Key libs:
  - MediatR (CQRS)
  - FluentValidation
  - QuestPDF (PDF invoice generation)
  - AWSSDK.SQS (event publishing)
```

#### Service 4: Projects Service (C# .NET 9)
```
Framework:     .NET 9 Minimal APIs
ORM:           Entity Framework Core 9
Patterns:      CQRS, Repository pattern
Real-time:     SignalR for live issue updates
Port:          5003
```

#### Service 5: Messaging Service (TypeScript + Node.js + Fastify)
```
Framework:     Fastify 5.x
Real-time:     Socket.io 4.x (the source of truth for WS)
Queue:         BullMQ (Redis-backed job queues for message processing)
Search:        PostgreSQL tsvector (full-text) + pgvector (semantic)
Port:          4000
Key libs:
  - socket.io
  - bullmq
  - @aws-sdk/client-s3 (file attachments via pre-signed URLs)
  - @aws-sdk/client-eventbridge
```

#### Service 6: AI Service (Python 3.12 + FastAPI)
```
Framework:     FastAPI + Uvicorn
LLM:           AWS Bedrock (Claude 3.5 Sonnet)
Agents:        LangGraph 0.2+
RAG:           LangChain 0.3 + pgvector
Embeddings:    Amazon Bedrock Titan Embeddings v2
Vector DB:     pgvector (same PostgreSQL instance, separate schema)
ML:            scikit-learn (anomaly detection), Prophet (forecasting)
Port:          8000
Key libs:
  - langchain==0.3.x
  - langgraph==0.2.x
  - langchain-aws (Bedrock integration)
  - psycopg2-binary (pgvector queries)
  - opentelemetry-sdk
  - pytest + pytest-asyncio
```

#### Service 7: Observability Service (Python 3.12 + FastAPI)
```
Framework:     FastAPI
Ingest:        Prometheus remote write endpoint
               OTLP gRPC endpoint (traces/logs)
Storage:       TimescaleDB (PostgreSQL extension) for time-series
Alerts:        Custom rule engine + EventBridge publisher
Port:          8001
Key libs:
  - prometheus-client
  - opentelemetry-sdk
  - psycopg2-binary (TimescaleDB queries)
```

#### Service 8: Notification Service (TypeScript + Node.js)
```
Framework:     Fastify 5.x
Push:          AWS SNS → Firebase FCM (Android) / APNs (iOS)
Email:         AWS SES (transactional emails)
In-app:        EventBridge listener → Socket.io emit
Queue:         SQS consumer for notification jobs
Port:          4001
```

### Database Layer

| Database | Use Case | AWS Service |
|----------|----------|-------------|
| **PostgreSQL 17** | Primary OLTP (users, orgs, projects, orders, messages) | Aurora Serverless v2 |
| **pgvector** | Vector embeddings for RAG + semantic search | Extension on Aurora |
| **TimescaleDB** | Time-series metrics from observability | Extension on Aurora |
| **Redis 7 (Valkey)** | Sessions, caching, BullMQ queues, pub/sub | ElastiCache (cache.t4g.micro) |
| **S3** | File attachments, model artifacts, Terraform state, logs | S3 Standard |
| **DynamoDB** | Real-time presence (online/offline status), ephemeral sessions | DynamoDB On-Demand |

### Database Schema (Core Tables)

```sql
-- MULTI-TENANCY: All tables have tenant_id + RLS policies

-- Organizations (top-level tenant)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan VARCHAR(50) DEFAULT 'free',  -- free | starter | business | enterprise
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  cognito_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'member',  -- owner | admin | member | viewer
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy example
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON users
  USING (organization_id = current_setting('app.current_tenant')::UUID);

-- Projects module
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',  -- active | archived | completed
  lead_id UUID REFERENCES users(id),
  icon VARCHAR(10),
  color VARCHAR(7),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID REFERENCES projects(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'todo',  -- todo | in_progress | in_review | done | cancelled
  priority VARCHAR(20) DEFAULT 'medium',  -- urgent | high | medium | low | none
  assignee_id UUID REFERENCES users(id),
  reporter_id UUID REFERENCES users(id),
  sprint_id UUID,
  parent_issue_id UUID REFERENCES issues(id),  -- sub-tasks
  labels TEXT[],
  due_date DATE,
  estimate DECIMAL(5,2),  -- story points
  position DECIMAL(10,6),  -- for ordering within status column
  embedding VECTOR(1536),  -- pgvector for semantic search
  search_vector TSVECTOR,  -- full-text search
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messaging module
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(20) DEFAULT 'public',  -- public | private | dm | ai_bot
  is_system BOOLEAN DEFAULT false,    -- #alerts, #deployments (auto-managed)
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  channel_id UUID REFERENCES channels(id),
  user_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  content_type VARCHAR(20) DEFAULT 'text',  -- text | system | rich_embed
  thread_id UUID REFERENCES messages(id),  -- null = top-level, non-null = reply
  reply_count INT DEFAULT 0,
  reactions JSONB DEFAULT '{}',  -- {"👍": ["user_id_1", "user_id_2"]}
  attachments JSONB DEFAULT '[]',
  rich_embed JSONB,  -- for AI-generated deployment cards, order cards
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  embedding VECTOR(1536),  -- semantic search over messages
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ERP: Inventory
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  sku VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  unit_of_measure VARCHAR(50),
  cost_price DECIMAL(12,4),
  sale_price DECIMAL(12,4),
  reorder_point INT,
  reorder_quantity INT,
  barcode VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inventory_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  product_id UUID REFERENCES products(id),
  location_id UUID,  -- warehouse/bin
  quantity_on_hand DECIMAL(12,4) DEFAULT 0,
  quantity_reserved DECIMAL(12,4) DEFAULT 0,
  quantity_available DECIMAL(12,4) GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ERP: Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  order_number VARCHAR(100) UNIQUE NOT NULL,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'draft',  -- draft | confirmed | processing | shipped | delivered | cancelled
  total_amount DECIMAL(12,2),
  currency VARCHAR(3) DEFAULT 'USD',
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Manufacturing / MRP
CREATE TABLE bill_of_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  product_id UUID REFERENCES products(id),  -- finished product
  version VARCHAR(20) DEFAULT '1.0',
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bom_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id UUID REFERENCES bill_of_materials(id),
  component_product_id UUID REFERENCES products(id),
  quantity DECIMAL(12,4) NOT NULL,
  unit_of_measure VARCHAR(50),
  notes TEXT
);

-- Observability (TimescaleDB)
CREATE TABLE metrics (
  time TIMESTAMPTZ NOT NULL,
  organization_id UUID NOT NULL,
  service_name VARCHAR(255),
  metric_name VARCHAR(255),
  value DOUBLE PRECISION,
  labels JSONB DEFAULT '{}'
);
SELECT create_hypertable('metrics', 'time');

-- RAG / AI embeddings
CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  source_type VARCHAR(50),   -- issue | message | order | incident | doc
  source_id UUID,
  content TEXT,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON document_embeddings USING hnsw (embedding vector_cosine_ops);
```

### AWS Infrastructure

```
┌─────────────────────── AWS Account ─────────────────────────────┐
│                                                                  │
│  Route53 (DNS) → ACM (TLS) → ALB (HTTPS:443)                   │
│                                    │                            │
│  ┌──────────────── VPC (10.0.0.0/16) ────────────────────────┐  │
│  │                                                           │  │
│  │  Public Subnets (10.0.1.0/24, 10.0.2.0/24, 10.0.3.0/24)  │  │
│  │  ├── ALB (internet-facing)                                │  │
│  │  └── NAT Gateway                                          │  │
│  │                                                           │  │
│  │  Private Subnets (10.0.11.0/24, 10.0.12.0/24, ...)       │  │
│  │  ├── ECS Fargate Tasks:                                   │  │
│  │  │     api-gateway (:3000)                                │  │
│  │  │     core-service (:5001)                               │  │
│  │  │     erp-service (:5002)                                │  │
│  │  │     projects-service (:5003)                           │  │
│  │  │     messaging-service (:4000)                          │  │
│  │  │     ai-service (:8000)                                 │  │
│  │  │     observability-service (:8001)                      │  │
│  │  │     notification-service (:4001)                       │  │
│  │  │                                                        │  │
│  │  Isolated Subnets (10.0.21.0/24, ...)                     │  │
│  │  ├── Aurora PostgreSQL Serverless v2 (Multi-AZ)           │  │
│  │  ├── ElastiCache Redis (Valkey) cache.t4g.micro           │  │
│  │  └── VPC Endpoints (S3, ECR, Secrets Manager, Bedrock)    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  AWS Services (managed):                                         │
│  ├── Cognito (User Pool + App Client)                            │
│  ├── EventBridge (default event bus + custom bus)                │
│  ├── SQS (FIFO queues per domain)                                │
│  ├── SNS (push notifications)                                    │
│  ├── SES (email)                                                 │
│  ├── S3 (files, state, artifacts)                                │
│  ├── Bedrock (Claude 3.5 Sonnet, Titan Embeddings)               │
│  ├── ECR (container registries, one per service)                 │
│  └── Secrets Manager (all secrets)                               │
└──────────────────────────────────────────────────────────────────┘
```

### AWS Cost Estimates

#### Phase 1 — Solo Dev / MVP ($0-50/month)
| Service | Config | Cost |
|---------|--------|------|
| ECS Fargate | 4 tasks × 0.25 vCPU / 512MB (run ~8h/day dev) | ~$10-20 |
| Aurora Serverless v2 | Min 0.5 ACU (scales to 0 when idle) | ~$20-30 |
| ElastiCache | cache.t4g.micro | $12 |
| ALB | 1 ALB + ~10GB processed | $18 |
| Route53 | 1 hosted zone | $0.50 |
| S3 | 10GB + requests | $1 |
| Bedrock | ~$5/day dev usage Claude 3.5 Sonnet | $0-15 |
| SQS/SNS/SES | Under free tier | $0 |
| ECR | 10GB images | $1 |
| **TOTAL** | | **~$60-100/mo** |

*Apply AWS Activate Founders ($1,000 free credits) → effectively $0 for 10+ months*

#### Phase 2 — Early SaaS, 10-50 customers (~$300-500/month)
| Service | Config | Cost |
|---------|--------|------|
| ECS Fargate | 8 tasks running 24/7, 0.5 vCPU / 1GB each | ~$120 |
| Aurora Serverless v2 | 2-8 ACU depending on load | ~$80 |
| ElastiCache | cache.m7g.medium | $65 |
| ALB | Higher traffic | $25 |
| Bedrock | ~500K tokens/day | ~$50 |
| S3 | 100GB | $5 |
| SES | 10K emails | $1 |
| Data transfer | ~100GB/mo | $9 |
| **TOTAL** | | **~$350-450/mo** |

#### Phase 3 — Growth, 100+ customers (~$1,500-3,000/month)
- Switch to Reserved capacity for 30% savings
- Use Spot instances for AI service (interruptible workloads)
- Aurora provisioned (cheaper at consistent high load)

---

## 🚀 CI/CD PIPELINES

### GitHub Actions Structure

#### `ci-web.yml` (triggers: push to `apps/web/**`)
```yaml
name: CI — Web Dashboard
on:
  push:
    paths: ['apps/web/**', 'packages/**']
  pull_request:
    paths: ['apps/web/**', 'packages/**']

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter web lint
      - run: pnpm --filter web typecheck
      - run: pnpm --filter web test

  build-push:
    needs: quality
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      id-token: write   # OIDC auth to AWS (no static keys!)
      contents: read
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::ACCOUNT:role/github-actions-role
          aws-region: us-east-1
      - uses: aws-actions/amazon-ecr-login@v2
      - name: Build & Push
        run: |
          docker build -t $ECR_REGISTRY/vyne-web:${{ github.sha }} ./apps/web
          docker push $ECR_REGISTRY/vyne-web:${{ github.sha }}
      - name: Update ArgoCD
        run: |
          # Update image tag in gitops repo
          git clone https://github.com/org/vyne-gitops
          sed -i "s|image:.*|image: $ECR_REGISTRY/vyne-web:${{ github.sha }}|" \
            vyne-gitops/overlays/staging/web/deployment.yaml
          git commit -am "deploy: web ${{ github.sha }}"
          git push
```

#### `ci-core-service.yml` (C# .NET 9)
```yaml
jobs:
  test:
    steps:
      - run: dotnet restore
      - run: dotnet build --no-restore
      - run: dotnet test --no-build --collect:"XPlat Code Coverage"
  
  build-push:
    # Docker multi-stage build for .NET
    # FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
    # COPY . .
    # RUN dotnet publish -c Release -o /app/publish
    # FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS runtime
    # COPY --from=build /app/publish .
    # ENTRYPOINT ["dotnet", "Vyne.Core.dll"]
```

#### `ci-ai-service.yml` (Python)
```yaml
jobs:
  test:
    steps:
      - run: pip install -r requirements.txt
      - run: mypy src/          # type checking
      - run: pytest tests/ -v   # unit tests
      - run: ruff check src/    # linting
```

#### `ci-mobile.yml` (Expo EAS)
```yaml
jobs:
  test:
    steps:
      - run: pnpm --filter mobile test
  
  build:
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: expo/expo-github-action@v8
      - run: eas build --platform all --non-interactive
```

### Deployment Strategy: **Canary** via Argo Rollouts
```yaml
# Argo Rollout manifest example
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: vyne-web
spec:
  replicas: 4
  strategy:
    canary:
      steps:
        - setWeight: 10     # 10% of traffic to new version
        - pause: {duration: 5m}
        - analysis:
            templates:
              - templateName: error-rate  # Check error rate before proceeding
        - setWeight: 50
        - pause: {duration: 5m}
        - setWeight: 100
```

---

## 🤖 AI ARCHITECTURE

### LangGraph Multi-Agent Design
```python
# agents/orchestrator.py
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.postgres import PostgresSaver

class VyneOrchestrator:
    """Routes incoming queries to specialized agents"""

    def __init__(self):
        self.graph = self._build_graph()

    def _build_graph(self):
        workflow = StateGraph(AgentState)

        # Nodes
        workflow.add_node("classify", self.classify_intent)
        workflow.add_node("incident_agent", IncidentAgent().run)
        workflow.add_node("finance_agent", FinanceAgent().run)
        workflow.add_node("ops_agent", OpsAgent().run)
        workflow.add_node("infra_agent", InfraAgent().run)
        workflow.add_node("general", GeneralAgent().run)

        # Routing
        workflow.add_conditional_edges("classify", self.route_to_agent)

        return workflow.compile(
            checkpointer=PostgresSaver(...)  # Persistent state
        )
```

### Four Specialized Agents

**IncidentAgent** — Triggered by: anomaly detected, deployment failed, alert fired
```
Tools: query_logs, query_metrics, query_deployments, query_affected_orders,
       create_incident, send_channel_message, suggest_rollback, create_issue
RAG sources: incident runbooks, past incidents, deployment history
Output: Incident report posted to #alerts channel with rich embed card
Cross-domain: "Deployment v2.4.1 failed. 47 orders are stuck in 'processing'.
               Estimated $12,400 revenue impact. Recommend rollback."
```

**FinanceAgent** — Triggered by: order_failed, EOD schedule, weekly report
```
Tools: query_orders, query_revenue, query_inventory, calculate_impact,
       send_report, forecast_demand
RAG sources: historical orders, payment patterns, seasonal trends
Output: Revenue impact analysis, demand forecasting, cash flow alerts
```

**OpsAgent** — Triggered by: inventory_low, manufacturing_delay, reorder_needed
```
Tools: query_inventory, query_suppliers, query_bom, suggest_reorder,
       draft_purchase_order, update_work_order
RAG sources: supplier lead times, demand history, production schedules
Output: Procurement recommendations, automatic draft POs for approval
```

**InfraAgent** — Triggered by: scheduled hourly, cost_threshold_exceeded
```
Tools: query_aws_costs, query_k8s_utilization, query_ecs_metrics,
       suggest_rightsizing, generate_terraform_recommendation
RAG sources: AWS pricing data, historical utilization, best practices
Output: Cost optimization report, infrastructure health score
```

### RAG Pipeline
```python
# rag/ingestion.py
async def ingest_document(
    source_type: str,      # "issue" | "message" | "order" | "incident"
    source_id: str,
    content: str,
    tenant_id: str,
    metadata: dict
):
    # 1. Chunk the content
    chunks = semantic_chunk(content, max_tokens=512, overlap=0.15)

    # 2. Embed each chunk using Bedrock Titan Embeddings v2
    embeddings = await bedrock_client.embed_batch(chunks)

    # 3. Store in pgvector
    await db.execute("""
        INSERT INTO document_embeddings
        (organization_id, source_type, source_id, content, embedding, metadata)
        VALUES ($1, $2, $3, $4, $5::vector, $6)
    """, [tenant_id, source_type, source_id, chunk, embedding, metadata]
    for chunk, embedding in zip(chunks, embeddings))

# rag/retrieval.py
async def hybrid_search(query: str, tenant_id: str, top_k: int = 20):
    query_embedding = await bedrock_client.embed(query)

    # Hybrid: vector + keyword, then rerank
    results = await db.fetch("""
        WITH vector_results AS (
            SELECT id, content, metadata,
                   1 - (embedding <=> $1::vector) AS score
            FROM document_embeddings
            WHERE organization_id = $2
            ORDER BY embedding <=> $1::vector
            LIMIT 20
        ),
        keyword_results AS (
            SELECT id, content, metadata,
                   ts_rank(search_vector, plainto_tsquery($3)) AS score
            FROM document_embeddings
            WHERE organization_id = $2
              AND search_vector @@ plainto_tsquery($3)
            LIMIT 20
        )
        SELECT * FROM vector_results
        UNION ALL
        SELECT * FROM keyword_results
        LIMIT 40
    """, [query_embedding, tenant_id, query])

    # Rerank top results using Cohere or simple RRF
    return reciprocal_rank_fusion(results)[:top_k]
```

---

## 📱 MOBILE APP SPECIFICS

### Key Mobile Features
- **Real-time chat** — Socket.io client with WatermelonDB local cache
- **Offline-first** — WatermelonDB syncs when connection restored
- **Push notifications** — Expo → AWS SNS → FCM (Android) / APNs (iOS)
- **QR scanner** — Expo Camera for inventory barcode scanning
- **Biometric auth** — Expo LocalAuthentication (Face ID / fingerprint)
- **Deep links** — `vyne://chat/channel-id`, `vyne://projects/issue-id`

### Mobile Navigation Structure (Expo Router v3)
```
app/
├── (auth)/
│   ├── login.tsx
│   ├── signup.tsx
│   └── verify.tsx
├── (tabs)/
│   ├── _layout.tsx     (bottom tab bar)
│   ├── index.tsx       (Inbox — AI + notifications)
│   ├── chat/
│   │   ├── index.tsx   (Channel list)
│   │   └── [id].tsx    (Channel view)
│   ├── projects/
│   │   ├── index.tsx   (My issues)
│   │   └── [id].tsx    (Issue detail)
│   ├── scan.tsx        (QR scanner for inventory)
│   └── profile.tsx     (Settings)
└── _layout.tsx         (Root layout with auth gate)
```

### EAS Build Configuration
```json
// eas.json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "staging": {
      "distribution": "internal",
      "env": { "APP_ENV": "staging" }
    },
    "production": {
      "distribution": "store",
      "env": { "APP_ENV": "production" }
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "your@email.com", "ascAppId": "APP_ID" },
      "android": { "serviceAccountKeyPath": "./google-service-account.json" }
    }
  }
}
```

---

## 🔒 SECURITY ARCHITECTURE

### Multi-Tenant Security (JWT + RLS)
```typescript
// middleware/tenant.ts
export async function tenantMiddleware(req, reply) {
  const token = req.headers.authorization?.split(' ')[1];
  const payload = await verifyJWT(token); // Cognito public key

  // Token contains: { sub, email, org_id, role, permissions[] }
  req.tenant = {
    organizationId: payload.org_id,
    userId: payload.sub,
    role: payload.role,
    permissions: payload.permissions
  };

  // Set PostgreSQL session variable for RLS
  await db.execute(`SET LOCAL app.current_tenant = '${payload.org_id}'`);
}
```

### RBAC Permission Matrix
```
Permission                Owner  Admin  Member  Viewer
─────────────────────────────────────────────────────
org:manage                ✓      -      -       -
users:invite              ✓      ✓      -       -
users:manage              ✓      ✓      -       -
projects:create           ✓      ✓      ✓       -
projects:delete           ✓      ✓      -       -
issues:create             ✓      ✓      ✓       -
issues:delete             ✓      ✓      -       -
channels:create           ✓      ✓      ✓       -
messages:send             ✓      ✓      ✓       -
orders:create             ✓      ✓      ✓       -
orders:delete             ✓      ✓      -       -
inventory:manage          ✓      ✓      ✓       -
billing:manage            ✓      -      -       -
observe:view              ✓      ✓      ✓       ✓
ai:query                  ✓      ✓      ✓       ✓
```

### Secrets Management
```
AWS Secrets Manager:
  vyne/prod/database-url
  vyne/prod/redis-url
  vyne/prod/bedrock-api-key
  vyne/prod/cognito-client-secret
  vyne/prod/stripe-secret-key
  vyne/prod/github-app-private-key

ECS Task Role → IAM Policy → secretsmanager:GetSecretValue
(No secrets in environment variables, no secrets in code)
```

---

## 📊 OBSERVABILITY (Self-monitoring)

### OpenTelemetry Setup for Each Language

**TypeScript services:**
```typescript
// telemetry.ts (loaded before everything else)
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
const sdk = new NodeSDK({
  serviceName: process.env.SERVICE_NAME,
  traceExporter: new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_ENDPOINT }),
});
sdk.start();
```

**C# services:**
```csharp
// Program.cs
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation()
        .AddEntityFrameworkCoreInstrumentation()
        .AddOtlpExporter(o => o.Endpoint = new Uri(otelEndpoint)));
```

**Python services:**
```python
# main.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(provider)
```

### Grafana Cloud Dashboard Setup
- Free tier: 10K metrics, 50GB logs, 50GB traces/month
- Connect OTLP endpoint → Grafana Cloud
- Build 4 dashboards: Platform Health, AI Usage, ERP Metrics, Infrastructure

---

## 📦 TERRAFORM MODULE STRUCTURE

```hcl
# infrastructure/terraform/modules/networking/main.tf
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr       # 10.0.0.0/16
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "vyne-${var.env}-vpc" }
}

# Public subnets (3 AZs) — ALB, NAT
resource "aws_subnet" "public" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 1)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
}

# Private subnets — ECS tasks
# Isolated subnets — Aurora, Redis
```

```hcl
# infrastructure/terraform/environments/dev/main.tf
module "networking" {
  source   = "../../modules/networking"
  env      = "dev"
  vpc_cidr = "10.0.0.0/16"
}

module "rds" {
  source        = "../../modules/rds"
  env           = "dev"
  instance_class = "db.serverless"  # Aurora Serverless v2
  min_capacity  = 0.5
  max_capacity  = 4
}

# State backend
terraform {
  backend "s3" {
    bucket         = "vyne-terraform-state"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "vyne-terraform-locks"
    encrypt        = true
  }
}
```

---

## 💰 MONETIZATION

### Pricing Tiers
| Plan | Price | Users | Storage | AI Queries | Support |
|------|-------|-------|---------|------------|---------|
| **Free** | $0 | 1 | 1GB | 50/day | Community |
| **Starter** | $12/user/mo | Unlimited | 50GB | 500/day | Email |
| **Business** | $24/user/mo | Unlimited | 200GB | Unlimited | Priority |
| **Enterprise** | Custom | Unlimited | Unlimited | Custom agents | Dedicated CSM |

### Revenue Targets
| Month | MRR | Customers | Action |
|-------|-----|-----------|--------|
| 5 | $500 | 5 paying | First validation |
| 8 | $2,000 | 15-20 | MVP launch |
| 12 | $5,000 | 40-50 | Product-market fit signal |
| 18 | $15,000 | 100+ | Hire first employee |
| 24 | $40,000 | 250+ | Series A ready |

---

## 🗺️ 16-WEEK EXECUTION ROADMAP

### PHASE 0: Foundation (Weeks 1-2)

**GOAL: Infrastructure + monorepo running, first service deployed**

#### Week 1 — Setup Everything
| Day | Tasks |
|-----|-------|
| **Mon** | Create GitHub org, init monorepo, configure pnpm workspaces + Turborepo |
| **Mon** | Create AWS account (personal), apply AWS Activate Founders ($1,000 credits) |
| **Mon** | Register vyne.io domain (Namecheap/Cloudflare) |
| **Tue** | Write Terraform: S3 state bucket + DynamoDB lock table (this comes FIRST) |
| **Tue** | Write Terraform modules: VPC, subnets, security groups |
| **Tue** | Configure GitHub Actions: `tf-plan.yml` runs on PR, `tf-apply.yml` on merge |
| **Wed** | Write Terraform: Cognito user pool + app client |
| **Wed** | Write Terraform: Aurora PostgreSQL Serverless v2 (dev) |
| **Wed** | Write Terraform: ElastiCache Redis (Valkey) t4g.micro |
| **Thu** | Write Terraform: ECR repositories (one per service, 8 total) |
| **Thu** | Write Terraform: ECS Fargate cluster + task execution role |
| **Thu** | Write Terraform: ALB + target groups + Route53 + ACM |
| **Fri** | `terraform apply -var-file=environments/dev/terraform.tfvars` → ALL infrastructure up |
| **Fri** | Document architecture in `docs/architecture/001-infrastructure.md` |
| **Fri** | Set up `.env.example` with all required variables |

**Acceptance criteria:** `terraform apply` completes with 0 errors. Aurora endpoint accessible from private subnet. Redis accessible. Cognito pool exists. ALB returns 200 on health check.

#### Week 2 — Core Service + Auth
| Day | Tasks |
|-----|-------|
| **Mon** | Scaffold `services/core-service` — `dotnet new webapi -o Vyne.Core` |
| **Mon** | Add EF Core + Npgsql + AWSSDK.SecretsManager NuGet packages |
| **Tue** | Create initial database migrations: organizations, users tables + RLS policies |
| **Tue** | Implement Cognito JWT validation middleware |
| **Tue** | Implement tenant extraction middleware (reads JWT, sets RLS session variable) |
| **Wed** | Build Auth controller: `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| **Wed** | Build Organizations controller: CRUD |
| **Wed** | Build Users controller: invite, list, update role |
| **Thu** | Write xUnit tests for auth and tenant isolation |
| **Thu** | Write `services/core-service/Dockerfile` (multi-stage, .NET 9 Alpine runtime) |
| **Thu** | Write `ci-core-service.yml` GitHub Action |
| **Fri** | Deploy core-service to ECS Fargate |
| **Fri** | Test: register user via Postman → JWT returned → `/auth/me` returns user |

**Acceptance criteria:** User can register, login, get their profile. JWT contains org_id. RLS prevents cross-tenant data access (write a test for this!).

---

### PHASE 1: Projects Module (Weeks 3-5)

**GOAL: Full-featured project management — Linear-quality, keyboard-first**

#### Week 3 — Projects Service + Basic UI Shell

| Day | Tasks |
|-----|-------|
| **Mon** | Scaffold `services/projects-service` (.NET 9) |
| **Mon** | Create migrations: projects, issues, sprints, labels tables |
| **Tue** | Build Projects API: CRUD + list with pagination |
| **Tue** | Build Issues API: CRUD + status transitions + assignee |
| **Wed** | Scaffold `apps/web` — `npx create-next-app@latest` (TypeScript, Tailwind, App Router) |
| **Wed** | Install: shadcn/ui, Zustand, TanStack Query, Socket.io-client, Lucide, Framer Motion |
| **Wed** | Set up global CSS variables (colors, fonts — Geist), dark sidebar theme |
| **Thu** | Build layout: `app/(dashboard)/layout.tsx` — sidebar + topbar shell |
| **Thu** | Build sidebar: workspace switcher, nav items (Projects, Chat, Docs, Ops, Observe, Code) |
| **Thu** | Style sidebar EXACTLY like Slack — dark bg, channels list, presence indicators |
| **Fri** | Build command palette: `Cmd+K` opens palette, search issues/projects/channels |
| **Fri** | Build auth pages: login, signup connecting to Cognito |

#### Week 4 — Projects UI Complete
| Day | Tasks |
|-----|-------|
| **Mon** | Projects list page: grid of project cards, create project modal |
| **Mon** | Project detail page: sidebar with issues grouped by status (Kanban columns) |
| **Tue** | Issue detail panel (side sheet): full issue view, description editor (TipTap basic) |
| **Tue** | Status transitions: drag issue card to different column (dnd-kit) |
| **Wed** | Issue filters: status, assignee, label, priority filter bar |
| **Wed** | Keyboard shortcuts: `C` create issue, `E` edit, `Esc` close panel |
| **Thu** | Assignee picker, label picker, priority picker (popover dropdowns) |
| **Thu** | Sprint management: create sprint, add issues to sprint, start/close sprint |
| **Fri** | Activity feed on issues: comments, status changes, assignment changes |
| **Fri** | Optimistic updates: issue status changes are instant (TanStack Query) |

#### Week 5 — Sprints + Roadmap + Polish
| Day | Tasks |
|-----|-------|
| **Mon** | Sprint board view: Kanban per sprint with velocity tracking |
| **Mon** | List view: sortable table using TanStack Table |
| **Tue** | Roadmap view: Gantt-style using custom SVG or react-gantt-chart |
| **Tue** | My Issues view: issues assigned to current user |
| **Wed** | Sub-tasks: create child issues, display as nested list |
| **Wed** | Issue link types: "blocks", "is blocked by", "related to" |
| **Thu** | Real-time updates: Socket.io emits when issue updated → other users see instantly |
| **Thu** | @mention in issue descriptions |
| **Fri** | Write Playwright e2e tests for critical flows |
| **Fri** | Performance audit: all interactions under 100ms response feel |

**Acceptance criteria:** Full project management workflow functional. Create project → create sprint → create issues → assign → move through statuses → close sprint. Real-time updates visible in two browser tabs.

---

### PHASE 2: Chat/Messaging Module (Weeks 6-8)

**GOAL: Slack-quality real-time messaging — the stickiest feature**

#### Week 6 — Messaging Service + Backend
| Day | Tasks |
|-----|-------|
| **Mon** | Scaffold `services/messaging-service` (Node.js + Fastify + TypeScript) |
| **Mon** | Create migrations: channels, messages, threads, reactions, dm_conversations tables |
| **Mon** | Set up BullMQ with Redis for message processing queue |
| **Tue** | Build Channels API: create, list, join, leave, archive |
| **Tue** | Build Messages API: send, edit, delete, thread reply |
| **Wed** | Set up Socket.io server with namespace per organization |
| **Wed** | Socket events: `message:new`, `message:updated`, `message:deleted`, `user:typing`, `user:presence` |
| **Thu** | `api-gateway` service: scaffold Node.js + Fastify, proxy routes to backend services |
| **Thu** | `api-gateway`: Socket.io client relay (single WS connection for all services) |
| **Fri** | Message reactions API: add/remove emoji reactions |
| **Fri** | File attachments: generate S3 pre-signed upload URL → store attachment metadata |

#### Week 7 — Chat UI (Slack clone quality)
| Day | Tasks |
|-----|-------|
| **Mon** | Channel list sidebar: icons, unread counts, bold for unread, muted channels |
| **Mon** | DM list: avatars, presence dot (green/gray), unread count badge |
| **Tue** | Message view: virtualized message list (handle 10K+ messages smoothly) |
| **Tue** | Message bubbles: avatar, name, timestamp, content, hover actions (react, thread, edit, delete) |
| **Wed** | TipTap message editor: bold, italic, code, code block, emoji picker, @mention, #channel mention, file upload |
| **Wed** | Typing indicator: "Preet is typing..." appears in 2s, auto-disappears |
| **Thu** | Thread panel (slide-in from right): reply to message, show thread count |
| **Thu** | Emoji reaction picker: floating emoji grid on hover over message |
| **Fri** | @mention notifications: badge on user name, highlight message |
| **Fri** | Message search: full-text search within workspace |

#### Week 8 — System Channels + MVP CHECKPOINT
| Day | Tasks |
|-----|-------|
| **Mon** | System channels: `#alerts`, `#deployments`, `#inventory` auto-created for each org |
| **Mon** | EventBridge → messaging-service → auto-post AI message to #alerts channel |
| **Tue** | Rich embed cards in chat: deployment cards (status, service, author), order cards |
| **Tue** | AI bot channel (`@Vyne`): `/status`, `/analyze`, `/help` slash commands |
| **Wed** | Notification service: email notification for @mentions when user is offline |
| **Wed** | Read receipts: mark channel as read when viewed |
| **Thu** | **MVP REVIEW SESSION**: demo Projects + Chat working end-to-end |
| **Thu** | Deploy MVP to staging environment |
| **Fri** | Recruit 5-10 beta users from build-in-public audience |
| **Fri** | Start posting about Vyne on Twitter/X #BuildInPublic |

**Acceptance criteria:** Create channels, send messages, reply in threads, react with emoji, upload files, receive real-time messages, get @mention notifications. System channels receive automated messages from infrastructure events.

---

### PHASE 3: Docs Module (Weeks 9-10)

**GOAL: Notion-quality block editor integrated with Projects**

#### Week 9 — Docs Service + Editor Core
| Day | Tasks |
|-----|-------|
| **Mon** | Add docs tables to projects-service migrations: documents, blocks, document_versions |
| **Mon** | Build Documents API: CRUD, nested pages, share settings |
| **Tue** | TipTap editor setup: StarterKit + all extensions |
| **Tue** | Block types: paragraph, heading (H1-H3), bulleted list, numbered list, checklist, code block, quote |
| **Wed** | Advanced blocks: image upload (S3), file attachment, embed (YouTube, Figma) |
| **Wed** | Table block: TipTap Table extension |
| **Thu** | Slash commands in editor: type `/` → block picker menu |
| **Thu** | Real-time collaborative editing: Yjs + y-websocket (CRDT for conflict resolution) |
| **Fri** | Document sidebar: page tree, nested pages, drag to reorder |
| **Fri** | Wiki structure: spaces → sections → pages |

#### Week 10 — Docs Integration + AI Features
| Day | Tasks |
|-----|-------|
| **Mon** | Link issues to documents: `@issue-123` inline embed in docs |
| **Mon** | Link docs to channels: pin documents in channel |
| **Tue** | AI doc generation: `/ai write meeting notes for sprint X` |
| **Tue** | Document search: full-text + semantic search across all docs |
| **Wed** | Document version history: see and restore previous versions |
| **Wed** | Export: PDF export via browser print, Markdown export |
| **Thu** | Templates: Sprint retrospective, Product spec, Incident report templates |
| **Thu** | Embed docs in chat messages as rich cards |
| **Fri** | Write tests, fix bugs, polish editor UX |

---

### PHASE 4: AI Service (Weeks 11-13)

**GOAL: AI that understands BOTH business AND infrastructure context**

#### Week 11 — RAG Pipeline Setup
| Day | Tasks |
|-----|-------|
| **Mon** | Scaffold `services/ai-service` (Python + FastAPI) |
| **Mon** | AWS Bedrock setup: IAM role, enable Claude 3.5 Sonnet + Titan Embeddings v2 |
| **Tue** | RAG ingestion pipeline: ingest all issues, messages, documents for each org |
| **Tue** | pgvector HNSW index setup, test similarity search accuracy |
| **Wed** | Hybrid search: combine pgvector cosine similarity + PostgreSQL tsvector BM25 |
| **Wed** | Reciprocal Rank Fusion (RRF) to merge results |
| **Thu** | Build `/search` endpoint: query → hybrid retrieval → Bedrock reranking → return top 10 |
| **Thu** | Integrate search into command palette (Cmd+K shows AI-powered results) |
| **Fri** | Test: "find all issues related to payment processing" → returns relevant issues |

#### Week 12 — LangGraph Agents
| Day | Tasks |
|-----|-------|
| **Mon** | Implement LangGraph orchestrator with tool definitions |
| **Mon** | IncidentAgent: tools, prompts, RAG retrieval, output formatting |
| **Tue** | FinanceAgent: revenue impact calculation, order analysis |
| **Tue** | OpsAgent: inventory recommendations, supplier queries |
| **Wed** | InfraAgent: AWS cost queries, ECS metrics analysis |
| **Wed** | Agent endpoints: `POST /agents/query`, `POST /agents/analyze-incident` |
| **Thu** | Connect agents to EventBridge: `deployment_failed` → IncidentAgent auto-runs |
| **Thu** | Agent output → rich message in #alerts channel with cross-domain correlation |
| **Fri** | AI bot in chat: `@Vyne what's the status of order #1234?` → FinanceAgent responds |

#### Week 13 — AI Polish + Advanced Features
| Day | Tasks |
|-----|-------|
| **Mon** | Anomaly detection: scikit-learn isolation forest on time-series metrics |
| **Mon** | Demand forecasting: Prophet model on order history → inventory predictions |
| **Tue** | AI-generated issue summaries: weekly sprint report auto-posted to channel |
| **Tue** | Smart notifications: AI decides which alerts are worth waking you up for |
| **Wed** | AI in issue editor: "Improve this description" button |
| **Wed** | AI sprint planning: "Create a sprint from our backlog" → auto-prioritized issues |
| **Thu** | Model monitoring: track Bedrock token usage, cost per tenant |
| **Fri** | Test all AI features, optimize prompts, measure response latency |

---

### PHASE 5: ERP/MRP Module (Weeks 14-15)

**GOAL: Business operations — inventory, orders, manufacturing — Slack UI style**

#### Week 14 — Inventory + Orders
| Day | Tasks |
|-----|-------|
| **Mon** | Scaffold `services/erp-service` (.NET 9) |
| **Mon** | Migrations: products, inventory_levels, warehouses, stock_movements |
| **Tue** | Products API: CRUD, variants, categories, barcodes |
| **Tue** | Inventory API: stock levels per location, stock movement recording |
| **Wed** | Inventory UI: product catalog (card grid), stock level table |
| **Wed** | Low stock alert: when qty < reorder_point → EventBridge → #inventory channel message |
| **Thu** | Orders API: full lifecycle CRUD + state machine (draft→confirmed→processing→shipped) |
| **Thu** | Orders UI: list with filters, detail view with line items |
| **Fri** | Order ↔ Inventory integration: confirm order → reserve stock |

#### Week 15 — Manufacturing + Finance + Integrations
| Day | Tasks |
|-----|-------|
| **Mon** | BOM (Bill of Materials) API + UI: product → components list |
| **Mon** | Work Orders API: create, schedule, assign, track completion |
| **Tue** | Manufacturing dashboard: Kanban for work orders (planned → in progress → QC → done) |
| **Tue** | Basic Finance: invoicing (generate PDF invoice from order), accounts receivable list |
| **Wed** | Cross-domain: deployment failure → check affected orders → post to #alerts |
| **Wed** | Supplier management: supplier directory, lead times |
| **Thu** | Purchase Orders: create draft PO when stock below reorder point (AI-suggested) |
| **Thu** | Finance dashboard: revenue chart, outstanding invoices, cash flow estimate |
| **Fri** | MRP explosion: given work orders → calculate material requirements → compare to stock |

---

### PHASE 6: Observability + Production (Week 16)

**GOAL: Observe infrastructure in Vyne itself, production hardened**

#### Week 16 — Observability Service + Launch Prep
| Day | Tasks |
|-----|-------|
| **Mon** | Scaffold `services/observability-service` (Python) |
| **Mon** | Prometheus remote write endpoint → ingest metrics → TimescaleDB |
| **Tue** | Build observability UI: metric charts (Recharts), time range selector |
| **Tue** | Alert rules UI: create alert rule → fires to #alerts channel |
| **Wed** | Log viewer: CloudWatch Logs → parse → display in Vyne with filters |
| **Wed** | Service health dashboard: per-service uptime, error rate, latency |
| **Thu** | ECS Fargate auto-scaling: configure HPA targets per service |
| **Thu** | Run load tests (k6): 100 concurrent users, measure p99 latency |
| **Fri** | **LAUNCH**: GitHub repo public, ProductHunt submission, Show HN post |
| **Fri** | Set up customer feedback channel (Canny or simple Notion page) |

---

## 📝 RESUME BULLETS

```
• Architected and shipped Vyne, an AI-native unified SaaS platform (Python FastAPI +
  C# .NET 9 + TypeScript Next.js 15) spanning ERP, real-time messaging, project
  management, and observability — deployed on AWS ECS Fargate with Aurora PostgreSQL
  Serverless, eliminating $4,800/user/year in SaaS spend for early customers

• Designed a cross-domain AI intelligence layer using LangGraph multi-agent
  orchestration and a hybrid RAG pipeline (pgvector HNSW + BM25 + Bedrock Titan
  Embeddings) that correlates infrastructure events with ERP business impact,
  achieving sub-2s incident analysis with automated Slack-style channel notifications

• Built a production-grade multi-tenant architecture with PostgreSQL Row-Level Security,
  AWS Cognito JWT RBAC across 5 permission levels, External Secrets Operator, and OIDC-
  based GitHub Actions CI/CD deploying 8 polyglot microservices to ECS Fargate with
  canary rollouts via Argo Rollouts — zero static credentials in the pipeline

• Provisioned and managed complete AWS infrastructure (VPC, EKS, Aurora, ElastiCache,
  EventBridge, SQS, SNS, Bedrock, Cognito, ALB) via modular Terraform with S3+DynamoDB
  state management, reducing infrastructure provisioning time from days to 15 minutes
  and maintaining 99.9% uptime across dev/staging/prod environments

• Implemented real-time Slack-like messaging (Socket.io + Fastify, 10K+ msg/channel)
  with semantic search (pgvector cosine similarity + tsvector BM25 hybrid retrieval),
  offline-first mobile app (React Native + Expo + WatermelonDB), and AI bot with slash
  commands — achieving <100ms message delivery at 50 concurrent users in load tests
```

---

## 🎯 DAILY HABITS FOR SUCCESS

1. **Build-in-public daily**: Post one tweet per day about what you built
2. **2 hours minimum on core code** before any documentation or planning
3. **Ship something demo-able every Friday** — no exceptions
4. **Beta user interview every 2 weeks** — talk to real users
5. **AWS cost check every Monday** — prevent bill surprises
6. **Git commit every day** — no zero-commit days
7. **Postman/Thunder Client test every new endpoint before moving on**

---

*This document is the living specification for Vyne. Update it as decisions change.*
*Last updated: March 2026*
