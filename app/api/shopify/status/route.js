import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabase } from '@/lib/supabase';

// Diagnostic only. Reports whether credentials work — never their values.
export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const usingServiceRole = !!supabaseAdmin;
    const db = supabaseAdmin || supabase;

    const { data, error } = await db
        .from('users')
        .select('shopify_store_domain, shopify_access_token, shopify_refresh_token, shopify_token_expires_at, shopify_refresh_token_expires_at')
        .eq('id', userId)
        .single();

    const domain = data?.shopify_store_domain || null;
    const token = data?.shopify_access_token || null;

    const result = {
        usingServiceRole,
        queryError: error ? error.message : null,
        domain,
        hasToken: !!token,
        // Fingerprint lets us tell if a reconnect actually replaced the token,
        // without revealing any part of it.
        tokenFingerprint: token ? createHash('sha256').update(token).digest('hex').slice(0, 8) : null,
        tokenLength: token ? token.length : 0,
        tokenPrefix: token ? token.split('_')[0] : null,
        isExpiringToken: !!data?.shopify_token_expires_at,
        hasRefreshToken: !!data?.shopify_refresh_token,
        tokenExpiresAt: data?.shopify_token_expires_at || null,
        refreshTokenExpiresAt: data?.shopify_refresh_token_expires_at || null,
    };

    if (domain && token) {
        const clean = domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
        for (const endpoint of ['shop.json', 'orders/count.json?status=any']) {
            try {
                const res = await fetch(`https://${clean}/admin/api/2026-07/${endpoint}`, {
                    headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
                });
                result[endpoint] = { status: res.status, body: (await res.text()).slice(0, 400) };
            } catch (e) {
                result[endpoint] = { status: 'fetch_failed', body: e.message };
            }
        }
    }

    return NextResponse.json(result);
}
