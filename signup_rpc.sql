-- STEP 1: Enable pgcrypto if not already enabled
create extension if not exists pgcrypto;

-- STEP 2: Create the register_user function
-- This function handles 14 days trial, default timezone and currency
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
      'Asia/Karachi',
      'PKR',
      now() + interval '14 days'
    )
    returning *;
end;
$$;

-- STEP 3: Grant permissions
grant execute on function public.register_user to anon, authenticated;
