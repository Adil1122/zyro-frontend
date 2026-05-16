-- Create Google Ads campaigns table
CREATE TABLE IF NOT EXISTS google_ads_campaigns (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  campaign_id text not null,
  campaign_name text,
  status text,
  channel_type text,
  spend decimal(10,2) default 0,
  impressions integer default 0,
  clicks integer default 0,
  conversions decimal(10,2) default 0,
  ctr decimal(5,2) default 0,
  avg_cpc decimal(10,2) default 0,
  conversion_rate decimal(5,2) default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, campaign_id)
);

-- Create Google Ads stats table for daily stats
CREATE TABLE IF NOT EXISTS google_ads_stats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  campaign_id text,
  date date not null,
  spend decimal(10,2) default 0,
  impressions integer default 0,
  clicks integer default 0,
  conversions decimal(10,2) default 0,
  revenue decimal(10,2) default 0,
  orders integer default 0,
  roas decimal(10,2) default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, campaign_id, date)
);

-- Create Google Ads accounts table
CREATE TABLE IF NOT EXISTS google_ad_accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  customer_id text not null,
  resource_name text,
  display_name text,
  currency_code text,
  time_zone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, customer_id)
);

-- Add UTM parameters to orders table for tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS utm_source text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS utm_medium text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS utm_campaign text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS utm_term text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS utm_content text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gclid text; -- Google Click Identifier
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fbclid text; -- Facebook Click Identifier

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_google_ads_campaigns_user_id ON google_ads_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_campaigns_campaign_id ON google_ads_campaigns(campaign_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_stats_user_id ON google_ads_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_stats_date ON google_ads_stats(date);
CREATE INDEX IF NOT EXISTS idx_google_ad_accounts_user_id ON google_ad_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_utm_source ON orders(utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_gclid ON orders(gclid) WHERE gclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_fbclid ON orders(fbclid) WHERE fbclid IS NOT NULL;
