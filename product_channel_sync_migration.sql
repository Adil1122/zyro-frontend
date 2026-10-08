-- Links a Zyro product to its counterpart on each channel.
--
-- Stock can only be pushed to a channel we can address. Shopify needs an
-- inventory_item_id and a location_id (added by shopify_inventory_sync_migration.sql);
-- WooCommerce needs its product id. Without these a stock change has nowhere to go.

ALTER TABLE products ADD COLUMN IF NOT EXISTS wc_product_id BIGINT;

CREATE INDEX IF NOT EXISTS products_wc_product_idx
    ON products (user_id, wc_product_id);

-- SKU is the only identifier every channel shares, so it is how an existing
-- catalogue gets linked. A product with no SKU cannot be matched and is skipped
-- rather than guessed at.
CREATE INDEX IF NOT EXISTS products_user_sku_idx
    ON products (user_id, LOWER(sku));

-- Records what happened on each channel for a stock change or product creation,
-- so a silent push failure is visible instead of being discovered as drift.
CREATE TABLE IF NOT EXISTS channel_sync_log (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id  UUID        REFERENCES products(id) ON DELETE CASCADE,
    channel     TEXT        NOT NULL,
    action      TEXT        NOT NULL,
    status      TEXT        NOT NULL,
    detail      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS channel_sync_log_recent_idx
    ON channel_sync_log (user_id, created_at DESC);
