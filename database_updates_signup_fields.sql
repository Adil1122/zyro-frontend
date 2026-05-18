-- Migration to support new premium business details during registration
-- Run this in your Supabase SQL Editor to support saving Business Name, Niche, and Channels.

ALTER TABLE users ADD COLUMN IF NOT EXISTS business_name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS niche text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS channels text[];
