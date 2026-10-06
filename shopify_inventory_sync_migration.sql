-- Shopify inventory sync.
-- The products table is the source of truth for stock. Sales decrement it inside a
-- single transaction, then the new quantity is pushed out to Shopify.

-- ─── One stock column ──────────────────────────────────────────────────────────
-- The inventory feature wrote products.stock while the schema, the WooCommerce
-- sync and everything new use products.stock_quantity, so stock was split across
-- two columns that never agreed. stock_quantity becomes the single source of truth.
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'stock'
    ) THEN
        -- Prefer whichever column actually holds a value; stock wins when both do,
        -- because the inventory UI has been writing it.
        EXECUTE 'UPDATE products
                    SET stock_quantity = COALESCE(stock, stock_quantity, 0)
                  WHERE stock IS NOT NULL
                    AND COALESCE(stock, 0) <> COALESCE(stock_quantity, 0)';
    END IF;
END $$;

-- ─── Channel mapping ────────────────────────────────────────────────────────────
-- Shopify stock lives on inventory_levels, keyed by inventory_item_id + location_id,
-- not on the product. These ids are what make a push possible.
ALTER TABLE products ADD COLUMN IF NOT EXISTS shopify_variant_id BIGINT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS shopify_inventory_item_id BIGINT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS shopify_location_id BIGINT;

-- Quantity held back from channels so the last unit is less likely to oversell
-- during the seconds between our commit and Shopify accepting the push.
ALTER TABLE products ADD COLUMN IF NOT EXISTS safety_buffer INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS products_shopify_inventory_item_idx
    ON products (user_id, shopify_inventory_item_id);

-- ─── Idempotency ────────────────────────────────────────────────────────────────
-- Shopify retries webhooks. Without this a retry would decrement stock twice.
-- Partial index so existing Adjustment rows (which reuse `reference` as a note)
-- are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS inventory_movements_sale_ref_uniq
    ON inventory_movements (user_id, product_id, reference)
    WHERE movement_type = 'Sale';

-- ─── Atomic stock application ───────────────────────────────────────────────────
-- The whole body runs in one transaction. The UPDATE takes a row lock, so two
-- concurrent orders for the last unit serialize instead of both reading the same
-- starting quantity.
--
-- Stock is allowed to go negative: an oversell should be visible to the merchant
-- rather than silently clamped, and reconciliation reports it.
CREATE OR REPLACE FUNCTION apply_order_stock(
    p_user_id   uuid,
    p_items     jsonb,   -- [{"product_id": "<uuid>", "quantity": 2}, ...]
    p_reference text,
    p_reason    text DEFAULT 'Shopify order'
)
RETURNS TABLE (product_id uuid, new_stock integer, applied boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item          jsonb;
    v_product_id  uuid;
    v_qty         integer;
    v_new_stock   integer;
    v_exists      boolean;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (item->>'product_id')::uuid;
        v_qty        := COALESCE((item->>'quantity')::integer, 0);

        CONTINUE WHEN v_product_id IS NULL OR v_qty <= 0;

        SELECT EXISTS (
            SELECT 1 FROM inventory_movements m
            WHERE m.user_id = p_user_id
              AND m.product_id = v_product_id
              AND m.reference = p_reference
              AND m.movement_type = 'Sale'
        ) INTO v_exists;

        IF v_exists THEN
            SELECT p.stock_quantity INTO v_new_stock FROM products p WHERE p.id = v_product_id;
            RETURN QUERY SELECT v_product_id, v_new_stock, false;
            CONTINUE;
        END IF;

        UPDATE products p
           SET stock_quantity = COALESCE(p.stock_quantity, 0) - v_qty,
               updated_at = now()
         WHERE p.id = v_product_id
           AND p.user_id = p_user_id
        RETURNING p.stock_quantity INTO v_new_stock;

        CONTINUE WHEN v_new_stock IS NULL;

        INSERT INTO inventory_movements
            (user_id, product_id, movement_type, quantity, reason, reference)
        VALUES
            (p_user_id, v_product_id, 'Sale', -v_qty, p_reason, p_reference);

        RETURN QUERY SELECT v_product_id, v_new_stock, true;
    END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION apply_order_stock(uuid, jsonb, text, text) TO authenticated, service_role;
