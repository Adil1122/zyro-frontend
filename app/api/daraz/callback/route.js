import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function buildSign(apiPath, params, appSecret) {
    const sortedKeys = Object.keys(params).sort();
    let base = apiPath;
    for (const key of sortedKeys) base += key + params[key];
    return crypto.createHmac('sha256', appSecret).update(base, 'utf-8').digest('hex').toUpperCase();
}

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

const REGION_BASE = {
    pk: 'https://api.daraz.pk/rest',
    bd: 'https://api.daraz.com.bd/rest',
    lk: 'https://api.daraz.lk/rest',
    my: 'https://api.lazada.com.my/rest',
    sg: 'https://api.lazada.sg/rest',
    th: 'https://api.lazada.co.th/rest',
    ph: 'https://api.lazada.com.ph/rest',
    id: 'https://api.lazada.co.id/rest',
    vn: 'https://api.lazada.vn/rest',
};

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const userId = searchParams.get('state');

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.zyroocloud.com';

    if (!code) return NextResponse.redirect(`${appUrl}/settings/stores?daraz=error&msg=no_code`);
    if (!userId) return NextResponse.redirect(`${appUrl}/settings/stores?daraz=error&msg=no_state`);

    // Credentials come from server env — no per-user app key needed
    const appKey = process.env.DARAZ_APP_KEY;
    const appSecret = process.env.DARAZ_APP_SECRET;
    if (!appKey || !appSecret) {
        return NextResponse.redirect(`${appUrl}/settings/stores?daraz=error&msg=server_misconfigured`);
    }

    // Look up the region the user selected
    const { data: userData } = await supabase
        .from('users')
        .select('daraz_region')
        .eq('id', userId)
        .maybeSingle();
    const region = userData?.daraz_region || 'pk';

    const timestamp = Date.now().toString();
    const params = { app_key: appKey, code, sign_method: 'sha256', timestamp };
    const sign = buildSign('/auth/token/create', params, appSecret);
    const qs = new URLSearchParams({ ...params, sign }).toString();
    const tokenUrl = `${REGION_TOKEN_URL[region] || REGION_TOKEN_URL['pk']}?${qs}`;

    try {
        // Try GET first, fall back to POST (Daraz supports both)
        let raw = await (await fetch(tokenUrl, { method: 'GET' })).text();
        let tokenData = {};
        try { tokenData = JSON.parse(raw); } catch { /* */ }

        if (!tokenData.access_token && !tokenData.result?.access_token) {
            raw = await (await fetch(tokenUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: qs,
            })).text();
            try { tokenData = JSON.parse(raw); } catch { tokenData = {}; }
        }

        const accessToken = tokenData.access_token || tokenData.result?.access_token;
        if (!accessToken) {
            const errMsg = tokenData.message || tokenData.result?.message || 'token_exchange_failed';
            console.error('[Daraz Callback] Token exchange failed:', errMsg, 'Response:', raw);
            return NextResponse.redirect(`${appUrl}/settings/stores?daraz=error&msg=${encodeURIComponent(errMsg)}`);
        }

        // Fetch seller ID
        let sellerId = null;
        try {
            const baseUrl = REGION_BASE[region] || REGION_BASE['pk'];
            const ts2 = Date.now().toString();
            const sParams = { app_key: appKey, access_token: accessToken, sign_method: 'sha256', timestamp: ts2 };
            const sSign = buildSign('/seller/get', sParams, appSecret);
            const sellerRes = await fetch(`${baseUrl}/seller/get?${new URLSearchParams({ ...sParams, sign: sSign })}`);
            const sellerData = await sellerRes.json();
            sellerId = String(sellerData?.data?.seller_id || sellerData?.result?.seller_id || '');
        } catch (e) {
            console.warn('[Daraz Callback] Could not fetch seller ID:', e.message);
        }

        const { error: dbError } = await supabase.from('users').update({
            daraz_access_token: accessToken,
            daraz_is_active: true,
        }).eq('id', userId);

        if (dbError) {
            console.error('[Daraz Callback] DB update failed:', dbError);
            return NextResponse.redirect(`${appUrl}/settings/stores?daraz=error&msg=${encodeURIComponent('db_error: ' + dbError.message)}`);
        }

        // Verify the token was actually written (catches silent update failures e.g. RLS or wrong userId)
        const { data: verifyUser } = await supabase
            .from('users')
            .select('daraz_access_token')
            .eq('id', userId)
            .single();

        if (!verifyUser?.daraz_access_token) {
            console.error('[Daraz Callback] Token not found after save. userId:', userId);
            return NextResponse.redirect(`${appUrl}/settings/stores?daraz=error&msg=token_save_failed`);
        }

        return NextResponse.redirect(`${appUrl}/settings/stores?daraz=connected`);
    } catch (err) {
        return NextResponse.redirect(`${appUrl}/settings/stores?daraz=error&msg=${encodeURIComponent(err.message)}`);
    }
}
