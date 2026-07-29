-- Snapshot table: one row per user, stores the full campaign JSON + sync timestamp.
-- The stats endpoint reads from here; the sync job writes here.
CREATE TABLE IF NOT EXISTS meta_ads_snapshot (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references users(id) on delete cascade unique,
  data       jsonb,
  synced_at  timestamp with time zone default timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_meta_ads_snapshot_user_id ON meta_ads_snapshot(user_id);
