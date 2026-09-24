-- Shopify expiring offline access tokens.
-- Shopify stopped accepting non-expiring tokens for new public apps on 2026-04-01.
-- Access tokens now live ~60 minutes and are renewed with a rotating refresh token.

ALTER TABLE users ADD COLUMN IF NOT EXISTS shopify_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS shopify_token_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS shopify_refresh_token_expires_at TIMESTAMPTZ;

-- Existing non-expiring tokens are already rejected by Shopify. Clear them so the
-- app shows "Reconnect Required" instead of retrying a token that can never work.
UPDATE users
SET shopify_access_token = NULL
WHERE shopify_access_token IS NOT NULL
  AND shopify_token_expires_at IS NULL;
