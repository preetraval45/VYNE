#!/usr/bin/env bash
# ============================================================
# VYNE — One-command dev environment setup
# Usage: bash scripts/setup.sh
# ============================================================

set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

info()    { echo -e "${GREEN}[VYNE]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }
step()    { echo -e "\n${BOLD}━━━ $* ━━━${NC}"; }

# ── Prerequisites Check ───────────────────────────────────────

step "Checking prerequisites"

command -v node >/dev/null 2>&1 || error "Node.js >= 22 is required. Install from https://nodejs.org"
command -v pnpm >/dev/null 2>&1 || error "pnpm is required. Install with: npm install -g pnpm"
command -v docker >/dev/null 2>&1 || error "Docker is required. Install from https://docker.com"
command -v docker compose >/dev/null 2>&1 || error "Docker Compose v2 is required."

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
  error "Node.js >= 22 required. Current: $(node --version)"
fi

info "Node.js: $(node --version)"
info "pnpm: $(pnpm --version)"
info "Docker: $(docker --version)"

# ── Environment Variables ─────────────────────────────────────

step "Setting up environment variables"

if [ ! -f ".env" ]; then
  cp .env.example .env
  info "Created .env from .env.example"
  warn "Please review .env and fill in any required values before running services."
else
  info ".env already exists — skipping"
fi

# ── Install Dependencies ──────────────────────────────────────

step "Installing Node.js dependencies"
pnpm install --frozen-lockfile || pnpm install
info "Dependencies installed"

# ── Start Docker Infrastructure ───────────────────────────────

step "Starting Docker infrastructure (Postgres, Redis, LocalStack)"
docker compose up -d postgres redis localstack
info "Waiting for Postgres to be healthy..."

MAX_WAIT=60
WAITED=0
until docker compose exec -T postgres pg_isready -U vyne -d vyne_dev >/dev/null 2>&1; do
  if [ "$WAITED" -ge "$MAX_WAIT" ]; then
    error "Postgres did not become healthy within ${MAX_WAIT}s"
  fi
  sleep 2
  WAITED=$((WAITED + 2))
done

info "Postgres is ready"

until docker compose exec -T redis valkey-cli ping >/dev/null 2>&1; do
  sleep 1
done
info "Redis (Valkey) is ready"

# ── Database Migrations ───────────────────────────────────────

step "Running database migrations"
bash scripts/db-migrate.sh

# ── Seed Database ─────────────────────────────────────────────

step "Seeding database with dev data"
bash scripts/seed.sh

# ── Done ──────────────────────────────────────────────────────

step "Setup complete!"
echo ""
echo -e "  ${GREEN}Web App:${NC}        http://localhost:3000"
echo -e "  ${GREEN}API Gateway:${NC}    http://localhost:4000"
echo -e "  ${GREEN}Core Service:${NC}   http://localhost:5001"
echo -e "  ${GREEN}Postgres:${NC}       postgresql://vyne:vyne_dev_password@localhost:5432/vyne_dev"
echo -e "  ${GREEN}Redis:${NC}          redis://localhost:6379"
echo -e "  ${GREEN}LocalStack:${NC}     http://localhost:4566"
echo ""
echo -e "Run ${BOLD}pnpm dev${NC} to start all services in development mode."
echo -e "Run ${BOLD}docker compose up -d${NC} to start all Docker services."
echo ""
