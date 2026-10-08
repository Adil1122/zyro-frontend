-- Product images.
--
-- products had no image column, so a product created on Shopify or WooCommerce
-- arrived with no picture — which reads as an unfinished listing in either store.
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
