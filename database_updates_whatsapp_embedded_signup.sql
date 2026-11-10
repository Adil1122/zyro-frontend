-- ═══════════════════════════════════════════════════════════════════════════
-- WhatsApp Embedded Signup v4 Multi-Tenant Database Schema Migration
-- Run this in your Supabase SQL editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. whatsapp_connections: Stores each merchant's authorized Meta WhatsApp Business connection
CREATE TABLE IF NOT EXISTS whatsapp_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    waba_id TEXT NOT NULL,
    phone_number_id TEXT NOT NULL,
    display_phone_number TEXT,
    verified_name TEXT,
    quality_rating TEXT DEFAULT 'UNKNOWN',
    encrypted_access_token TEXT NOT NULL,
    token_encryption_version INTEGER NOT NULL DEFAULT 1,
    token_expires_at TIMESTAMPTZ,
    connection_status TEXT NOT NULL DEFAULT 'connected', -- 'connected', 'disconnected', 'expired'
    onboarding_type TEXT DEFAULT 'embedded_signup_v4',
    app_version TEXT DEFAULT 'v26.0',
    meta_response_raw JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure a phone number cannot be linked to multiple unrelated merchants simultaneously
CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_connections_phone_id ON whatsapp_connections(phone_number_id) WHERE connection_status = 'connected';
CREATE INDEX IF NOT EXISTS idx_wa_connections_user_id ON whatsapp_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_wa_connections_waba_id ON whatsapp_connections(waba_id);

-- 2. whatsapp_signup_sessions: Temporary state tracking to prevent CSRF and replay attacks
CREATE TABLE IF NOT EXISTS whatsapp_signup_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    state_hash TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'expired', 'failed'
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wa_signup_state_hash ON whatsapp_signup_sessions(state_hash);
CREATE INDEX IF NOT EXISTS idx_wa_signup_user_id ON whatsapp_signup_sessions(user_id);

-- 3. whatsapp_webhook_events: Idempotent audit log of processed webhook events per tenant
CREATE TABLE IF NOT EXISTS whatsapp_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    phone_number_id TEXT NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'message',
    meta_event_id TEXT,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_webhook_dedup ON whatsapp_webhook_events(meta_event_id) WHERE meta_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wa_webhook_user_id ON whatsapp_webhook_events(user_id);

-- 4. Enable Row Level Security (RLS) on whatsapp_connections
ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_signup_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_connections' AND policyname = 'service_role_all_wa_connections'
    ) THEN
        CREATE POLICY service_role_all_wa_connections ON whatsapp_connections FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_signup_sessions' AND policyname = 'service_role_all_wa_signup_sessions'
    ) THEN
        CREATE POLICY service_role_all_wa_signup_sessions ON whatsapp_signup_sessions FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_webhook_events' AND policyname = 'service_role_all_wa_webhook_events'
    ) THEN
        CREATE POLICY service_role_all_wa_webhook_events ON whatsapp_webhook_events FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
