import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/shopify/callback
 * Shopify redirects here after merchant authorizes the app.
 * Exchanges the code for a permanent access token and saves it.
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.zyroocloud.com';

    const code = searchParams.get('code');
    const shop = searchParams.get('shop');
    const state = searchParams.get('state');
    const hmac = searchParams.get('hmac');

    // --- HMAC verification ---
    const apiSecret = process.env.SHOPIFY_API_SECRET;
    if (apiSecret && hmac) {
        const params = {};
        searchParams.forEach((v, k) => { if (k !== 'hmac') params[k] = v; });
        const message = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
        const digest = createHmac('sha256', apiSecret).update(message).digest('hex');
        if (digest !== hmac) {
            return NextResponse.redirect(`${appUrl}/settings/stores?shopify=error&reason=invalid_hmac`);
        }
    }

    if (!code || !shop || !state) {
        return NextResponse.redirect(`${appUrl}/settings/stores?shopify=error&reason=missing_params`);
    }

    // --- Decode userId from state ---
    let userId;
    try {
        const decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
        userId = decoded.userId;
    } catch {
        return NextResponse.redirect(`${appUrl}/settings/stores?shopify=error&reason=invalid_state`);
    }

    if (!userId) {
        return NextResponse.redirect(`${appUrl}/settings/stores?shopify=error&reason=no_user`);
    }

    // --- Exchange code for access token ---
    try {
        const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: process.env.SHOPIFY_API_KEY,
                client_secret: process.env.SHOPIFY_API_SECRET,
                code,
            }),
        });

        if (!tokenRes.ok) {
            const err = await tokenRes.text();
            console.error('[Shopify Callback] Token exchange failed:', err);
            return NextResponse.redirect(`${appUrl}/settings/stores?shopify=error&reason=token_exchange`);
        }

        const { access_token } = await tokenRes.json();

        if (!access_token) {
            return NextResponse.redirect(`${appUrl}/settings/stores?shopify=error&reason=no_token`);
        }

        // --- Save to Supabase ---
        const cleanDomain = shop.replace(/^https?:\/\//, '').replace(/\/+$/, '');
        const { error: dbError } = await supabase
            .from('users')
            .update({
                shopify_store_domain: cleanDomain,
                shopify_access_token: access_token,
            })
            .eq('id', userId);

        if (dbError) {
            console.error('[Shopify Callback] DB save error:', dbError);
            return NextResponse.redirect(`${appUrl}/settings/stores?shopify=error&reason=db_error`);
        }

        console.log(`[Shopify Callback] Connected ${cleanDomain} for user ${userId}`);

        // Register webhooks for this store
        const webhookTopics = ['orders/create', 'orders/updated', 'orders/cancelled'];
        const webhookAddress = `${appUrl}/api/shopify/webhook`;
        for (const wTopic of webhookTopics) {
            const wRes = await fetch(`https://${cleanDomain}/admin/api/2026-07/webhooks.json`, {
                method: 'POST',
                headers: {
                    'X-Shopify-Access-Token': access_token,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ webhook: { topic: wTopic, address: webhookAddress, format: 'json' } }),
            });
            if (!wRes.ok) {
                const wErr = await wRes.text();
                console.warn(`[Shopify Callback] Webhook registration failed (${wTopic}):`, wErr);
            } else {
                console.log(`[Shopify Callback] Webhook registered: ${wTopic}`);
            }
        }

        return NextResponse.redirect(`${appUrl}/settings/stores?shopify=connected&shop=${cleanDomain}`);

    } catch (err) {
        console.error('[Shopify Callback] Unexpected error:', err.message);
        return NextResponse.redirect(`${appUrl}/settings/stores?shopify=error&reason=unexpected`);
    }
}
