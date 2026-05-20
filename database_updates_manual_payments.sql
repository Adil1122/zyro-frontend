-- Add manual payment columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS manual_payment_screenshot TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS manual_payment_tid TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS manual_payment_sender TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS manual_payment_method TEXT;
