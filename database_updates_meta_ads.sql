-- Add Meta Ads API credentials to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS meta_ads_access_token text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS meta_ads_refresh_token text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS meta_ads_token_expires_at timestamp with time zone;
ALTER TABLE users ADD COLUMN IF NOT EXISTS meta_ads_ad_account_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS meta_ads_business_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS meta_ads_connected_at timestamp with time zone;
ALTER TABLE users ADD COLUMN IF NOT EXISTS meta_ads_enabled boolean default false;

-- Add Google Ads API credentials (for future use)
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_ads_access_token text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_ads_refresh_token text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_ads_token_expires_at timestamp with time zone;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_ads_customer_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_ads_connected_at timestamp with time zone;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_ads_enabled boolean default false;

-- Create Meta Ads campaigns table to store campaign data
CREATE TABLE IF NOT EXISTS meta_ads_campaigns (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  campaign_id text not null,
  campaign_name text,
  status text,
  objective text,
  spend decimal(10,2) default 0,
  impressions integer default 0,
  clicks integer default 0,
  reach integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, campaign_id)
);

-- Create Meta Ads stats table for daily stats
CREATE TABLE IF NOT EXISTS meta_ads_stats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  campaign_id text,
  date date not null,
  spend decimal(10,2) default 0,
  impressions integer default 0,
  clicks integer default 0,
  reach integer default 0,
  revenue decimal(10,2) default 0,
  orders integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, campaign_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_meta_ads_campaigns_user_id ON meta_ads_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_campaigns_campaign_id ON meta_ads_campaigns(campaign_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_stats_user_id ON meta_ads_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_stats_date ON meta_ads_stats(date);
