-- ============================================================
-- VYNE ERP Service — Manufacturing & Extended Modules Migration
-- bill_of_materials, bom_components, work_orders,
-- warehouses, warehouse_locations, inventory_levels,
-- chart_of_accounts, journal_entries, journal_lines,
-- customers
-- ============================================================

-- ── Bill of Materials ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bill_of_materials (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL,
    product_id  UUID NOT NULL,
    version     VARCHAR(50) NOT NULL DEFAULT '1.0',
    is_active   BOOLEAN NOT NULL DEFAULT true,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bom_org_id          ON bill_of_materials (org_id);
CREATE INDEX idx_bom_org_product     ON bill_of_materials (org_id, product_id);
CREATE INDEX idx_bom_org_active      ON bill_of_materials (org_id, is_active);

-- ── BOM Components ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bom_components (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_id               UUID NOT NULL REFERENCES bill_of_materials(id) ON DELETE CASCADE,
    component_product_id UUID NOT NULL,
    quantity             DECIMAL(18,4) NOT NULL CHECK (quantity > 0),
    unit_of_measure      VARCHAR(50) NOT NULL DEFAULT 'pcs',
    notes                TEXT
);

CREATE INDEX idx_bom_comp_bom_id   ON bom_components (bom_id);
CREATE INDEX idx_bom_comp_product  ON bom_components (component_product_id);

-- ── Work Orders ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS work_orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL,
    work_order_number   VARCHAR(100) NOT NULL,
    product_id          UUID NOT NULL,
    bom_id              UUID NOT NULL REFERENCES bill_of_materials(id),
    quantity_to_produce DECIMAL(18,4) NOT NULL CHECK (quantity_to_produce > 0),
    quantity_produced   DECIMAL(18,4) NOT NULL DEFAULT 0,
    status              VARCHAR(50) NOT NULL DEFAULT 'Draft',
    scheduled_start     TIMESTAMPTZ,
    scheduled_end       TIMESTAMPTZ,
    actual_start        TIMESTAMPTZ,
    actual_end          TIMESTAMPTZ,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (org_id, work_order_number)
);

CREATE INDEX idx_wo_org_id       ON work_orders (org_id);
CREATE INDEX idx_wo_org_status   ON work_orders (org_id, status);
CREATE INDEX idx_wo_org_product  ON work_orders (org_id, product_id);
CREATE INDEX idx_wo_bom          ON work_orders (bom_id);

-- ── Warehouses ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS warehouses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL,
    name        VARCHAR(255) NOT NULL,
    address     TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_warehouses_org_id     ON warehouses (org_id);
CREATE INDEX idx_warehouses_org_active ON warehouses (org_id, is_active);

-- ── Warehouse Locations (bins) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS warehouse_locations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,   -- e.g. "A-01-01"
    barcode      VARCHAR(200),
    is_active    BOOLEAN NOT NULL DEFAULT true,

    UNIQUE (warehouse_id, name)
);

CREATE INDEX idx_wh_loc_warehouse  ON warehouse_locations (warehouse_id);
CREATE UNIQUE INDEX idx_wh_loc_barcode ON warehouse_locations (barcode)
    WHERE barcode IS NOT NULL;

-- ── Inventory Levels (per product per location) ────────────────

CREATE TABLE IF NOT EXISTS inventory_levels (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id            UUID NOT NULL,
    product_id        UUID NOT NULL,
    location_id       UUID NOT NULL REFERENCES warehouse_locations(id),
    quantity_on_hand  DECIMAL(18,4) NOT NULL DEFAULT 0,
    quantity_reserved DECIMAL(18,4) NOT NULL DEFAULT 0,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (product_id, location_id)
);

CREATE INDEX idx_inv_lvl_org_id     ON inventory_levels (org_id);
CREATE INDEX idx_inv_lvl_product    ON inventory_levels (product_id);
CREATE INDEX idx_inv_lvl_location   ON inventory_levels (location_id);
CREATE INDEX idx_inv_lvl_org_prod   ON inventory_levels (org_id, product_id);

-- ── Chart of Accounts ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL,
    code        VARCHAR(20) NOT NULL,     -- e.g. "1000"
    name        VARCHAR(255) NOT NULL,    -- e.g. "Cash"
    type        VARCHAR(50) NOT NULL,     -- Asset | Liability | Equity | Revenue | Expense
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (org_id, code)
);

CREATE INDEX idx_coa_org_id    ON chart_of_accounts (org_id);
CREATE INDEX idx_coa_org_type  ON chart_of_accounts (org_id, type);
CREATE INDEX idx_coa_org_active ON chart_of_accounts (org_id, is_active);

