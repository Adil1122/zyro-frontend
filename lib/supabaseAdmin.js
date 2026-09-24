import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('[supabaseAdmin] Missing SUPABASE_SERVICE_ROLE_KEY — sensitive column writes will fail');
}

// Server-side only client — bypasses RLS for sensitive columns like shopify_access_token.
// Never import this in client components.
export const supabaseAdmin = supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    : null;
