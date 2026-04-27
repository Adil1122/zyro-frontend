create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  name text,
  email text,
  password text,
  phone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Drop the old foreign key constraint referencing auth.users from previous setups
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Ensure unique email for safe re-runs
CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- Enable pgcrypto for password hashing
create extension if not exists pgcrypto;

-- Query to insert test admin user with encrypted password (idempotent)
INSERT INTO users (id, name, email, password, phone) 
VALUES (gen_random_uuid(), 'admin', 'admin@zyro.com', crypt('admin12345', gen_salt('bf')), '03449878987')
ON CONFLICT (email) DO NOTHING;

-- Drop existing foreign keys that might still reference auth.users
ALTER TABLE ads_campaign DROP CONSTRAINT IF EXISTS ads_campaign_user_id_fkey;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_user_id_fkey;
ALTER TABLE couriers DROP CONSTRAINT IF EXISTS couriers_user_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_user_id_fkey;

-- Also explicitly check columns existence
ALTER TABLE ads_campaign ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE couriers ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE products ADD COLUMN IF NOT EXISTS user_id uuid;

-- Update the user_id on all tables FIRST so future constraints pass safely
UPDATE ads_campaign SET user_id = (SELECT id FROM users WHERE email = 'admin@zyro.com');
UPDATE customers SET user_id = (SELECT id FROM users WHERE email = 'admin@zyro.com');
UPDATE couriers SET user_id = (SELECT id FROM users WHERE email = 'admin@zyro.com');
UPDATE orders SET user_id = (SELECT id FROM users WHERE email = 'admin@zyro.com');
UPDATE products SET user_id = (SELECT id FROM users WHERE email = 'admin@zyro.com');

-- Add the constraints back so they cleanly point to public.users (not auth.users)
ALTER TABLE ads_campaign ADD CONSTRAINT ads_campaign_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE customers ADD CONSTRAINT customers_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE couriers ADD CONSTRAINT couriers_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE orders ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE products ADD CONSTRAINT products_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

-- Create an RPC function to verify encrypted password and return user securely
create or replace function check_user_login(p_email text, p_password text)
returns setof users
language plpgsql security definer
as $$
begin
  return query
    select *
    from users
    where email = p_email 
      and password = crypt(p_password, password);
end;
$$;