-- ── Journal Entries ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS journal_entries (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id       UUID NOT NULL,
    entry_number VARCHAR(100) NOT NULL,
    entry_date   DATE NOT NULL,
    description  TEXT NOT NULL,
    reference    VARCHAR(200),     -- invoice/order number
    is_posted    BOOLEAN NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (org_id, entry_number)
);

CREATE INDEX idx_je_org_id      ON journal_entries (org_id);
CREATE INDEX idx_je_org_date    ON journal_entries (org_id, entry_date DESC);
CREATE INDEX idx_je_org_posted  ON journal_entries (org_id, is_posted);
CREATE INDEX idx_je_reference   ON journal_entries (org_id, reference)
    WHERE reference IS NOT NULL;

-- ── Journal Lines ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS journal_lines (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id       UUID NOT NULL REFERENCES chart_of_accounts(id),
    debit            DECIMAL(18,4) NOT NULL DEFAULT 0 CHECK (debit >= 0),
    credit           DECIMAL(18,4) NOT NULL DEFAULT 0 CHECK (credit >= 0),
    memo             TEXT,

    CHECK (debit > 0 OR credit > 0)
);

CREATE INDEX idx_jl_entry    ON journal_lines (journal_entry_id);
CREATE INDEX idx_jl_account  ON journal_lines (account_id);

-- ── Customers (CRM) ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS customers (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id        UUID NOT NULL,
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255),
    phone         VARCHAR(50),
    company       VARCHAR(255),
    status        VARCHAR(50) NOT NULL DEFAULT 'Lead',
    total_revenue DECIMAL(18,4),
    notes         TEXT,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_org_id     ON customers (org_id);
CREATE INDEX idx_customers_org_status ON customers (org_id, status);
CREATE INDEX idx_customers_org_active ON customers (org_id, is_active);
CREATE INDEX idx_customers_email      ON customers (email)
    WHERE email IS NOT NULL;

-- ── Row-Level Security ─────────────────────────────────────────

ALTER TABLE bill_of_materials  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_components     ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_levels   ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines      ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers          ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bill_of_materials_rls   ON bill_of_materials;
DROP POLICY IF EXISTS bom_components_rls      ON bom_components;
DROP POLICY IF EXISTS work_orders_rls         ON work_orders;
DROP POLICY IF EXISTS warehouses_rls          ON warehouses;
DROP POLICY IF EXISTS warehouse_locations_rls ON warehouse_locations;
DROP POLICY IF EXISTS inventory_levels_rls    ON inventory_levels;
DROP POLICY IF EXISTS chart_of_accounts_rls   ON chart_of_accounts;
DROP POLICY IF EXISTS journal_entries_rls     ON journal_entries;
DROP POLICY IF EXISTS journal_lines_rls       ON journal_lines;
DROP POLICY IF EXISTS customers_rls           ON customers;

CREATE POLICY bill_of_materials_rls ON bill_of_materials
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- bom_components inherit org scope via FK to bill_of_materials
CREATE POLICY bom_components_rls ON bom_components
    USING (
        bom_id IN (
            SELECT id FROM bill_of_materials
            WHERE org_id = current_setting('app.current_org_id', true)::uuid
        )
    );

CREATE POLICY work_orders_rls ON work_orders
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY warehouses_rls ON warehouses
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- warehouse_locations inherit org scope via FK to warehouses
CREATE POLICY warehouse_locations_rls ON warehouse_locations
    USING (
        warehouse_id IN (
            SELECT id FROM warehouses
            WHERE org_id = current_setting('app.current_org_id', true)::uuid
        )
    );

CREATE POLICY inventory_levels_rls ON inventory_levels
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY chart_of_accounts_rls ON chart_of_accounts
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY journal_entries_rls ON journal_entries
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- journal_lines inherit org scope via FK to journal_entries
CREATE POLICY journal_lines_rls ON journal_lines
    USING (
        journal_entry_id IN (
            SELECT id FROM journal_entries
            WHERE org_id = current_setting('app.current_org_id', true)::uuid
        )
    );

CREATE POLICY customers_rls ON customers
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- ── Auto-update updated_at triggers ───────────────────────────
-- (Reuses the update_updated_at_column() function from InitialMigration.sql)

CREATE TRIGGER trg_work_orders_updated_at
    BEFORE UPDATE ON work_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_inventory_levels_updated_at
    BEFORE UPDATE ON inventory_levels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
