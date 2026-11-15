-- Removes the Shopify integration's stored state.
-- The App Store submission was abandoned; application code has been deleted.
--
-- READ BEFORE RUNNING. This drops columns and the credentials in them cannot be
-- recovered: re-enabling Shopify later would mean a fresh OAuth authorisation by
-- every merchant. Backup taken at zyro-frontend-backup-20261112-141000, and the
-- code is recoverable from git history.
--
-- Existing Shopify ORDERS are deliberately kept. They are real sales and real
-- revenue, and deleting them would silently change historical dashboard totals.

-- ─── Credentials and channel mapping ───────────────────────────────────────────
ALTER TABLE users DROP COLUMN IF EXISTS shopify_access_token;
ALTER TABLE users DROP COLUMN IF EXISTS shopify_refresh_token;
ALTER TABLE users DROP COLUMN IF EXISTS shopify_store_domain;
ALTER TABLE users DROP COLUMN IF EXISTS shopify_token_expires_at;
ALTER TABLE users DROP COLUMN IF EXISTS shopify_refresh_token_expires_at;

-- The generation before these: shopify_domain and shopify_token predate the rename
-- to shopify_store_domain and shopify_access_token. No code referenced them, so
-- they sat holding a stale credential. Dropped for the same reason as the rest.
ALTER TABLE users DROP COLUMN IF EXISTS shopify_domain;
ALTER TABLE users DROP COLUMN IF EXISTS shopify_token;

ALTER TABLE products DROP COLUMN IF EXISTS shopify_variant_id;
ALTER TABLE products DROP COLUMN IF EXISTS shopify_inventory_item_id;
ALTER TABLE products DROP COLUMN IF EXISTS shopify_location_id;
ALTER TABLE products DROP COLUMN IF EXISTS publish_shopify;

-- ─── Platform row ──────────────────────────────────────────────────────────────
-- orders.platform_id is a foreign key into external_platforms, so the Shopify row
-- is only removable once nothing references it. Removing it while orders point at
-- it would either fail or, with ON DELETE CASCADE, delete those orders — which is
-- not what was asked for. Left in place when orders exist so the Orders page can
-- still label them "Shopify" rather than "Other".
DO $$
DECLARE
    remaining bigint;
BEGIN
    SELECT COUNT(*) INTO remaining FROM orders WHERE platform_id = 6;

    IF remaining = 0 THEN
        DELETE FROM external_platforms WHERE id = 6;
        RAISE NOTICE 'No Shopify orders remained; platform row removed.';
    ELSE
        RAISE NOTICE 'Kept the Shopify platform row: % order(s) still reference it.', remaining;
    END IF;
END $$;

-- ─── What is left ──────────────────────────────────────────────────────────────
SELECT 'users columns remaining' AS check, COUNT(*) AS n
  FROM information_schema.columns
 WHERE table_name = 'users' AND column_name LIKE 'shopify%'
UNION ALL
SELECT 'products columns remaining', COUNT(*)
  FROM information_schema.columns
 WHERE table_name = 'products' AND (column_name LIKE 'shopify%' OR column_name = 'publish_shopify')
UNION ALL
SELECT 'shopify orders kept', COUNT(*) FROM orders WHERE platform_id = 6;
