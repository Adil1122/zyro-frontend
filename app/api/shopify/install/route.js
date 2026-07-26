import { NextResponse } from 'next/server';

const SCOPES = [
    'read_orders', 'write_orders',
    'read_products', 'write_products',
    'read_customers', 'write_customers',
    'read_inventory', 'write_inventory',
    'read_fulfillments', 'write_fulfillments',
    'read_analytics',
].join(',');

/**
 * GET /api/shopify/install?shop=my-store.myshopify.com&userId=xxx
 * Redirects the merchant to Shopify OAuth authorization page.
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get('shop')?.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const userId = searchParams.get('userId');

    if (!shop || !userId) {
        return NextResponse.json({ error: 'Missing shop or userId' }, { status: 400 });
    }

    if (!shop.includes('.myshopify.com')) {
        return NextResponse.json({ error: 'Invalid shop domain — must end with .myshopify.com' }, { status: 400 });
    }

    const apiKey = process.env.SHOPIFY_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'SHOPIFY_API_KEY not configured' }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.zyroocloud.com';
    const redirectUri = `${appUrl}/api/shopify/callback`;

    // Encode userId in state for retrieval after callback
    const state = Buffer.from(JSON.stringify({ userId, nonce: Math.random().toString(36).slice(2) })).toString('base64url');

    const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
    authUrl.searchParams.set('client_id', apiKey);
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);

    return NextResponse.redirect(authUrl.toString());
}
