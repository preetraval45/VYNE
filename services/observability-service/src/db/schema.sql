-- =============================================================================
-- VYNE Observability Service — TimescaleDB Schema
-- =============================================================================

-- ---------------------------------------------------------------------------
-- metric_events — high-write time-series metrics (hypertable)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metric_events (
    time         TIMESTAMPTZ      NOT NULL,
    org_id       UUID             NOT NULL,
    service_name VARCHAR(100),
    metric_name  VARCHAR(200)     NOT NULL,
    value        DOUBLE PRECISION NOT NULL,
    labels       JSONB            DEFAULT '{}'
);

-- Convert to hypertable partitioned by time (no-op if already exists)
SELECT create_hypertable('metric_events', 'time', if_not_exists => TRUE);

-- Composite index for efficient per-org metric queries
CREATE INDEX IF NOT EXISTS metric_events_org_name_time_idx
    ON metric_events (org_id, metric_name, time DESC);

-- ---------------------------------------------------------------------------
-- alert_rules — user-defined alerting conditions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alert_rules (
    id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id               UUID         NOT NULL,
    name                 VARCHAR(200) NOT NULL,
    -- condition shape: { metric, operator, threshold, window_minutes }
    condition            JSONB        NOT NULL,
    -- severity: info | warning | critical
    severity             VARCHAR(20)  NOT NULL DEFAULT 'warning',
    is_active            BOOLEAN      NOT NULL DEFAULT true,
    notification_channel VARCHAR(100),
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS alert_rules_org_idx ON alert_rules (org_id);

-- ---------------------------------------------------------------------------
-- alert_events — fired alert instances
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alert_events (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID        NOT NULL,
    rule_id     UUID        REFERENCES alert_rules (id) ON DELETE SET NULL,
    severity    VARCHAR(20),
    message     TEXT,
    metadata    JSONB       DEFAULT '{}',
    resolved_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS alert_events_org_resolved_idx
    ON alert_events (org_id, resolved_at NULLS FIRST, created_at DESC);

-- ---------------------------------------------------------------------------
-- log_entries — structured application logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS log_entries (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id       UUID,
    service_name VARCHAR(100) NOT NULL,
    level        VARCHAR(20)  NOT NULL DEFAULT 'info',
    message      TEXT         NOT NULL,
    metadata     JSONB        DEFAULT '{}',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS log_entries_service_level_time_idx
    ON log_entries (service_name, level, created_at DESC);

CREATE INDEX IF NOT EXISTS log_entries_created_at_idx
    ON log_entries (created_at DESC);
