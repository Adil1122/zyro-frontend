-- STEP 1: Enable pgcrypto if not already enabled
create extension if not exists pgcrypto;

-- STEP 2: Create the register_user function
-- This function is created in the 'public' schema and is accessible via RPC
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
    insert into public.users (id, name, email, password, phone)
    values (gen_random_uuid(), p_name, p_email, crypt(p_password, gen_salt('bf')), p_phone)
    returning *;
end;
$$;

-- STEP 3: Grant permissions so the frontend can call it
grant execute on function public.register_user to anon, authenticated;

-- STEP 4: Ensure the users table is accessible (optional if RLS is off)
-- grant select, insert on public.users to anon, authenticated;
