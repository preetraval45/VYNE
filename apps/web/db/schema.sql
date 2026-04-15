-- VYNE Phase 1 initial schema
-- Run against Vercel Postgres (Neon) via the Vercel dashboard query editor
-- or: psql "$POSTGRES_URL_NON_POOLING" -f apps/web/db/schema.sql

create extension if not exists "pgcrypto";

-- Organizations
create table if not exists orgs (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text unique not null,
  plan          text not null default 'free',
  logo_url      text,
  settings      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Users
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid references orgs(id) on delete cascade,
  email         text unique not null,
  password_hash text not null,
  name          text not null,
  avatar_url    text,
  role          text not null default 'member',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists users_org_idx on users(org_id);

-- Projects
create table if not exists projects (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references orgs(id) on delete cascade,
  name          text not null,
  identifier    text not null,
  description   text,
  color         text not null default '#6366f1',
  icon          text,
  lead_id       uuid references users(id),
  created_at    timestamptz not null default now(),
  unique(org_id, identifier)
);

-- Issues
create table if not exists issues (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects(id) on delete cascade,
  title         text not null,
  description   text,
  status        text not null default 'todo',
  priority      text not null default 'medium',
  assignee_id   uuid references users(id),
  reporter_id   uuid references users(id),
  estimate      int,
  due_date      date,
  "order"       int default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists issues_project_idx on issues(project_id, status);

-- Comments
create table if not exists comments (
  id            uuid primary key default gen_random_uuid(),
  issue_id      uuid references issues(id) on delete cascade,
  author_id     uuid not null references users(id),
  content       text not null,
  created_at    timestamptz not null default now()
);

-- Docs
create table if not exists docs (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references orgs(id) on delete cascade,
  parent_id     uuid references docs(id) on delete cascade,
  title         text not null default 'Untitled',
  icon          text,
  cover_url     text,
  content       jsonb not null default '{}'::jsonb,
  author_id     uuid references users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists docs_org_idx on docs(org_id, parent_id);

-- Messaging: channels + messages
create table if not exists channels (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references orgs(id) on delete cascade,
  name          text not null,
  description   text,
  is_private    boolean not null default false,
  created_at    timestamptz not null default now()
);

create table if not exists messages (
  id                uuid primary key default gen_random_uuid(),
  channel_id        uuid references channels(id) on delete cascade,
  parent_message_id uuid references messages(id) on delete cascade,
  author_id         uuid not null references users(id),
  content           text not null,
  attachments       jsonb not null default '[]'::jsonb,
  reactions         jsonb not null default '[]'::jsonb,
  created_at        timestamptz not null default now()
);
create index if not exists messages_channel_idx on messages(channel_id, created_at desc);

-- Waitlist (landing page)
create table if not exists waitlist (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  source        text,
  created_at    timestamptz not null default now()
);

-- Audit log
create table if not exists audit_log (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid references orgs(id) on delete cascade,
  actor_id      uuid references users(id),
  action        text not null,
  target_type   text,
  target_id     text,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists audit_org_idx on audit_log(org_id, created_at desc);
