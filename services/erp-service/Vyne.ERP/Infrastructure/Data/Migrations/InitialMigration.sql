-- ============================================================
-- VYNE ERP Service — Initial Migration
-- products, suppliers, orders, order_lines
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Suppliers ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS suppliers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(50),
    address         TEXT,
    website         VARCHAR(2048),
    contact_person  VARCHAR(255),
    notes           TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppliers_org_id     ON suppliers (org_id);
CREATE INDEX idx_suppliers_org_active ON suppliers (org_id, is_active);

-- ── Products ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS products (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id           UUID NOT NULL,
    sku              VARCHAR(100) NOT NULL,
    name             VARCHAR(255) NOT NULL,
    description      TEXT,
    type             VARCHAR(50) NOT NULL DEFAULT 'Physical',
    cost_price       DECIMAL(18,4) NOT NULL DEFAULT 0,
    sale_price       DECIMAL(18,4) NOT NULL DEFAULT 0,
    stock_quantity   INTEGER NOT NULL DEFAULT 0,
    reorder_point    INTEGER NOT NULL DEFAULT 0,
    reorder_quantity INTEGER NOT NULL DEFAULT 10,
    supplier_id      VARCHAR(100),
    category         VARCHAR(100),
    image_url        VARCHAR(2048),
    is_active        BOOLEAN NOT NULL DEFAULT true,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (org_id, sku)
);

CREATE INDEX idx_products_org_id     ON products (org_id);
CREATE INDEX idx_products_org_active ON products (org_id, is_active);
CREATE INDEX idx_products_org_cat    ON products (org_id, category);
CREATE INDEX idx_products_low_stock  ON products (org_id, stock_quantity, reorder_point)
    WHERE is_active = true;

-- ── Orders ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL,
    order_number        VARCHAR(100) NOT NULL,
    type                VARCHAR(50) NOT NULL,          -- Sale | Purchase
    status              VARCHAR(50) NOT NULL DEFAULT 'Draft',
    customer_id         UUID,
    supplier_id         UUID,
    subtotal            DECIMAL(18,4) NOT NULL DEFAULT 0,
    tax_amount          DECIMAL(18,4) NOT NULL DEFAULT 0,
    total_amount        DECIMAL(18,4) NOT NULL DEFAULT 0,
    notes               TEXT,
    cancellation_reason TEXT,
    shipped_at          TIMESTAMPTZ,
    delivered_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (org_id, order_number)
);

CREATE INDEX idx_orders_org_id     ON orders (org_id);
CREATE INDEX idx_orders_org_status ON orders (org_id, status);
CREATE INDEX idx_orders_org_type   ON orders (org_id, type);
CREATE INDEX idx_orders_created    ON orders (org_id, created_at DESC);
CREATE INDEX idx_orders_customer   ON orders (customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_orders_supplier   ON orders (supplier_id) WHERE supplier_id IS NOT NULL;

-- ── Order Lines ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS order_lines (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id   UUID NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_sku  VARCHAR(100),
    quantity     INTEGER NOT NULL CHECK (quantity > 0),
    unit_price   DECIMAL(18,4) NOT NULL
);

CREATE INDEX idx_order_lines_order   ON order_lines (order_id);
CREATE INDEX idx_order_lines_product ON order_lines (product_id);

-- ── Row-Level Security ─────────────────────────────────────────

ALTER TABLE suppliers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS suppliers_rls   ON suppliers;
DROP POLICY IF EXISTS products_rls    ON products;
DROP POLICY IF EXISTS orders_rls      ON orders;
DROP POLICY IF EXISTS order_lines_rls ON order_lines;

CREATE POLICY suppliers_rls ON suppliers
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY products_rls ON products
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY orders_rls ON orders
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- order_lines inherit security via FK to orders; no org_id column needed,
-- but we add a policy joining through the parent order.
CREATE POLICY order_lines_rls ON order_lines
    USING (
        order_id IN (
            SELECT id FROM orders
            WHERE org_id = current_setting('app.current_org_id', true)::uuid
        )
    );

-- ── Auto update_updated_at trigger ────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
