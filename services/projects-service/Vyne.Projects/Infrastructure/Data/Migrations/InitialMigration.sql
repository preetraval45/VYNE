-- ============================================================
-- VYNE Projects Service — Initial Migration
-- projects, issues, sprints, comments, activities, labels
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── Projects ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    status      VARCHAR(50) NOT NULL DEFAULT 'active',
    lead_id     UUID,
    icon        VARCHAR(10),
    color       VARCHAR(20),
    identifier  VARCHAR(20) NOT NULL,
    settings    JSONB NOT NULL DEFAULT '{
        "defaultIssueStatus": "backlog",
        "defaultIssuePriority": "medium",
        "sprintsEnabled": true,
        "roadmapEnabled": false
    }'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (org_id, identifier)
);

CREATE INDEX idx_projects_org_id ON projects (org_id);
CREATE INDEX idx_projects_status ON projects (org_id, status);

-- ── Sprints ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sprints (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL,
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    start_date  DATE,
    end_date    DATE,
    status      VARCHAR(50) NOT NULL DEFAULT 'planned',
    goal        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sprints_project ON sprints (project_id);
CREATE INDEX idx_sprints_org     ON sprints (org_id);

-- ── Labels ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS labels (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id  UUID NOT NULL,
    name    VARCHAR(100) NOT NULL,
    color   VARCHAR(20) NOT NULL DEFAULT '#6C47FF',

    UNIQUE (org_id, name)
);

CREATE INDEX idx_labels_org ON labels (org_id);

-- ── Issues ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS issues (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL,
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    identifier      VARCHAR(30) NOT NULL,       -- e.g. "PRJ-42"
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    status          VARCHAR(50) NOT NULL DEFAULT 'backlog',
    priority        VARCHAR(50) NOT NULL DEFAULT 'medium',
    assignee_id     UUID,
    reporter_id     UUID NOT NULL,
    sprint_id       UUID REFERENCES sprints(id) ON DELETE SET NULL,
    parent_issue_id UUID REFERENCES issues(id) ON DELETE SET NULL,
    due_date        DATE,
    estimate        INTEGER,                    -- story points
    position        DECIMAL(20,10) NOT NULL DEFAULT 1.0,
    embedding       VECTOR(1536),               -- pgvector for semantic search
    search_vector   TSVECTOR,                   -- full-text search
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    UNIQUE (org_id, identifier)
);

CREATE INDEX idx_issues_org        ON issues (org_id);
CREATE INDEX idx_issues_project    ON issues (project_id);
CREATE INDEX idx_issues_status     ON issues (project_id, status);
CREATE INDEX idx_issues_assignee   ON issues (assignee_id);
CREATE INDEX idx_issues_sprint     ON issues (sprint_id);
CREATE INDEX idx_issues_position   ON issues (project_id, position);
CREATE INDEX idx_issues_deleted    ON issues (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_issues_fts        ON issues USING GIN (search_vector);
CREATE INDEX idx_issues_embedding  ON issues USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Auto-update search_vector from title + description
CREATE OR REPLACE FUNCTION issues_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_issues_search_vector
    BEFORE INSERT OR UPDATE ON issues
    FOR EACH ROW EXECUTE FUNCTION issues_search_vector_update();

-- ── Issue Labels (M2M) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS issue_labels (
    issue_id  UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    label_id  UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,

    PRIMARY KEY (issue_id, label_id)
);

-- ── Issue Comments ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS issue_comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL,
    issue_id    UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_comments_issue ON issue_comments (issue_id);
CREATE INDEX idx_comments_org   ON issue_comments (org_id);

-- ── Issue Activity Log ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS issue_activities (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL,
    issue_id    UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL,
    type        VARCHAR(100) NOT NULL,
    from_value  TEXT,
    to_value    TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activities_issue ON issue_activities (issue_id);
CREATE INDEX idx_activities_org   ON issue_activities (org_id);

-- ── Documents (Docs module — added later) ────────────────────

CREATE TABLE IF NOT EXISTS documents (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id       UUID NOT NULL,
    parent_id    UUID REFERENCES documents(id) ON DELETE SET NULL,
    title        VARCHAR(500) NOT NULL DEFAULT 'Untitled',
    icon         VARCHAR(10),
    cover_url    VARCHAR(2048),
    content      JSONB,
    is_published BOOLEAN NOT NULL DEFAULT false,
    is_template  BOOLEAN NOT NULL DEFAULT false,
    created_by   UUID NOT NULL,
    updated_by   UUID NOT NULL,
    position     DECIMAL(20,10) NOT NULL DEFAULT 1.0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_org    ON documents (org_id);
CREATE INDEX idx_documents_parent ON documents (parent_id);

-- ── Issue counter per project (for identifier generation) ─────

CREATE TABLE IF NOT EXISTS project_issue_counters (
    project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    next_number INTEGER NOT NULL DEFAULT 1
);

-- ── Row-Level Security ────────────────────────────────────────

ALTER TABLE projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints          ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels           ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues           ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_labels     ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_comments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS projects_rls         ON projects;
DROP POLICY IF EXISTS sprints_rls          ON sprints;
DROP POLICY IF EXISTS labels_rls           ON labels;
DROP POLICY IF EXISTS issues_rls           ON issues;
DROP POLICY IF EXISTS comments_rls         ON issue_comments;
DROP POLICY IF EXISTS activities_rls       ON issue_activities;
DROP POLICY IF EXISTS documents_rls        ON documents;

CREATE POLICY projects_rls   ON projects         USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY sprints_rls    ON sprints          USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY labels_rls     ON labels           USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY issues_rls     ON issues           USING (org_id = current_setting('app.current_org_id', true)::uuid AND deleted_at IS NULL);
CREATE POLICY comments_rls   ON issue_comments   USING (org_id = current_setting('app.current_org_id', true)::uuid AND deleted_at IS NULL);
CREATE POLICY activities_rls ON issue_activities USING (org_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY documents_rls  ON documents        USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- ── Triggers ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_updated_at   BEFORE UPDATE ON projects         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_sprints_updated_at    BEFORE UPDATE ON sprints          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_issues_updated_at     BEFORE UPDATE ON issues           FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_comments_updated_at   BEFORE UPDATE ON issue_comments   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_documents_updated_at  BEFORE UPDATE ON documents        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
