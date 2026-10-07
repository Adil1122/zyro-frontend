import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabase } from '@/lib/supabase';
import { whatsappService } from '@/lib/services/whatsappService';
import { applyOrderStock } from '@/lib/services/shopifyInventory';

const PLATFORM_ID = 6; // Shopify
const NOTIFIABLE = ['processing', 'completed', 'delivered', 'cancelled', 'refunded'];

function db() {
    return supabaseAdmin || supabase;
}

export function mapShopifyStatus(order, topic = '') {
    if (topic === 'orders/cancelled' || order.cancel_reason) return 'cancelled';
    if (order.fulfillment_status === 'fulfilled') return 'delivered';
    if (order.fulfillment_status === 'partial') return 'processing';
    if (order.financial_status === 'paid') return 'processing';
    return 'pending';
}

export async function findUserByShopDomain(shopDomain) {
    const clean = shopDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const { data } = await db()
        .from('users')
        .select('id')
        .ilike('shopify_store_domain', clean)
        .maybeSingle();
    return data?.id || null;
}

/**
 * Writes one Shopify order (plus its customer and line items) into the dashboard tables.
 * Shared by the live webhook and the historical backfill.
 *
 * notify must stay false for backfill, or every past customer is sent a WhatsApp
 * message about an order they placed long ago.
 */
export async function upsertShopifyOrder(userId, shopifyOrder, { topic = '', notify = false, applyStock = false } = {}) {
    const client = db();

    const customer = shopifyOrder.customer || {};
    const billing = shopifyOrder.billing_address || {};
    const shipping = shopifyOrder.shipping_address || {};
    const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Guest';
    const customerEmail = customer.email || billing.email || '';
    const customerPhone = customer.phone || billing.phone || shipping.phone || '';
    const city = shipping.city || billing.city || '';
    const orderNumber = (shopifyOrder.name || `#${shopifyOrder.order_number || shopifyOrder.id}`).replace(/^#/, '');
    const status = mapShopifyStatus(shopifyOrder, topic);
    const total = parseFloat(shopifyOrder.total_price || 0);

    const lineItems = (shopifyOrder.line_items || []).map(item => ({
        name: item.name || item.title || '',
        quantity: item.quantity || 1,
        price: parseFloat(item.price || 0),
        sku: item.sku || '',
        variant: item.variant_title || '',
    }));

    let customerId = null;
    if (customerEmail || customerPhone) {
        const customerData = {
            user_id: userId,
            name: customerName,
            email: customerEmail || null,
            contact: customerPhone || customerEmail,
            city,
            total_orders: 1,
            total_spent: total,
            status: 'active',
            last_order_date: shopifyOrder.created_at,
        };

        let existing = null;
        if (customerEmail) {
            const { data } = await client.from('customers').select('id')
                .eq('user_id', userId).eq('email', customerEmail).maybeSingle();
            existing = data;
        }
        if (!existing && customerPhone) {
            const { data } = await client.from('customers').select('id')
                .eq('user_id', userId).eq('contact', customerPhone).maybeSingle();
            existing = data;
        }

        if (existing?.id) {
            customerId = existing.id;
            await client.from('customers').update(customerData).eq('id', existing.id);
        } else {
            const { data: newCust } = await client.from('customers').insert(customerData).select('id').single();
            customerId = newCust?.id;
        }
    }

    const { data: existingOrder } = await client
        .from('orders')
        .select('id, status')
        .eq('user_id', userId)
        .eq('order_id', orderNumber)
        .maybeSingle();

    const isNewOrder = !existingOrder?.id;
    const oldStatus = existingOrder?.status?.toLowerCase() || null;
    const newStatus = status.toLowerCase();

    const orderData = {
        user_id: userId,
        customer_id: customerId,
        order_id: orderNumber,
        platform_id: PLATFORM_ID,
        status,
        total_amount: total,
    };

    let dbOrderId = null;
    let shouldNotify = false;

    if (isNewOrder) {
        // The Orders page and the dashboard's revenue charts filter and sort on
        // created_at, so it has to carry the date Shopify placed the order. Left to
        // default, a backfill would stamp every historical order with the import
        // time and collapse all past revenue onto one day.
        const insertData = { ...orderData };
        if (shopifyOrder.created_at) insertData.created_at = shopifyOrder.created_at;

        const { data: newOrder, error } = await client.from('orders').insert(insertData).select('id').single();
        if (error) throw new Error(`Order insert failed: ${error.message}`);
        dbOrderId = newOrder?.id;
        shouldNotify = true;
    } else {
        dbOrderId = existingOrder.id;
        await client.from('orders').update(orderData).eq('id', existingOrder.id);
        if (NOTIFIABLE.includes(newStatus) && oldStatus !== newStatus) shouldNotify = true;
    }

    const orderItems = [];
    if (dbOrderId && lineItems.length > 0) {
        for (const item of lineItems) {
            let productId = null;
            if (item.sku) {
                const { data: p } = await client.from('products').select('id')
                    .eq('user_id', userId).eq('sku', item.sku).maybeSingle();
                productId = p?.id || null;
            }
            if (!productId && item.name) {
                const { data: p } = await client.from('products').select('id')
                    .eq('user_id', userId).eq('name', item.name).maybeSingle();
                productId = p?.id || null;
            }
            orderItems.push({ order_id: dbOrderId, product_id: productId, quantity: item.quantity, price: item.price });
        }
        if (!isNewOrder) {
            await client.from('order_items').delete().eq('order_id', dbOrderId);
        }
        await client.from('order_items').insert(orderItems);
    }

    // Stock moves only for live sales. Backfilled history is already reflected in
    // the store's current stock, so decrementing it would double-count.
    let stockResults = [];
    if (applyStock && isNewOrder && orderItems.length) {
        try {
            stockResults = await applyOrderStock(
                userId,
                orderItems.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
                `shopify:order:${orderNumber}`,
            );
        } catch (e) {
            console.error('[Shopify Sync] Stock update failed:', orderNumber, e.message);
        }
    }

    if (!notify) {
        return { dbOrderId, isNewOrder, status, orderNumber, stockResults };
    }

    if (dbOrderId && isNewOrder) {
        await whatsappService.sendMerchantOrderAlert(userId, orderNumber, customerName, total)
            .catch(err => console.error('[Shopify Sync] Merchant WA alert error:', err));
    }

    let phone = customerPhone;
    if (!phone && customerId) {
        const { data: c } = await client.from('customers').select('contact').eq('id', customerId).maybeSingle();
        phone = c?.contact || '';
    }

    if (shouldNotify && phone) {
        const useOrderCreated = isNewOrder && !['cancelled', 'delivered'].includes(newStatus);
        if (useOrderCreated) {
            await whatsappService.sendOrderCreated(userId, {
                customerPhone: phone,
                customerName,
                orderNumber,
                total,
                deliveryAddress: shipping.address1 || billing.address1 || 'N/A',
                cityName: shipping.city || billing.city || '',
                orderDetail: lineItems.map(i => i.name).join(', '),
            }).catch(err => console.error('[Shopify Sync] sendOrderCreated error:', err.message));
        } else {
            await whatsappService.sendOrderStatusUpdate(userId, orderNumber, newStatus, phone, customerName, total)
                .catch(err => console.error('[Shopify Sync] sendOrderStatusUpdate error:', err.message));
        }
    }

    return { dbOrderId, isNewOrder, status, orderNumber, stockResults };
}
