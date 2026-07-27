import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function buildSign(apiPath, params, appSecret) {
    const sorted = Object.keys(params).sort().map(k => `${k}${params[k]}`).join('');
    const message = apiPath + sorted;
    return crypto.createHmac('sha256', appSecret).update(message).digest('hex').toUpperCase();
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // userId

    console.log('[Daraz Callback] code:', code, '| state:', state);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.zyroocloud.com';

    if (!code) {
        return NextResponse.redirect(`${appUrl}/settings/stores?daraz=error&msg=no_code`);
    }
    if (!state) {
        return NextResponse.redirect(`${appUrl}/settings/stores?daraz=error&msg=no_state`);
    }

    // Look up app credentials saved during initiation
    const { data: user, error: userErr } = await supabase
        .from('users')
        .select('daraz_app_key, daraz_app_secret')
        .eq('id', state)
        .maybeSingle();

    if (userErr || !user?.daraz_app_key || !user?.daraz_app_secret) {
        console.error('[Daraz Callback] Missing credentials for user:', state, userErr?.message);
        return NextResponse.redirect(`${appUrl}/settings/stores?daraz=error&msg=no_credentials`);
    }

    const appKey = user.daraz_app_key;
    const appSecret = user.daraz_app_secret;
    const timestamp = Date.now().toString();

    const params = { app_key: appKey, code, sign_method: 'sha256', timestamp };
    const sign = buildSign('/auth/token/create', params, appSecret);

    try {
        const tokenRes = await fetch(
            `https://auth.lazada.com/rest/auth/token/create?${new URLSearchParams({ ...params, sign })}`,
            { method: 'POST' }
        );
        const tokenData = await tokenRes.json();

        console.log('[Daraz Callback] Token response:', JSON.stringify(tokenData));

        if (!tokenData.access_token) {
            const msg = encodeURIComponent(tokenData.message || tokenData.code || 'token_exchange_failed');
            return NextResponse.redirect(`${appUrl}/settings/stores?daraz=error&msg=${msg}`);
        }

        // Save access token to DB
        await supabase.from('users').update({
            daraz_access_token: tokenData.access_token,
            daraz_is_active: true,
        }).eq('id', state);

        console.log('[Daraz Callback] Token saved for user:', state);
        return NextResponse.redirect(`${appUrl}/settings/stores?daraz=connected`);

    } catch (err) {
        console.error('[Daraz Callback] Error:', err.message);
        const msg = encodeURIComponent(err.message);
        return NextResponse.redirect(`${appUrl}/settings/stores?daraz=error&msg=${msg}`);
    }
}
