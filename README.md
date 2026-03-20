# Vyne — AI-Native Company Operating System

> **The Operating System for Modern Companies**
> Replace Slack + Jira + Notion + Datadog + Odoo with one AI-native platform.

---

## What is Vyne?

Vyne is a single platform that correlates business events with infrastructure events in real time. When a deployment fails and 47 orders get stuck, Vyne tells you: **"Deployment X caused $12,400 in revenue impact"** — no other tool does this.

```
┌─────────────────────────────────────────────────────────┐
│ [SIDEBAR - 240px]          [CONTENT AREA]               │
│                                                         │
│  Vyne                      ┌─────────────────────────┐  │
│                             │ #alerts                 │  │
│  Projects                   │                         │  │
│   └ Sprint Q4               │  [Deployment card]      │  │
│   └ Bug Tracker             │  api-service v2.4.1     │  │
│                             │  47 orders affected     │  │
│  Channels                   │  $12,400 revenue risk   │  │
│   └ #general                │                         │  │
│   └ #alerts         ●       │  [Rollback] [View Logs] │  │
│   └ #deployments            └─────────────────────────┘  │
│                                                         │
│  Ops / Observe / Code      [AI Sidebar]                 │
│                             Ask anything...             │
└─────────────────────────────────────────────────────────┘
```

---

## Architecture

| Layer | Technology |
|-------|-----------|
| **Web** | Next.js 15 (App Router) + TypeScript |
| **Mobile** | React Native + Expo SDK 52 |
| **API Gateway** | Node.js + Express + Socket.io |
| **Core / Auth** | C# .NET 9 Web API |
| **Projects** | C# .NET 9 Web API |
| **ERP** | C# .NET 9 Web API |
| **Messaging** | Node.js + Fastify |
| **AI** | Python 3.12 + FastAPI + LangGraph + AWS Bedrock |
| **Observability** | Python 3.12 + FastAPI + TimescaleDB |
| **Database** | PostgreSQL 17 + pgvector (Aurora Serverless v2) |
| **Cache** | Redis (ElastiCache Valkey) |
| **Auth** | AWS Cognito + Custom RBAC + PostgreSQL RLS |
| **Events** | AWS EventBridge + SQS (FIFO) |
| **AI Model** | Claude 3.5 Sonnet via AWS Bedrock |
| **Infra** | ECS Fargate + Terraform + GitHub Actions |

---

## Monorepo Structure

```
vyne/
├── apps/
│   ├── web/                # Next.js 15 web application
│   └── mobile/             # React Native + Expo app
├── services/
│   ├── api-gateway/        # Node.js API Gateway + WebSocket
│   ├── core-service/       # C# .NET 9 — Auth, Orgs, Users
│   ├── projects-service/   # C# .NET 9 — Issues, Sprints, Docs
│   ├── messaging-service/  # Node.js — Real-time chat
│   ├── ai-service/         # Python — RAG, LangGraph agents
│   ├── erp-service/        # C# .NET 9 — Inventory, Orders, MRP
│   ├── observability-service/ # Python — Metrics, Logs, Alerts
│   └── notification-service/  # Node.js — Push, Email, In-app
├── packages/
│   ├── shared-types/       # TypeScript types (all services)
│   └── shared-config/      # ESLint, TypeScript, Prettier configs
├── infrastructure/
│   └── terraform/          # Complete AWS infrastructure
├── scripts/                # Dev setup, migrations, seeding
└── docker-compose.yml      # Local dev environment
```

---

## Quick Start

### Prerequisites

- **Node.js** >= 22
- **pnpm** >= 9 (`npm install -g pnpm`)
- **Docker** + Docker Compose v2
- **.NET 9 SDK** (for C# services)
- **Python 3.12** (for AI/observability services)

### 1. Clone and Setup

```bash
git clone https://github.com/your-org/vyne.git
cd vyne
bash scripts/setup.sh
```

This will:
- Install all Node.js dependencies
- Copy `.env.example` to `.env`
- Start Docker (Postgres, Redis, LocalStack)
- Run database migrations
- Seed with dev data

### 2. Start Development

```bash
# Start all services with hot reload
pnpm dev

# Or start individual services
pnpm --filter @vyne/web dev         # Next.js -- http://localhost:3000
pnpm --filter api-gateway dev       # API Gateway -- http://localhost:4000
```

### 3. Available Dev URLs

| Service | URL |
|---------|-----|
| Web App | http://localhost:3000 |
| API Gateway | http://localhost:4000 |
| Core Service | http://localhost:5001 |
| Projects Service | http://localhost:5002 |
| Messaging Service | http://localhost:5003 |
| AI Service | http://localhost:5004 |
| ERP Service | http://localhost:5005 |
| Observability | http://localhost:5006 |
| PostgreSQL | postgresql://vyne:vyne_dev_password@localhost:5432/vyne_dev |
| Redis | redis://localhost:6379 |
| LocalStack (AWS) | http://localhost:4566 |

### 4. Dev Accounts (after seeding)

| Email | Role |
|-------|------|
| owner@acme-corp.dev | Owner |
| admin@acme-corp.dev | Admin |
| dev@acme-corp.dev | Member |

---

## Development Commands

```bash
pnpm build              # Build all packages
pnpm dev                # Start all in dev mode (hot reload)
pnpm lint               # Lint all packages
pnpm typecheck          # Type-check all packages
pnpm test               # Run all tests

pnpm db:migrate         # Run all pending migrations
pnpm db:seed            # Re-seed dev database

pnpm docker:up          # Start Docker infrastructure
pnpm docker:down        # Stop Docker infrastructure
pnpm docker:logs        # Tail Docker logs
```

---

## Phase Roadmap

| Phase | Description | Status |
|-------|-------------|--------|
| **P0** | Foundation -- Monorepo, Terraform, Core Auth | In Progress |
| **P1** | Projects Module -- Issues, Kanban, Sprints | Planned |
| **P2** | Chat Module -- Real-time messaging, Threads | Planned |
| **P3** | Docs Module -- Block editor, Collaboration | Planned |
| **P4** | AI Module -- RAG, LangGraph agents | Planned |
| **P5** | ERP Module -- Inventory, Orders, MRP | Planned |
| **P6** | Observability -- Metrics, Logs, Alerts | Planned |
| **P7** | Mobile App -- iOS + Android | Planned |

---

## Design System

- **Font**: Geist (Vercel) -- clean, modern, technical
- **Sidebar**: `#1C1C2E` dark navy
- **Accent**: `#6C47FF` Vyne purple
- **Inspiration**: Linear's precision + Slack's familiarity

---

## Infrastructure

All infrastructure is managed with Terraform and deploys to AWS:
- **Compute**: ECS Fargate (no servers to manage)
- **Database**: Aurora PostgreSQL Serverless v2 (scales to zero)
- **Cache**: ElastiCache Valkey (Redis-compatible)
- **AI**: AWS Bedrock (Claude 3.5 Sonnet + Titan Embeddings)
- **Auth**: AWS Cognito
- **Events**: EventBridge + SQS FIFO
- **Storage**: S3
- **CDN**: CloudFront
- **CI/CD**: GitHub Actions + ArgoCD + Argo Rollouts (canary)

---

## License

Private -- All rights reserved.
