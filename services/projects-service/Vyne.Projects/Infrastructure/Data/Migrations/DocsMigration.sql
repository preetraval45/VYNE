CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  parent_id UUID REFERENCES documents(id),
  title VARCHAR(500) NOT NULL DEFAULT 'Untitled',
  icon VARCHAR(10),
  cover_url TEXT,
  is_published BOOLEAN DEFAULT false,
  is_template BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  updated_by UUID,
  position DECIMAL(10,4) DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id),
  content JSONB NOT NULL DEFAULT '{}',
  version INT NOT NULL DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_org_parent ON documents(org_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_doc ON document_versions(document_id, version DESC);
