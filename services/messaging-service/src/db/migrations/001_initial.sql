-- ============================================================
-- VYNE Messaging Service — Initial Schema
-- Migration: 001_initial
-- ============================================================

-- Enable pgvector extension for semantic search embeddings
-- CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Channels ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS channels (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID         NOT NULL,
  name         VARCHAR(100) NOT NULL,
  description  TEXT,
  type         VARCHAR(20)  NOT NULL DEFAULT 'public', -- public|private|dm|system
  is_system    BOOLEAN      DEFAULT false,
  topic        TEXT,
  created_by   UUID         NOT NULL,
  archived_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(org_id, name)
);

-- ─── Channel Members ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS channel_members (
  channel_id               UUID        NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id                  UUID        NOT NULL,
  role                     VARCHAR(20) DEFAULT 'member',  -- owner|admin|member
  joined_at                TIMESTAMPTZ DEFAULT NOW(),
  last_read_at             TIMESTAMPTZ DEFAULT NOW(),
  notification_preference  VARCHAR(20) DEFAULT 'all',     -- all|mentions|none
  PRIMARY KEY (channel_id, user_id)
);

-- ─── Messages ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS messages (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID         NOT NULL,
  channel_id   UUID         NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id      UUID         NOT NULL,
  content      TEXT,
  content_rich JSONB,
  type         VARCHAR(20)  DEFAULT 'text',               -- text|system|ai_bot|rich_embed
  thread_id    UUID,
  reply_count  INT          DEFAULT 0,
  reactions    JSONB        DEFAULT '{}',
  attachments  JSONB        DEFAULT '[]',
  rich_embed   JSONB,
  is_edited    BOOLEAN      DEFAULT false,
  edited_at    TIMESTAMPTZ,
  deleted_at   TIMESTAMPTZ,
  -- embedding vector(1536),                             -- Uncomment once pgvector is enabled
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- ─── User Presence ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_presence (
  user_id      UUID        NOT NULL,
  org_id       UUID        NOT NULL,
  status       VARCHAR(20) DEFAULT 'offline',
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, org_id)
);

-- ─── DM Conversations ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dm_conversations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dm_participants (
  conversation_id UUID NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL,
  PRIMARY KEY (conversation_id, user_id)
);

-- ─── Message Bookmarks ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS message_bookmarks (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID        NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

-- Fast cursor-based pagination for message feeds
CREATE INDEX IF NOT EXISTS idx_messages_channel_created
  ON messages(channel_id, created_at DESC);

-- Thread reply lookup
CREATE INDEX IF NOT EXISTS idx_messages_thread
  ON messages(thread_id)
  WHERE thread_id IS NOT NULL;

-- Membership lookup by user (find all channels a user belongs to)
CREATE INDEX IF NOT EXISTS idx_channel_members_user
  ON channel_members(user_id);

-- Org-scoped channel listing
CREATE INDEX IF NOT EXISTS idx_channels_org
  ON channels(org_id);

-- Soft-delete filter (active messages only)
CREATE INDEX IF NOT EXISTS idx_messages_not_deleted
  ON messages(channel_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Full-text search on message content
CREATE INDEX IF NOT EXISTS idx_messages_fts
  ON messages USING GIN(to_tsvector('english', coalesce(content, '')));

-- Presence lookups per org
CREATE INDEX IF NOT EXISTS idx_user_presence_org
  ON user_presence(org_id);
