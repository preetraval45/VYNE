#!/usr/bin/env bash
# ============================================================
# VYNE — Seed dev database with test org, users, and sample data
# Usage: bash scripts/seed.sh
# ============================================================

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

info() { echo -e "${GREEN}[seed]${NC} $*"; }
warn() { echo -e "${YELLOW}[seed]${NC} $*"; }

if [ -f ".env" ]; then
  export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

DATABASE_URL="${DATABASE_URL:-postgresql://vyne:vyne_dev_password@localhost:5432/vyne_dev}"

info "Seeding database: $DATABASE_URL"

psql "$DATABASE_URL" <<'EOF'

-- ── Seed Organization ─────────────────────────────────────────
INSERT INTO organizations (id, name, slug, plan, max_members, settings, created_at, updated_at)
VALUES (
  'org-00000000-0000-0000-0000-000000000001',
  'Acme Corp',
  'acme-corp',
  'pro',
  50,
  '{"defaultTimezone": "America/New_York", "fiscalYearStart": 1, "currency": "USD", "features": {"erp": true, "observability": true, "ai": true}}',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ── Seed Users ────────────────────────────────────────────────
INSERT INTO users (id, org_id, cognito_id, email, name, role, permissions, timezone, created_at, updated_at)
VALUES
  (
    'usr-00000000-0000-0000-0000-000000000001',
    'org-00000000-0000-0000-0000-000000000001',
    'cognito-owner-001',
    'owner@acme-corp.dev',
    'Alex Owner',
    'owner',
    ARRAY['*'],
    'America/New_York',
    NOW(), NOW()
  ),
  (
    'usr-00000000-0000-0000-0000-000000000002',
    'org-00000000-0000-0000-0000-000000000001',
    'cognito-admin-001',
    'admin@acme-corp.dev',
    'Sam Admin',
    'admin',
    ARRAY['projects:*', 'chat:*', 'docs:*', 'ops:read', 'observe:read'],
    'America/Chicago',
    NOW(), NOW()
  ),
  (
    'usr-00000000-0000-0000-0000-000000000003',
    'org-00000000-0000-0000-0000-000000000001',
    'cognito-member-001',
    'dev@acme-corp.dev',
    'Jordan Dev',
    'member',
    ARRAY['projects:read', 'projects:write', 'chat:*', 'docs:read', 'docs:write'],
    'America/Los_Angeles',
    NOW(), NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- ── Seed Projects ─────────────────────────────────────────────
INSERT INTO projects (id, org_id, name, description, status, lead_id, identifier, settings, created_at, updated_at)
VALUES
  (
    'prj-00000000-0000-0000-0000-000000000001',
    'org-00000000-0000-0000-0000-000000000001',
    'Platform Core',
    'Core infrastructure and backend services',
    'active',
    'usr-00000000-0000-0000-0000-000000000001',
    'CORE',
    '{"defaultIssueStatus": "backlog", "defaultIssuePriority": "medium", "sprintsEnabled": true, "roadmapEnabled": true}',
    NOW(), NOW()
  ),
  (
    'prj-00000000-0000-0000-0000-000000000002',
    'org-00000000-0000-0000-0000-000000000001',
    'Web App',
    'Next.js frontend application',
    'active',
    'usr-00000000-0000-0000-0000-000000000002',
    'WEB',
    '{"defaultIssueStatus": "backlog", "defaultIssuePriority": "medium", "sprintsEnabled": true, "roadmapEnabled": false}',
    NOW(), NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- ── Seed Labels ───────────────────────────────────────────────
INSERT INTO labels (id, org_id, name, color)
VALUES
  ('lbl-00000000-0000-0000-0000-000000000001', 'org-00000000-0000-0000-0000-000000000001', 'bug', '#EF4444'),
  ('lbl-00000000-0000-0000-0000-000000000002', 'org-00000000-0000-0000-0000-000000000001', 'feature', '#6C47FF'),
  ('lbl-00000000-0000-0000-0000-000000000003', 'org-00000000-0000-0000-0000-000000000001', 'improvement', '#3B82F6'),
  ('lbl-00000000-0000-0000-0000-000000000004', 'org-00000000-0000-0000-0000-000000000001', 'documentation', '#F59E0B'),
  ('lbl-00000000-0000-0000-0000-000000000005', 'org-00000000-0000-0000-0000-000000000001', 'security', '#EF4444')
ON CONFLICT (id) DO NOTHING;

-- ── Seed Issues ───────────────────────────────────────────────
INSERT INTO issues (id, org_id, project_id, identifier, title, description, status, priority, assignee_id, reporter_id, position, created_at, updated_at)
VALUES
  ('iss-001', 'org-00000000-0000-0000-0000-000000000001', 'prj-00000000-0000-0000-0000-000000000001',
   'CORE-1', 'Set up authentication with Cognito', 'Implement JWT auth flow with AWS Cognito', 'done', 'high',
   'usr-00000000-0000-0000-0000-000000000001', 'usr-00000000-0000-0000-0000-000000000001', 1.0, NOW(), NOW()),
  ('iss-002', 'org-00000000-0000-0000-0000-000000000001', 'prj-00000000-0000-0000-0000-000000000001',
   'CORE-2', 'Implement multi-tenant RLS in PostgreSQL', 'Row-level security for tenant isolation', 'in_progress', 'urgent',
   'usr-00000000-0000-0000-0000-000000000002', 'usr-00000000-0000-0000-0000-000000000001', 2.0, NOW(), NOW()),
  ('iss-003', 'org-00000000-0000-0000-0000-000000000001', 'prj-00000000-0000-0000-0000-000000000001',
   'CORE-3', 'Add OpenTelemetry tracing to all services', NULL, 'todo', 'medium',
   NULL, 'usr-00000000-0000-0000-0000-000000000001', 3.0, NOW(), NOW()),
  ('iss-004', 'org-00000000-0000-0000-0000-000000000001', 'prj-00000000-0000-0000-0000-000000000002',
   'WEB-1', 'Build Slack-like sidebar navigation', 'Dark sidebar with workspace switcher and channel list', 'in_progress', 'high',
   'usr-00000000-0000-0000-0000-000000000003', 'usr-00000000-0000-0000-0000-000000000002', 1.0, NOW(), NOW()),
  ('iss-005', 'org-00000000-0000-0000-0000-000000000001', 'prj-00000000-0000-0000-0000-000000000002',
   'WEB-2', 'Implement Kanban drag-and-drop for issues', 'Using dnd-kit with LexoRank ordering', 'todo', 'high',
   'usr-00000000-0000-0000-0000-000000000003', 'usr-00000000-0000-0000-0000-000000000002', 2.0, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ── Seed Channels ─────────────────────────────────────────────
INSERT INTO channels (id, org_id, name, description, type, is_system, created_by, created_at)
VALUES
  ('ch-00000000-0000-0000-0000-000000000001', 'org-00000000-0000-0000-0000-000000000001',
   'general', 'General discussion for Acme Corp', 'public', false,
   'usr-00000000-0000-0000-0000-000000000001', NOW()),
  ('ch-00000000-0000-0000-0000-000000000002', 'org-00000000-0000-0000-0000-000000000001',
   'alerts', 'System alerts and incidents', 'system', true,
   'usr-00000000-0000-0000-0000-000000000001', NOW()),
  ('ch-00000000-0000-0000-0000-000000000003', 'org-00000000-0000-0000-0000-000000000001',
   'deployments', 'Deployment notifications', 'system', true,
   'usr-00000000-0000-0000-0000-000000000001', NOW()),
  ('ch-00000000-0000-0000-0000-000000000004', 'org-00000000-0000-0000-0000-000000000001',
   'engineering', 'Engineering team discussion', 'public', false,
   'usr-00000000-0000-0000-0000-000000000001', NOW())
ON CONFLICT (id) DO NOTHING;

-- ── Seed Channel Members ──────────────────────────────────────
INSERT INTO channel_members (channel_id, user_id, role, joined_at)
VALUES
  ('ch-00000000-0000-0000-0000-000000000001', 'usr-00000000-0000-0000-0000-000000000001', 'owner', NOW()),
  ('ch-00000000-0000-0000-0000-000000000001', 'usr-00000000-0000-0000-0000-000000000002', 'member', NOW()),
  ('ch-00000000-0000-0000-0000-000000000001', 'usr-00000000-0000-0000-0000-000000000003', 'member', NOW()),
  ('ch-00000000-0000-0000-0000-000000000002', 'usr-00000000-0000-0000-0000-000000000001', 'owner', NOW()),
  ('ch-00000000-0000-0000-0000-000000000002', 'usr-00000000-0000-0000-0000-000000000002', 'member', NOW()),
  ('ch-00000000-0000-0000-0000-000000000002', 'usr-00000000-0000-0000-0000-000000000003', 'member', NOW()),
  ('ch-00000000-0000-0000-0000-000000000004', 'usr-00000000-0000-0000-0000-000000000001', 'owner', NOW()),
  ('ch-00000000-0000-0000-0000-000000000004', 'usr-00000000-0000-0000-0000-000000000003', 'member', NOW())
ON CONFLICT (channel_id, user_id) DO NOTHING;

-- ── Seed Products (ERP) ───────────────────────────────────────
INSERT INTO products (id, org_id, sku, name, description, category, unit_of_measure, cost_price, sale_price, reorder_point, reorder_quantity, is_active, created_at, updated_at)
VALUES
  ('prod-001', 'org-00000000-0000-0000-0000-000000000001', 'WIDGET-001', 'Standard Widget', 'Our flagship widget', 'Widgets', 'unit', 12.50, 29.99, 50, 200, true, NOW(), NOW()),
  ('prod-002', 'org-00000000-0000-0000-0000-000000000001', 'WIDGET-002', 'Premium Widget', 'Premium grade widget', 'Widgets', 'unit', 24.00, 59.99, 25, 100, true, NOW(), NOW()),
  ('prod-003', 'org-00000000-0000-0000-0000-000000000001', 'GADGET-001', 'Standard Gadget', 'Entry level gadget', 'Gadgets', 'unit', 35.00, 79.99, 30, 150, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

\echo 'Seed data inserted successfully.'

EOF

info "Database seeded successfully!"
info ""
info "Dev accounts:"
info "  owner@acme-corp.dev  (Owner)"
info "  admin@acme-corp.dev  (Admin)"
info "  dev@acme-corp.dev    (Member)"
