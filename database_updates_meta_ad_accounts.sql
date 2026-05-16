-- Create meta_ad_accounts table
CREATE TABLE IF NOT EXISTS meta_ad_accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  account_id text not null,
  account_name text,
  account_status text,
  business_name text,
  currency text,
  timezone_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, account_id)
);

-- Create oauth_states table for OAuth security
CREATE TABLE IF NOT EXISTS oauth_states (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  provider text not null,
  state text not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(provider, state)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_meta_ad_accounts_user_id ON meta_ad_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_states_user_id ON oauth_states(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);
