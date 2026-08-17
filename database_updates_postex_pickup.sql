-- Add PostEx pickup address code column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS postex_pickup_address_code TEXT;
