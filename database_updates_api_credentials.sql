-- Add API credentials columns to users table for per-user storage
ALTER TABLE users ADD COLUMN IF NOT EXISTS meta_app_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS meta_app_secret text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_ads_client_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_ads_client_secret text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_ads_developer_token text;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_meta_app_id ON users(meta_app_id) WHERE meta_app_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_google_ads_client_id ON users(google_ads_client_id) WHERE google_ads_client_id IS NOT NULL;

-- Add constraint to ensure at least one credential is set for marketing features
-- Note: PostgreSQL doesn't support IF NOT EXISTS with ADD CONSTRAINT
-- Drop constraint if it exists first, then add it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_marketing_creds' 
        AND conrelid = 'users'::regclass
    ) THEN
        ALTER TABLE users DROP CONSTRAINT check_marketing_creds;
    END IF;
    
    ALTER TABLE users ADD CONSTRAINT check_marketing_creds 
    CHECK (
        (meta_app_id IS NULL AND meta_app_secret IS NULL) OR 
        (meta_app_id IS NOT NULL AND meta_app_secret IS NOT NULL)
    );
END $$;
