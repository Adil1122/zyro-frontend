import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { upsertShopifyOrder, findUserByShopDomain } from '@/lib/services/shopifyOrderSync';
import { applyInboundInventoryLevel } from '@/lib/services/shopifyInventory';

export const maxDuration = 60;

const ORDER_TOPICS = ['orders/create', 'orders/updated', 'orders/fulfilled', 'orders/cancelled'];
const INVENTORY_TOPIC = 'inventory_levels/update';

export async function POST(request) {
    const topic = request.headers.get('x-shopify-topic') || '';
    const shopDomain = request.headers.get('x-shopify-shop-domain') || '';
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256') || '';

    // Raw body is needed for HMAC before parsing.
    const rawBody = await request.text();

    // Logged before any work, so the absence of this line means Shopify never
    // delivered — as opposed to delivering and being dropped further down.
    console.log(`[Shopify Webhook] received topic=${topic} shop=${shopDomain} bytes=${rawBody.length} hmac=${hmacHeader ? 'yes' : 'no'}`);

    const apiSecret = process.env.SHOPIFY_API_SECRET;
    if (apiSecret && hmacHeader) {
        const digest = createHmac('sha256', apiSecret).update(rawBody, 'utf8').digest('base64');
        if (digest !== hmacHeader) {
            console.warn(`[Shopify Webhook] HMAC mismatch — rejected (topic=${topic} shop=${shopDomain}). SHOPIFY_API_SECRET likely belongs to a different app than the one installed.`);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    const isOrderTopic = ORDER_TOPICS.includes(topic);
    const isInventoryTopic = topic === INVENTORY_TOPIC;

    if (!isOrderTopic && !isInventoryTopic) {
        return NextResponse.json({ success: true, message: `Topic ${topic} ignored` });
    }

    let payload;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const userId = await findUserByShopDomain(shopDomain);
    console.log(`[Shopify Webhook] resolved user=${userId || 'NONE'} for shop=${shopDomain}`);
    if (!userId) {
        console.error('[Shopify Webhook] No user found for shop:', shopDomain);
        return NextResponse.json({ error: 'Store not recognized' }, { status: 404 });
    }

    // Stock edited in the Shopify admin — mirror it onto our product row.
    // Our own pushes echo back here; applyInboundInventoryLevel no-ops when the
    // numbers already agree, so the loop terminates.
    if (isInventoryTopic) {
        if (!payload?.inventory_item_id) {
            return NextResponse.json({ success: true, message: 'Ping received' });
        }
        try {
            const result = await applyInboundInventoryLevel(userId, payload.inventory_item_id, payload.available);
            return NextResponse.json({ success: true, topic, result });
        } catch (error) {
            console.error('[Shopify Webhook] Inventory sync failed:', error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
    }

    if (!payload?.id) {
        return NextResponse.json({ success: true, message: 'Ping received' });
    }

    try {
        // applyStock: Shopify has already decremented its own stock for this sale,
        // so we mirror it locally and deliberately do not push back.
        const result = await upsertShopifyOrder(userId, payload, { topic, notify: true, applyStock: true });
        console.log(`[Shopify Webhook] ${topic} | #${result.orderNumber} | ${result.status} | new=${result.isNewOrder} | user=${userId}`);
        return NextResponse.json({ success: true, ...result, topic });
    } catch (error) {
        console.error('[Shopify Webhook] Persist failed:', error.message, error.stack);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
