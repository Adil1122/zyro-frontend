import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabase } from '@/lib/supabase';

// Diagnostic only. Reports whether credentials exist — never their values.
export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const usingServiceRole = !!supabaseAdmin;
    const db = supabaseAdmin || supabase;

    const { data, error } = await db
        .from('users')
        .select('shopify_store_domain, shopify_access_token')
        .eq('id', userId)
        .single();

    return NextResponse.json({
        usingServiceRole,
        queryError: error ? error.message : null,
        rowFound: !!data,
        hasDomain: !!data?.shopify_store_domain,
        hasToken: !!data?.shopify_access_token,
        tokenPrefix: data?.shopify_access_token ? data.shopify_access_token.slice(0, 5) : null,
    });
}
