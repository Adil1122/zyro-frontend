import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabase } from '@/lib/supabase';

const TOKEN_FIELDS = [
    'shopify_store_domain',
    'shopify_access_token',
    'shopify_refresh_token',
    'shopify_token_expires_at',
    'shopify_refresh_token_expires_at',
].join(', ');

// Renew slightly early so a token can't expire mid-request.
const RENEW_MARGIN_MS = 2 * 60 * 1000;

function db() {
    return supabaseAdmin || supabase;
}

/**
 * Writes the token set from an OAuth or refresh response.
 * Shopify rotates the refresh token on every refresh, so the new one must be stored.
 */
export async function persistShopifyTokens(userId, domain, tokenResponse) {
    const now = Date.now();
    const update = {
        shopify_store_domain: domain,
        shopify_access_token: tokenResponse.access_token,
        shopify_token_expires_at: tokenResponse.expires_in
            ? new Date(now + tokenResponse.expires_in * 1000).toISOString()
            : null,
    };

    // Only overwrite when present — never blank out a working refresh token.
    if (tokenResponse.refresh_token) {
        update.shopify_refresh_token = tokenResponse.refresh_token;
        update.shopify_refresh_token_expires_at = tokenResponse.refresh_token_expires_in
            ? new Date(now + tokenResponse.refresh_token_expires_in * 1000).toISOString()
            : null;
    }

    const { error } = await db().from('users').update(update).eq('id', userId);
    if (error) throw new Error(`Failed to save Shopify tokens: ${error.message}`);
}

async function refreshAccessToken(userId, row) {
    const refreshExpiresAt = row.shopify_refresh_token_expires_at
        ? new Date(row.shopify_refresh_token_expires_at).getTime()
        : null;

    if (!row.shopify_refresh_token || (refreshExpiresAt && refreshExpiresAt <= Date.now())) {
        throw new Error('SHOPIFY_TOKEN_EXPIRED');
    }

    const res = await fetch(`https://${row.shopify_store_domain}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: process.env.SHOPIFY_API_KEY,
            client_secret: process.env.SHOPIFY_API_SECRET,
            grant_type: 'refresh_token',
            refresh_token: row.shopify_refresh_token,
        }),
    });

    if (!res.ok) {
        console.error('[Shopify Token] Refresh failed:', res.status, await res.text());
        throw new Error('SHOPIFY_TOKEN_EXPIRED');
    }

    const tokenResponse = await res.json();
    if (!tokenResponse.access_token) throw new Error('SHOPIFY_TOKEN_EXPIRED');

    await persistShopifyTokens(userId, row.shopify_store_domain, tokenResponse);
    return { domain: row.shopify_store_domain, accessToken: tokenResponse.access_token };
}

/**
 * Returns usable Shopify credentials, refreshing the access token if needed.
 * Returns null when the store was never connected.
 * Throws SHOPIFY_TOKEN_EXPIRED when the merchant must reconnect.
 */
export async function getValidShopifyCreds(userId) {
    const { data: row, error } = await db()
        .from('users')
        .select(TOKEN_FIELDS)
        .eq('id', userId)
        .single();

    if (error) throw new Error(`Could not read Shopify credentials: ${error.message}`);
    if (!row?.shopify_store_domain || !row?.shopify_access_token) return null;

    // Legacy non-expiring tokens are refused by the Admin API and cannot be refreshed.
    if (!row.shopify_token_expires_at) throw new Error('SHOPIFY_TOKEN_EXPIRED');

    const expiresAt = new Date(row.shopify_token_expires_at).getTime();
    if (expiresAt - Date.now() > RENEW_MARGIN_MS) {
        return { domain: row.shopify_store_domain, accessToken: row.shopify_access_token };
    }

    return refreshAccessToken(userId, row);
}

export const SHOPIFY_CLEARED_COLUMNS = {
    shopify_store_domain: null,
    shopify_access_token: null,
    shopify_refresh_token: null,
    shopify_token_expires_at: null,
    shopify_refresh_token_expires_at: null,
};
