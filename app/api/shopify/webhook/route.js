import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { upsertShopifyOrder, findUserByShopDomain } from '@/lib/services/shopifyOrderSync';

const ORDER_TOPICS = ['orders/create', 'orders/updated', 'orders/fulfilled', 'orders/cancelled'];

export async function POST(request) {
    const topic = request.headers.get('x-shopify-topic') || '';
    const shopDomain = request.headers.get('x-shopify-shop-domain') || '';
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256') || '';

    // Raw body is needed for HMAC before parsing.
    const rawBody = await request.text();

    const apiSecret = process.env.SHOPIFY_API_SECRET;
    if (apiSecret && hmacHeader) {
        const digest = createHmac('sha256', apiSecret).update(rawBody, 'utf8').digest('base64');
        if (digest !== hmacHeader) {
            console.warn('[Shopify Webhook] HMAC mismatch — rejected');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    if (!ORDER_TOPICS.includes(topic)) {
        return NextResponse.json({ success: true, message: `Topic ${topic} ignored` });
    }

    let shopifyOrder;
    try {
        shopifyOrder = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (!shopifyOrder?.id) {
        return NextResponse.json({ success: true, message: 'Ping received' });
    }

    const userId = await findUserByShopDomain(shopDomain);
    if (!userId) {
        console.error('[Shopify Webhook] No user found for shop:', shopDomain);
        return NextResponse.json({ error: 'Store not recognized' }, { status: 404 });
    }

    try {
        const result = await upsertShopifyOrder(userId, shopifyOrder, { topic, notify: true });
        console.log(`[Shopify Webhook] ${topic} | #${result.orderNumber} | ${result.status} | new=${result.isNewOrder} | user=${userId}`);
        return NextResponse.json({ success: true, ...result, topic });
    } catch (error) {
        console.error('[Shopify Webhook] Persist failed:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
