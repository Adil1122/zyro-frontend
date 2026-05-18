-- Migration to support premium onboarding flow details in database
-- Run this in your Supabase SQL Editor to support the onboarding persistence layers.

ALTER TABLE users ADD COLUMN IF NOT EXISTS business_type text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_orders text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS connected_source text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS connected_courier text;
