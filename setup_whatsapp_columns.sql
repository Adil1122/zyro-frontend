-- Add WhatsApp integration columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS wa_phone_number_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wa_waba_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wa_access_token text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wa_template_name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wa_is_active boolean DEFAULT false;

-- Create notification_logs table for audit trail
CREATE TABLE IF NOT EXISTS notification_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id text,
  recipient_phone text NOT NULL,
  message_sid text,
  status text DEFAULT 'pending',
  error_message text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for notification performance
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_order_id ON notification_logs(order_id);
