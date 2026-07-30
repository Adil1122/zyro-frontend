-- Trax courier credentials on users table
-- Run this in your Supabase SQL editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS trax_api_key      TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trax_api_secret   TEXT;
