import { NextResponse } from 'next/server';
import { getValidShopifyCreds } from '@/lib/shopifyToken';
import { fetchShopifyOrdersPage, isShopifyConfigured } from '@/lib/services/shopifyService';
import { upsertShopifyOrder } from '@/lib/services/shopifyOrderSync';
import { syncProductMapping } from '@/lib/services/shopifyInventory';

export const maxDuration = 60;

// One page per request. The caller follows nextPageInfo so a large store can't
// exceed the serverless time limit, and the merchant sees progress as it runs.
const MAX_LIMIT = 100;

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const creds = await getValidShopifyCreds(userId);
        if (!creds || !isShopifyConfigured(creds)) {
            return NextResponse.json({ configured: false, message: 'Shopify credentials not configured.' });
        }

        let body = {};
        try { body = await request.json(); } catch { /* no body is fine */ }

        const pageInfo = body.pageInfo || null;
        const limit = Math.min(parseInt(body.limit, 10) || 50, MAX_LIMIT);

        // Link products to Shopify variants on the first page so inventory can be pushed.
        let mapping = null;
        if (!pageInfo) {
            try {
                mapping = await syncProductMapping(userId, creds);
            } catch (e) {
                console.error('[Shopify Sync] Product mapping failed:', e.message);
            }
        }

        const { orders, nextPageInfo } = await fetchShopifyOrdersPage({ creds, limit, pageInfo });

        let created = 0;
        let updated = 0;
        const failures = [];

        for (const order of orders) {
            try {
                const result = await upsertShopifyOrder(userId, order, { notify: false });
                if (result.isNewOrder) created++;
                else updated++;
            } catch (e) {
                failures.push({ order: order.name || order.id, error: e.message });
            }
        }

        if (failures.length) {
            console.error('[Shopify Sync] Failed orders:', failures);
        }

        return NextResponse.json({
            configured: true,
            success: true,
            processed: orders.length,
            created,
            updated,
            failed: failures.length,
            firstFailure: failures[0]?.error || null,
            mapping,
            nextPageInfo: nextPageInfo || null,
            done: !nextPageInfo,
        });
    } catch (error) {
        console.error('[Shopify Sync Error]', error.message);
        if (error.message === 'SHOPIFY_TOKEN_EXPIRED') {
            return NextResponse.json({ configured: false, tokenExpired: true, message: 'Shopify access token expired. Please reconnect your store.' });
        }
        return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
    }
}
