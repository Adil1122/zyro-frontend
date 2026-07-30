-- WhatsApp tables migration
-- Run this in your Supabase SQL editor

-- 1. wa_conversations — one row per customer chat thread
CREATE TABLE IF NOT EXISTS wa_conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
    phone_number    TEXT NOT NULL,
    last_message    TEXT,
    order_id        TEXT,
    status          TEXT NOT NULL DEFAULT 'ai_handling'
                        CHECK (status IN ('ai_handling', 'manual_support', 'resolved')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wa_conversations_user_id_idx    ON wa_conversations(user_id);
CREATE INDEX IF NOT EXISTS wa_conversations_phone_idx      ON wa_conversations(phone_number);
CREATE INDEX IF NOT EXISTS wa_conversations_status_idx     ON wa_conversations(status);

ALTER TABLE wa_conversations DISABLE ROW LEVEL SECURITY;


-- 2. wa_messages — individual messages inside a conversation
CREATE TABLE IF NOT EXISTS wa_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES wa_conversations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_type     TEXT NOT NULL CHECK (sender_type IN ('customer', 'ai', 'bot', 'agent')),
    message_text    TEXT NOT NULL,
    ai_confidence   NUMERIC(4,3),   -- 0.000–1.000 for AI-generated replies
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wa_messages_conversation_id_idx ON wa_messages(conversation_id);
CREATE INDEX IF NOT EXISTS wa_messages_user_id_idx         ON wa_messages(user_id);
CREATE INDEX IF NOT EXISTS wa_messages_created_at_idx      ON wa_messages(created_at);

ALTER TABLE wa_messages DISABLE ROW LEVEL SECURITY;


-- 3. support_tickets — escalated conversations requiring human agent
CREATE TABLE IF NOT EXISTS support_tickets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES wa_conversations(id) ON DELETE SET NULL,
    subject         TEXT,
    status          TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'resolved', 'closed')),
    priority        TEXT DEFAULT 'medium'
                        CHECK (priority IN ('low', 'medium', 'high')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_user_id_idx  ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx   ON support_tickets(status);

ALTER TABLE support_tickets DISABLE ROW LEVEL SECURITY;


-- 4. wa_pending_orders — order confirmations awaiting YES/NO reply
CREATE TABLE IF NOT EXISTS wa_pending_orders (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone                   TEXT NOT NULL,
    customer_name           TEXT,
    order_ref               TEXT NOT NULL,
    total_amount            NUMERIC(12,2) DEFAULT 0,
    delivery_address        TEXT,
    city_name               TEXT,
    order_detail            TEXT,
    status                  TEXT NOT NULL DEFAULT 'pending_confirmation'
                                CHECK (status IN (
                                    'pending_confirmation', 'pending_cancellation',
                                    'confirmed', 'rejected',
                                    'cancelled_confirmed', 'restored'
                                )),
    postex_tracking_number  TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wa_pending_orders_user_id_idx  ON wa_pending_orders(user_id);
CREATE INDEX IF NOT EXISTS wa_pending_orders_phone_idx    ON wa_pending_orders(phone);
CREATE INDEX IF NOT EXISTS wa_pending_orders_status_idx   ON wa_pending_orders(status);

ALTER TABLE wa_pending_orders DISABLE ROW LEVEL SECURITY;


-- 5. notification_logs — audit trail for every WhatsApp message sent
CREATE TABLE IF NOT EXISTS notification_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id        TEXT,
    recipient_phone TEXT,
    message_sid     TEXT,
    status          TEXT NOT NULL DEFAULT 'sent'
                        CHECK (status IN ('sent', 'failed', 'pending')),
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_logs_user_id_idx ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS notification_logs_order_id_idx ON notification_logs(order_id);

ALTER TABLE notification_logs DISABLE ROW LEVEL SECURITY;
