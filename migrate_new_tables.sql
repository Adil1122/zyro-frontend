-- Migration: courier_credentials, team_members, notification_preferences
-- Run this once in your Supabase SQL editor

-- ── courier_credentials ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courier_credentials (
    id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    courier_key  text NOT NULL,
    api_key      text NOT NULL,
    api_secret   text NOT NULL,
    updated_at   timestamptz DEFAULT now(),
    UNIQUE (user_id, courier_key)
);
ALTER TABLE courier_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own courier_credentials" ON courier_credentials
    FOR ALL USING (user_id = auth.uid());

-- ── team_members ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
    id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            text NOT NULL,
    email           text NOT NULL,
    role            text NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'manager', 'admin')),
    status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
    invited_at      timestamptz DEFAULT now()
);
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own team_members" ON team_members
    FOR ALL USING (owner_user_id = auth.uid());

-- ── notification_preferences ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_preferences (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    prefs       jsonb NOT NULL DEFAULT '{}',
    updated_at  timestamptz DEFAULT now()
);
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notification_preferences" ON notification_preferences
    FOR ALL USING (user_id = auth.uid());
