-- Money columns must hold cents.
--
-- orders.total_amount is bigint in the live database, so every order with a
-- decimal total was rejected outright:
--   invalid input syntax for type bigint: "699.95"
-- The order was not stored at all — no partial row, no error surfaced to the
-- merchant — so whole-number orders synced and the rest vanished.
--
-- Widening bigint to numeric is lossless; existing values are preserved exactly.

DO $$
DECLARE
    col RECORD;
BEGIN
    FOR col IN
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND data_type IN ('bigint', 'integer')
          AND (table_name, column_name) IN (
                ('orders',      'total_amount'),
                ('order_items', 'price'),
                ('order_items', 'subtotal'),
                ('customers',   'total_spent'),
                ('products',    'price'),
                ('products',    'cost_price')
              )
    LOOP
        EXECUTE format(
            'ALTER TABLE %I ALTER COLUMN %I TYPE numeric(14,2) USING %I::numeric',
            col.table_name, col.column_name, col.column_name
        );
        RAISE NOTICE 'widened %.% to numeric(14,2)', col.table_name, col.column_name;
    END LOOP;
END $$;

-- A Shopify store can sell in any currency. Without this the dashboard labels a
-- USD order as PKR and adds it straight into a PKR total.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'PKR';
