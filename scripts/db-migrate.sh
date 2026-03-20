#!/usr/bin/env bash
# ============================================================
# VYNE — Run all pending database migrations
# Usage: bash scripts/db-migrate.sh [--service <name>]
# ============================================================

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[migrate]${NC} $*"; }
warn()  { echo -e "${YELLOW}[migrate]${NC} $*"; }
error() { echo -e "${RED}[migrate]${NC} $*" >&2; exit 1; }

# Load env
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

DATABASE_URL="${DATABASE_URL:-postgresql://vyne:vyne_dev_password@localhost:5432/vyne_dev}"
SERVICE="${1:-all}"

run_dotnet_migration() {
  local service_dir="$1"
  local service_name="$2"

  if [ -d "$service_dir" ]; then
    info "Running .NET migrations for $service_name..."
    pushd "$service_dir" > /dev/null
    # Find the main project (not Tests)
    PROJECT=$(find . -name "*.csproj" | grep -v "Tests" | head -1)
    if [ -n "$PROJECT" ]; then
      dotnet ef database update \
        --project "$PROJECT" \
        --connection "$DATABASE_URL" \
        2>&1 | grep -E "(Applied|Already|Error|error)" || true
      info "$service_name migrations complete"
    else
      warn "No .csproj found in $service_dir — skipping"
    fi
    popd > /dev/null
  else
    warn "$service_dir not found — skipping $service_name migrations"
  fi
}

run_sql_migration() {
  local sql_file="$1"
  local description="$2"

  if [ -f "$sql_file" ]; then
    info "Running SQL migration: $description"
    psql "$DATABASE_URL" -f "$sql_file" 2>&1 | tail -5
    info "$description complete"
  fi
}

info "Starting migrations against: $DATABASE_URL"
info "Service: $SERVICE"

case "$SERVICE" in
  "all"|"core")
    run_dotnet_migration "services/core-service" "core-service"
    ;;&
  "all"|"projects")
    run_dotnet_migration "services/projects-service" "projects-service"
    ;;&
  "all"|"erp")
    run_dotnet_migration "services/erp-service" "erp-service"
    ;;&
  "all"|"messaging")
    # Node.js service uses raw SQL migrations
    if [ -d "services/messaging-service" ]; then
      info "Running messaging-service migrations..."
      for f in services/messaging-service/migrations/*.sql; do
        [ -f "$f" ] && psql "$DATABASE_URL" -f "$f" 2>&1 | tail -3
      done
      info "messaging-service migrations complete"
    fi
    ;;&
  "all"|"observability")
    if [ -d "services/observability-service" ]; then
      info "Running observability-service migrations..."
      for f in services/observability-service/migrations/*.sql; do
        [ -f "$f" ] && psql "$DATABASE_URL" -f "$f" 2>&1 | tail -3
      done
      info "observability-service migrations complete"
    fi
    ;;
esac

info "All migrations complete!"
