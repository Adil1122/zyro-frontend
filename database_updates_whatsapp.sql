-- WhatsApp tables migration (safe to run on both fresh and existing databases)
-- Run this in your Supabase SQL editor

-- ── 1. wa_conversations ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wa_conversations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    customer_id  UUID REFERENCES customers(id) ON DELETE SET NULL,
    phone_number TEXT NOT NULL DEFAULT '',
    last_message TEXT,
    order_id     TEXT,
    status       TEXT NOT NULL DEFAULT 'ai_handling',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE wa_conversations ADD COLUMN IF NOT EXISTS user_id      UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE wa_conversations ADD COLUMN IF NOT EXISTS customer_id  UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE wa_conversations ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE wa_conversations ADD COLUMN IF NOT EXISTS last_message TEXT;
ALTER TABLE wa_conversations ADD COLUMN IF NOT EXISTS order_id     TEXT;
ALTER TABLE wa_conversations ADD COLUMN IF NOT EXISTS status       TEXT NOT NULL DEFAULT 'ai_handling';
ALTER TABLE wa_conversations ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS wa_conversations_user_id_idx ON wa_conversations(user_id);
CREATE INDEX IF NOT EXISTS wa_conversations_phone_idx   ON wa_conversations(phone_number);
CREATE INDEX IF NOT EXISTS wa_conversations_status_idx  ON wa_conversations(status);
ALTER TABLE wa_conversations DISABLE ROW LEVEL SECURITY;


-- ── 2. wa_messages ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wa_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES wa_conversations(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    sender_type     TEXT NOT NULL DEFAULT 'customer',
    message_text    TEXT NOT NULL DEFAULT '',
    ai_confidence   NUMERIC(4,3),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE wa_messages ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES wa_conversations(id) ON DELETE CASCADE;
ALTER TABLE wa_messages ADD COLUMN IF NOT EXISTS user_id         UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE wa_messages ADD COLUMN IF NOT EXISTS sender_type     TEXT;
ALTER TABLE wa_messages ADD COLUMN IF NOT EXISTS message_text    TEXT;
ALTER TABLE wa_messages ADD COLUMN IF NOT EXISTS ai_confidence   NUMERIC(4,3);

CREATE INDEX IF NOT EXISTS wa_messages_conversation_id_idx ON wa_messages(conversation_id);
CREATE INDEX IF NOT EXISTS wa_messages_user_id_idx         ON wa_messages(user_id);
CREATE INDEX IF NOT EXISTS wa_messages_created_at_idx      ON wa_messages(created_at);
ALTER TABLE wa_messages DISABLE ROW LEVEL SECURITY;


-- ── 3. support_tickets ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES wa_conversations(id) ON DELETE SET NULL,
    subject         TEXT,
    status          TEXT NOT NULL DEFAULT 'open',
    priority        TEXT DEFAULT 'medium',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS user_id         UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES wa_conversations(id) ON DELETE SET NULL;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS subject         TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS status          TEXT NOT NULL DEFAULT 'open';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS priority        TEXT DEFAULT 'medium';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS support_tickets_user_id_idx ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx  ON support_tickets(status);
ALTER TABLE support_tickets DISABLE ROW LEVEL SECURITY;


-- ── 4. wa_pending_orders ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wa_pending_orders (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                UUID REFERENCES users(id) ON DELETE CASCADE,
    phone                  TEXT NOT NULL DEFAULT '',
    customer_name          TEXT,
    order_ref              TEXT NOT NULL DEFAULT '',
    total_amount           NUMERIC(12,2) DEFAULT 0,
    delivery_address       TEXT,
    city_name              TEXT,
    order_detail           TEXT,
    status                 TEXT NOT NULL DEFAULT 'pending_confirmation',
    postex_tracking_number TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE wa_pending_orders ADD COLUMN IF NOT EXISTS user_id                UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE wa_pending_orders ADD COLUMN IF NOT EXISTS phone                  TEXT;
ALTER TABLE wa_pending_orders ADD COLUMN IF NOT EXISTS customer_name          TEXT;
ALTER TABLE wa_pending_orders ADD COLUMN IF NOT EXISTS order_ref              TEXT;
ALTER TABLE wa_pending_orders ADD COLUMN IF NOT EXISTS total_amount           NUMERIC(12,2) DEFAULT 0;
ALTER TABLE wa_pending_orders ADD COLUMN IF NOT EXISTS delivery_address       TEXT;
ALTER TABLE wa_pending_orders ADD COLUMN IF NOT EXISTS city_name              TEXT;
ALTER TABLE wa_pending_orders ADD COLUMN IF NOT EXISTS order_detail           TEXT;
ALTER TABLE wa_pending_orders ADD COLUMN IF NOT EXISTS status                 TEXT NOT NULL DEFAULT 'pending_confirmation';
ALTER TABLE wa_pending_orders ADD COLUMN IF NOT EXISTS postex_tracking_number TEXT;

CREATE INDEX IF NOT EXISTS wa_pending_orders_user_id_idx ON wa_pending_orders(user_id);
CREATE INDEX IF NOT EXISTS wa_pending_orders_phone_idx   ON wa_pending_orders(phone);
CREATE INDEX IF NOT EXISTS wa_pending_orders_status_idx  ON wa_pending_orders(status);
ALTER TABLE wa_pending_orders DISABLE ROW LEVEL SECURITY;


-- ── 5. notification_logs ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    order_id        TEXT,
    recipient_phone TEXT,
    message_sid     TEXT,
    status          TEXT NOT NULL DEFAULT 'sent',
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS user_id         UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS order_id        TEXT;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS recipient_phone TEXT;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS message_sid     TEXT;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS status          TEXT NOT NULL DEFAULT 'sent';
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS error_message   TEXT;

CREATE INDEX IF NOT EXISTS notification_logs_user_id_idx  ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS notification_logs_order_id_idx ON notification_logs(order_id);
ALTER TABLE notification_logs DISABLE ROW LEVEL SECURITY;
