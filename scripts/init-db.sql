-- ============================================================
-- VYNE — Database Initialization Script
-- Runs once when Postgres container starts (local dev)
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- TimescaleDB (installed separately in prod; skip in local if not available)
-- CREATE EXTENSION IF NOT EXISTS "timescaledb";

-- Create dev databases for each service (optional; all use vyne_dev in local)
-- CREATE DATABASE vyne_test;

GRANT ALL PRIVILEGES ON DATABASE vyne_dev TO vyne;

\echo 'Database initialization complete.'
