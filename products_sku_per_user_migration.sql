-- SKU uniqueness must be per merchant, not platform-wide.
--
-- products_sku_key was UNIQUE (sku) with no user_id, so the first account to use
-- a SKU claimed it for the whole platform and every other merchant got
-- "duplicate key value violates unique constraint products_sku_key" forever.
-- An ordinary SKU like TSHIRT-001 is exactly the collision a new merchant hits.
--
-- The old constraint made cross-account duplicates impossible, so the narrower
-- one cannot fail on existing data.

-- Blank SKUs would collide with each other under the new constraint. NULLs do
-- not: Postgres treats them as distinct, so products without a SKU stay allowed.
UPDATE products SET sku = NULL WHERE sku IS NOT NULL AND btrim(sku) = '';

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sku_key;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'products'::regclass AND conname = 'products_user_sku_key'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT products_user_sku_key UNIQUE (user_id, sku);
    END IF;
END $$;

SELECT conname, pg_get_constraintdef(oid) AS definition
  FROM pg_constraint
 WHERE conrelid = 'products'::regclass AND contype IN ('u', 'p')
 ORDER BY conname;
