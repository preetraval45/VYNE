-- deployments table
CREATE TABLE IF NOT EXISTS deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  service_name VARCHAR(200) NOT NULL,
  version VARCHAR(100),
  environment VARCHAR(50) DEFAULT 'production',
  status VARCHAR(50) DEFAULT 'in_progress', -- in_progress|success|failed|rolled_back
  triggered_by VARCHAR(200),
  commit_sha VARCHAR(40),
  commit_message TEXT,
  branch VARCHAR(200),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- pull_requests table
CREATE TABLE IF NOT EXISTS pull_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  repo_name VARCHAR(200) NOT NULL,
  pr_number INT NOT NULL,
  title TEXT,
  state VARCHAR(20) DEFAULT 'open', -- open|closed|merged
  author VARCHAR(100),
  base_branch VARCHAR(200),
  head_branch VARCHAR(200),
  url TEXT,
  opened_at TIMESTAMPTZ,
  merged_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- github_events table (raw webhook log)
CREATE TABLE IF NOT EXISTS github_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- repositories table
CREATE TABLE IF NOT EXISTS repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  repo_name VARCHAR(200) NOT NULL,
  github_url TEXT,
  default_branch VARCHAR(200) DEFAULT 'main',
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, repo_name)
);

CREATE INDEX IF NOT EXISTS idx_deployments_org_started ON deployments(org_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_prs_org_state ON pull_requests(org_id, state, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_github_events_org ON github_events(org_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_repositories_org ON repositories(org_id);
