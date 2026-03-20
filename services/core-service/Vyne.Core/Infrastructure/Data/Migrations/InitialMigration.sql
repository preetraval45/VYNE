-- ============================================================
-- VYNE Core Service — Initial Migration
-- Organizations, Users, RBAC with Row-Level Security
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── Organizations ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organizations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(255) NOT NULL,
    slug         VARCHAR(100) NOT NULL UNIQUE,
    logo_url     VARCHAR(2048),
    plan         VARCHAR(50) NOT NULL DEFAULT 'free',
    max_members  INTEGER NOT NULL DEFAULT 5,
    settings     JSONB NOT NULL DEFAULT '{
        "defaultTimezone": "UTC",
        "fiscalYearStart": 1,
        "currency": "USD",
        "features": {"erp": true, "observability": true, "ai": true}
    }'::jsonb,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations (slug);

-- ── Users ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    cognito_id   VARCHAR(256) NOT NULL UNIQUE,
    email        VARCHAR(320) NOT NULL,
    name         VARCHAR(255) NOT NULL,
    avatar_url   VARCHAR(2048),
    role         VARCHAR(50) NOT NULL DEFAULT 'member',
    permissions  TEXT[] NOT NULL DEFAULT '{}',
    timezone     VARCHAR(100) NOT NULL DEFAULT 'UTC',
    presence     VARCHAR(20) NOT NULL DEFAULT 'offline',
    last_seen_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (org_id, email)
);

CREATE INDEX idx_users_org_id    ON users (org_id);
CREATE INDEX idx_users_email     ON users (email);
CREATE INDEX idx_users_cognito   ON users (cognito_id);

-- ── RBAC Permissions Table ────────────────────────────────────

CREATE TABLE IF NOT EXISTS role_permissions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role       VARCHAR(50) NOT NULL,
    permission VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (org_id, role, permission)
);

CREATE INDEX idx_role_permissions_org ON role_permissions (org_id, role);

-- ── User Invitations ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_invitations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invited_by   UUID NOT NULL REFERENCES users(id),
    email        VARCHAR(320) NOT NULL,
    role         VARCHAR(50) NOT NULL DEFAULT 'member',
    token        VARCHAR(256) NOT NULL UNIQUE,
    accepted_at  TIMESTAMPTZ,
    expires_at   TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (org_id, email)
);

-- ── Row-Level Security ────────────────────────────────────────
-- PostgreSQL will enforce tenant isolation at the DB level.
-- The app sets the session variable app.current_org_id before queries.

-- Enable RLS on tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS orgs_tenant_isolation ON organizations;
DROP POLICY IF EXISTS users_tenant_isolation ON users;
DROP POLICY IF EXISTS role_perms_tenant_isolation ON role_permissions;
DROP POLICY IF EXISTS invitations_tenant_isolation ON user_invitations;

-- Organizations: a user can only see their own org
CREATE POLICY orgs_tenant_isolation ON organizations
    USING (id = current_setting('app.current_org_id', true)::uuid);

-- Users: a user can only see users in their org
CREATE POLICY users_tenant_isolation ON users
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Role permissions: scoped to org
CREATE POLICY role_perms_tenant_isolation ON role_permissions
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Invitations: scoped to org
CREATE POLICY invitations_tenant_isolation ON user_invitations
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Allow the app DB user to bypass RLS for migrations / admin operations
-- In production, create a separate 'vyne_admin' role for this
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

-- ── Auto-update updated_at trigger ───────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Seed default role permissions ────────────────────────────

-- Note: These are org-specific in practice. This is just a comment.
-- Default permissions are set in code (User.GetDefaultPermissions).
