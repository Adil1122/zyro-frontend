-- Add manual order fields to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS notes         TEXT,
ADD COLUMN IF NOT EXISTS payment_type  TEXT DEFAULT 'cod',
ADD COLUMN IF NOT EXISTS courier_name  TEXT,
ADD COLUMN IF NOT EXISTS courier_key   TEXT,
ADD COLUMN IF NOT EXISTS address       TEXT;
