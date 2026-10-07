import { NextResponse } from 'next/server';
import { getValidShopifyCreds } from '@/lib/shopifyToken';
import { isShopifyConfigured } from '@/lib/services/shopifyService';

export const maxDuration = 60;

const TOPICS = [
    'orders/create',
    'orders/updated',
    'orders/fulfilled',
    'orders/cancelled',
    'inventory_levels/update',
];

/**
 * Re-registers the webhooks a connected store needs.
 * Registration normally happens during OAuth, which only warns on failure — so a
 * store can be connected yet never deliver a new order. This repairs that without
 * making the merchant disconnect and reconnect.
 */
export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const creds = await getValidShopifyCreds(userId);
        if (!creds || !isShopifyConfigured(creds)) {
            return NextResponse.json({ configured: false, message: 'Shopify credentials not configured.' });
        }

        const domain = creds.domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
        const base = `https://${domain}/admin/api/2026-07`;
        const headers = { 'X-Shopify-Access-Token': creds.accessToken, 'Content-Type': 'application/json' };
        const address = `${new URL(request.url).origin}/api/shopify/webhook`;

        const existingRes = await fetch(`${base}/webhooks.json`, { headers });
        if (!existingRes.ok) {
            return NextResponse.json({
                error: `Could not list webhooks: ${existingRes.status} ${(await existingRes.text()).slice(0, 300)}`,
            }, { status: 502 });
        }
        const { webhooks: existing } = await existingRes.json();

        const registered = [];
        const skipped = [];
        const failures = [];

        for (const topic of TOPICS) {
            const match = (existing || []).find(w => w.topic === topic);

            // A webhook pointing at an old deployment URL is worse than none:
            // it looks registered while delivering nowhere we read.
            if (match && match.address === address) { skipped.push(topic); continue; }
            if (match) {
                await fetch(`${base}/webhooks/${match.id}.json`, { method: 'DELETE', headers })
                    .catch(() => {});
            }

            const res = await fetch(`${base}/webhooks.json`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ webhook: { topic, address, format: 'json' } }),
            });

            if (res.ok) registered.push(topic);
            else failures.push({ topic, error: (await res.text()).slice(0, 300) });
        }

        return NextResponse.json({
            configured: true,
            address,
            registered,
            alreadyCorrect: skipped,
            failures,
        });
    } catch (error) {
        console.error('[Shopify Webhook Register]', error.message);
        if (error.message === 'SHOPIFY_TOKEN_EXPIRED') {
            return NextResponse.json({ configured: false, tokenExpired: true });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
