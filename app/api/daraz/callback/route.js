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
    const region = user.daraz_region || 'pk';
    const timestamp = Date.now().toString();

    const REGION_TOKEN_URL = {
        pk: 'https://api.daraz.pk/rest/auth/token/create',
        bd: 'https://api.daraz.com.bd/rest/auth/token/create',
        lk: 'https://api.daraz.lk/rest/auth/token/create',
        my: 'https://api.lazada.com.my/rest/auth/token/create',
        sg: 'https://api.lazada.sg/rest/auth/token/create',
        th: 'https://api.lazada.co.th/rest/auth/token/create',
        ph: 'https://api.lazada.com.ph/rest/auth/token/create',
        id: 'https://api.lazada.co.id/rest/auth/token/create',
        vn: 'https://api.lazada.vn/rest/auth/token/create',
    };

    const params = { app_key: appKey, code, sign_method: 'sha256', timestamp };
    const sign = buildSign('/auth/token/create', params, appSecret);
    const qs = new URLSearchParams({ ...params, sign }).toString();

    const tokenUrl = `${REGION_TOKEN_URL[region] || REGION_TOKEN_URL['pk']}?${qs}`;
    console.log('[Daraz Callback] Requesting token, params:', JSON.stringify({ ...params, sign }));

    try {
        // Try GET first (simpler, used in many Lazada examples), fall back to POST
        let raw;
        const getRes = await fetch(tokenUrl, { method: 'GET' });
        raw = await getRes.text();
        console.log('[Daraz Callback] GET response:', raw);

        let tokenDataCheck;
        try { tokenDataCheck = JSON.parse(raw); } catch { tokenDataCheck = {}; }
        const hasToken = tokenDataCheck.access_token || tokenDataCheck.result?.access_token;

        if (!hasToken) {
            // Fallback: POST with form body (official Lazada PHP SDK pattern)
            const postRes = await fetch(tokenUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: qs,
            });
            raw = await postRes.text();
            console.log('[Daraz Callback] POST response:', raw);
        }

        const rawFinal = raw;
        console.log('[Daraz Callback] Raw token response:', raw);

        let tokenData;
        try { tokenData = JSON.parse(rawFinal); } catch { tokenData = {}; }

        // Token can be at top level or nested under result
        const accessToken = tokenData.access_token || tokenData.result?.access_token;

        if (!accessToken) {
            const errMsg = tokenData.message || tokenData.result?.message || rawFinal || 'token_exchange_failed';
            console.error('[Daraz Callback] No access_token:', rawFinal);
            return NextResponse.redirect(`${appUrl}/settings/stores?daraz=error&msg=${encodeURIComponent(errMsg)}`);
        }

        // Fetch seller ID so webhook can identify this user
        let sellerId = null;
        try {
            const { getCredentials } = await import('@/lib/services/darazService');
            const { darazGet: _unused, ...rest } = await import('@/lib/services/darazService');
            // Call /seller/get with the new token
            const REGION_BASE = {
                pk: 'https://api.daraz.pk/rest', bd: 'https://api.daraz.com.bd/rest',
                lk: 'https://api.daraz.lk/rest', my: 'https://api.lazada.com.my/rest',
                sg: 'https://api.lazada.sg/rest',
            };
            const baseUrl = REGION_BASE[region] || REGION_BASE['pk'];
            const ts2 = Date.now().toString();
            const sParams = { app_key: appKey, access_token: accessToken, sign_method: 'sha256', timestamp: ts2 };
            const sSign = buildSign('/seller/get', sParams, appSecret);
            const sellerRes = await fetch(`${baseUrl}/seller/get?${new URLSearchParams({ ...sParams, sign: sSign })}`);
            const sellerData = await sellerRes.json();
            sellerId = String(sellerData?.data?.seller_id || sellerData?.result?.seller_id || '');
            console.log('[Daraz Callback] Seller ID:', sellerId);
        } catch (e) {
            console.warn('[Daraz Callback] Could not fetch seller ID:', e.message);
        }

        // Save access token + seller ID to DB
        await supabase.from('users').update({
            daraz_access_token: accessToken,
            daraz_is_active: true,
            ...(sellerId ? { daraz_seller_id: sellerId } : {}),
        }).eq('id', state);

        console.log('[Daraz Callback] Token saved for user:', state);
        return NextResponse.redirect(`${appUrl}/settings/stores?daraz=connected`);

    } catch (err) {
        console.error('[Daraz Callback] Fetch error:', err.message);
        return NextResponse.redirect(`${appUrl}/settings/stores?daraz=error&msg=${encodeURIComponent(err.message)}`);
    }
}
