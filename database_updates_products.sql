-- Products table: add all columns needed by the inventory system
-- Run this in your Supabase SQL editor

ALTER TABLE products ADD COLUMN IF NOT EXISTS stock          INTEGER  DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price     NUMERIC  DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode        TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_point  INTEGER  DEFAULT 10;
ALTER TABLE products ADD COLUMN IF NOT EXISTS publish_shopify    BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS publish_daraz      BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS publish_woocommerce BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id    UUID;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_name  TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS lead_time_days INTEGER;

-- If the table was originally created with stock_quantity instead of stock,
-- copy those values into the new stock column so existing data is preserved.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'stock_quantity'
  ) THEN
    UPDATE products SET stock = stock_quantity WHERE (stock IS NULL OR stock = 0) AND stock_quantity > 0;
  END IF;
END $$;
