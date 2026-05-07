-- 1. Create the plans table
create table if not exists plans (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  price numeric not null,
  currency text default 'PKR',
  features jsonb,
  interval text default 'monthly', -- 'monthly' or 'yearly'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default plans from Plans Page
insert into plans (name, price, currency, features)
values 
('Starter', 5999, 'PKR', '[
    "Auto order confirmation (WhatsApp template)",
    "Courier booking automation (Self-serve)",
    "1 Connected store",
    "Order dashboard"
]'),
('Growth', 12999, 'PKR', '[
    "Auto order confirmation (WhatsApp template)",
    "Courier booking automation (+ Team books)",
    "3 Connected stores",
    "Order dashboard",
    "WhatsApp AI Chatbot",
    "Daily courier receipts via WhatsApp"
]'),
('Pro', 19999, 'PKR', '[
    "Auto order confirmation (WhatsApp template)",
    "Courier booking automation (Full)",
    "Unlimited Connected stores",
    "Order dashboard",
    "WhatsApp AI Chatbot",
    "Daily courier receipts via WhatsApp",
    "Inventory management & sync",
    "Sync products across platforms",
    "Meta Ads stats",
    "Google Ads stats",
    "Dedicated account manager"
]')
on conflict do nothing;

-- 2. Update users table with new columns
alter table users add column if not exists timezone text default 'Asia/Karachi';
alter table users add column if not exists currency text default 'PKR';
alter table users add column if not exists trial_ends_at timestamp with time zone;
alter table users add column if not exists plan_id uuid references plans(id);

-- Payment Gateway Keys (Multi-tenant support)
alter table users add column if not exists stripe_publishable_key text;
alter table users add column if not exists stripe_secret_key text;
alter table users add column if not exists jazzcash_merchant_id text;
alter table users add column if not exists jazzcash_password text;
alter table users add column if not exists jazzcash_integrity_salt text;
alter table users add column if not exists easypaisa_merchant_id text;
alter table users add column if not exists easypaisa_store_id text;
alter table users add column if not exists easypaisa_hash_key text;

-- Subscription Management
alter table users add column if not exists subscription_status text default 'trial'; -- 'trial', 'active', 'cancelled', 'expired'
alter table users add column if not exists stripe_subscription_id text;
alter table users add column if not exists stripe_customer_id text;
alter table users add column if not exists current_period_end timestamp with time zone;
alter table users add column if not exists last_payment_amount numeric;
alter table users add column if not exists last_payment_date timestamp with time zone;

-- Set trial_ends_at for existing users if needed (14 days from creation)
update users set trial_ends_at = created_at + interval '14 days' where trial_ends_at is null;

-- 3. Update the register_user function to include 14 days trial and defaults
create or replace function public.register_user(
  p_name text, 
  p_email text, 
  p_password text, 
  p_phone text
)
returns setof public.users
language plpgsql security definer
as $$
begin
  return query
    insert into public.users (
      id, 
      name, 
      email, 
      password, 
      phone, 
      timezone, 
      currency, 
      trial_ends_at
    )
    values (
      gen_random_uuid(), 
      p_name, 
      p_email, 
      crypt(p_password, gen_salt('bf')), 
      p_phone,
      'Asia/Karachi', -- Default Islamabad/Karachi
      'PKR',          -- Default PKR
      now() + interval '14 days' -- 14 days free trial
    )
    returning *;
end;
$$;

-- 4. Update check_user_login to ensure it also sets timezone/currency if they are somehow missing (optional)
-- But we'll handle the Islamabad/Karachi requirement for first time login too
create or replace function check_user_login(p_email text, p_password text)
returns setof users
language plpgsql security definer
as $$
begin
  -- If user is found, update their timezone/currency if it's their first time (or just ensure it's set)
  -- Requirement 9: Islamabad/Karachi Pakistan timezone would be set to every user registers or logins first time
  update users 
  set timezone = coalesce(timezone, 'Asia/Karachi'),
      currency = coalesce(currency, 'PKR')
  where email = p_email 
    and password = crypt(p_password, password);

  return query
    select *
    from users
    where email = p_email 
      and password = crypt(p_password, password);
end;
$$;
