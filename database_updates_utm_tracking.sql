-- Create UTM tracking events table
CREATE TABLE IF NOT EXISTS utm_tracking_events (
  id uuid default gen_random_uuid() primary key,
  event_type text not null,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  gclid text,
  fbclid text,
  page_url text,
  timestamp timestamp with time zone not null,
  user_agent text,
  ip_address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_utm_tracking_events_event_type ON utm_tracking_events(event_type);
CREATE INDEX IF NOT EXISTS idx_utm_tracking_events_timestamp ON utm_tracking_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_utm_tracking_events_utm_source ON utm_tracking_events(utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_utm_tracking_events_gclid ON utm_tracking_events(gclid) WHERE gclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_utm_tracking_events_fbclid ON utm_tracking_events(fbclid) WHERE fbclid IS NOT NULL;
