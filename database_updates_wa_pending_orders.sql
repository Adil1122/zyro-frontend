-- wa_pending_orders table: stores pending confirmation data from WhatsApp order_created template
CREATE TABLE IF NOT EXISTS wa_pending_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  customer_name text,
  order_ref text NOT NULL,
  total_amount numeric DEFAULT 0,
  delivery_address text,
  city_name text,
  order_detail text,
  status text DEFAULT 'pending_confirmation',
  -- status values: 'pending_confirmation', 'confirmed', 'rejected', 'expired'
  postex_tracking_number text,
  wa_message_id text,
  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz DEFAULT (now() + interval '24 hours') NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wa_pending_orders_phone ON wa_pending_orders(phone, user_id);
CREATE INDEX IF NOT EXISTS idx_wa_pending_orders_user_id ON wa_pending_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_wa_pending_orders_status ON wa_pending_orders(status);
