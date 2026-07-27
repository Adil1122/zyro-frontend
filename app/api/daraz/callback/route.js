import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function buildSign(apiPath, params, appSecret) {
    const sortedKeys = Object.keys(params).sort();
    let base = apiPath;
    for (const key of sortedKeys) {
        base += key + params[key];
    }
    return crypto.createHmac('sha256', appSecret).update(base, 'utf-8').digest('hex').toUpperCase();
}

// Lazada auth codes have format: {version}_{app_key}_{random}
// e.g. 4_505264_tj7FJLqIno1tfkhLs0XydvVA63
function extractAppKeyFromCode(code) {
    if (!code) return null;
    const parts = code.split('_');
    if (parts.length >= 2) return parts[1];
    return null;
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    let state = searchParams.get('state'); // userId — may be null if coming from Daraz portal directly

    console.log('[Daraz Callback] code:', code, '| state:', state);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.zyroocloud.com';

    if (!code) {
        return NextResponse.redirect(`${appUrl}/settings/stores?daraz=error&msg=no_code`);
    }

    let user;

    if (state) {
        // Normal flow: state = userId from our initiate route
        const { data, error: userErr } = await supabase
            .from('users')
            .select('daraz_app_key, daraz_app_secret, daraz_region')
            .eq('id', state)
            .maybeSingle();
        if (userErr || !data?.daraz_app_key) {
            console.error('[Daraz Callback] No user found by state:', state, userErr?.message);
            return NextResponse.redirect(`${appUrl}/settings/stores?daraz=error&msg=no_credentials`);
        }
        user = data;
    } else {
        // Fallback: state missing (user came from Daraz portal "Show Auth Page")
        // Extract app_key from code format: {version}_{app_key}_{token}
        const appKeyFromCode = extractAppKeyFromCode(code);
        console.log('[Daraz Callback] No state — extracted app_key from code:', appKeyFromCode);
        if (!appKeyFromCode) {
            return NextResponse.redirect(`${appUrl}/settings/stores?daraz=error&msg=no_state_or_appkey`);
        }
        const { data, error: userErr } = await supabase
            .from('users')
            .select('id, daraz_app_key, daraz_app_secret, daraz_region')
            .eq('daraz_app_key', appKeyFromCode)
            .maybeSingle();
        if (userErr || !data?.daraz_app_key) {
            console.error('[Daraz Callback] No user found by app_key:', appKeyFromCode, userErr?.message);
            return NextResponse.redirect(`${appUrl}/settings/stores?daraz=error&msg=no_user_for_appkey`);
        }
        user = data;
        state = data.id; // Use the found user's ID going forward
    }

    const appKey = user.daraz_app_key;
    const appSecret = user.daraz_app_secret;
    const timestamp = Date.now().toString();

    const params = { app_key: appKey, code, sign_method: 'sha256', timestamp };
    const sign = buildSign('/auth/token/create', params, appSecret);
    const qs = new URLSearchParams({ ...params, sign }).toString();

    // Lazada auth server for all regions
    const tokenUrl = `https://auth.lazada.com/rest/auth/token/create?${qs}`;
    console.log('[Daraz Callback] Requesting token, params:', JSON.stringify({ ...params, sign }));

    try {
        // Official Lazada PHP SDK sends params in both URL query string AND form body
        const formBody = qs;
        const tokenRes = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formBody,
        });

        const raw = await tokenRes.text();
        console.log('[Daraz Callback] Raw token response:', raw);

        let tokenData;
        try { tokenData = JSON.parse(raw); } catch { tokenData = {}; }

        // Token can be at top level or nested under result
        const accessToken = tokenData.access_token || tokenData.result?.access_token;

        if (!accessToken) {
            const errMsg = tokenData.message || tokenData.result?.message || raw || 'token_exchange_failed';
            console.error('[Daraz Callback] No access_token:', raw);
            return NextResponse.redirect(`${appUrl}/settings/stores?daraz=error&msg=${encodeURIComponent(errMsg)}`);
        }

        // Save access token to DB
        await supabase.from('users').update({
            daraz_access_token: accessToken,
            daraz_is_active: true,
        }).eq('id', state);

        console.log('[Daraz Callback] Token saved for user:', state);
        return NextResponse.redirect(`${appUrl}/settings/stores?daraz=connected`);

    } catch (err) {
        console.error('[Daraz Callback] Fetch error:', err.message);
        return NextResponse.redirect(`${appUrl}/settings/stores?daraz=error&msg=${encodeURIComponent(err.message)}`);
    }
}
