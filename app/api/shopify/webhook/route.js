import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { supabase } from '@/lib/supabase';
import { whatsappService } from '@/lib/services/whatsappService';

const PLATFORM_ID = 6; // Shopify

function mapShopifyStatus(order, topic) {
    if (topic === 'orders/cancelled' || order.cancel_reason) return 'cancelled';
    if (order.fulfillment_status === 'fulfilled') return 'delivered';
    if (order.fulfillment_status === 'partial') return 'processing';
    if (order.financial_status === 'paid') return 'processing';
    return 'pending';
}

export async function POST(request) {
    const topic = request.headers.get('x-shopify-topic') || '';
    const shopDomain = request.headers.get('x-shopify-shop-domain') || '';
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256') || '';

    // Read raw body first (needed for HMAC before JSON.parse)
    const rawBody = await request.text();

    // Verify HMAC
    const apiSecret = process.env.SHOPIFY_API_SECRET;
    if (apiSecret && hmacHeader) {
        const digest = createHmac('sha256', apiSecret).update(rawBody, 'utf8').digest('base64');
        if (digest !== hmacHeader) {
            console.warn('[Shopify Webhook] HMAC mismatch — rejected');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    // Only handle order topics
    const ORDER_TOPICS = ['orders/create', 'orders/updated', 'orders/fulfilled', 'orders/cancelled'];
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

    // Find the user by their connected shop domain
    const cleanDomain = shopDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .ilike('shopify_store_domain', cleanDomain)
        .maybeSingle();

    if (userError || !user) {
        console.error('[Shopify Webhook] No user found for shop:', cleanDomain);
        return NextResponse.json({ error: 'Store not recognized' }, { status: 404 });
    }

    const userId = user.id;

    // Normalize order data from Shopify format
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

    // Upsert customer
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
            const { data } = await supabase.from('customers').select('id')
                .eq('user_id', userId).eq('email', customerEmail).maybeSingle();
            existing = data;
        }
        if (!existing && customerPhone) {
            const { data } = await supabase.from('customers').select('id')
                .eq('user_id', userId).eq('contact', customerPhone).maybeSingle();
            existing = data;
        }

        if (existing?.id) {
            customerId = existing.id;
            await supabase.from('customers').update(customerData).eq('id', existing.id);
        } else {
            const { data: newCust } = await supabase.from('customers').insert(customerData).select('id').single();
            customerId = newCust?.id;
        }
    }

    // Check existing order
    const { data: existingOrder } = await supabase
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
    const NOTIFIABLE = ['processing', 'completed', 'delivered', 'cancelled', 'refunded'];

    if (isNewOrder) {
        const { data: newOrder } = await supabase.from('orders').insert(orderData).select('id').single();
        dbOrderId = newOrder?.id;
        shouldNotify = true;
    } else {
        dbOrderId = existingOrder.id;
        await supabase.from('orders').update(orderData).eq('id', existingOrder.id);
        if (NOTIFIABLE.includes(newStatus) && oldStatus !== newStatus) {
            shouldNotify = true;
        }
    }

    console.log(`[Shopify Webhook] ${topic} | #${orderNumber} | ${oldStatus} → ${newStatus} | new=${isNewOrder} | user=${userId}`);

    // Sync order items
    if (dbOrderId && lineItems.length > 0) {
        const orderItems = [];
        for (const item of lineItems) {
            let productId = null;
            if (item.sku) {
                const { data: p } = await supabase.from('products').select('id')
                    .eq('user_id', userId).eq('sku', item.sku).maybeSingle();
                productId = p?.id || null;
            }
            if (!productId && item.name) {
                const { data: p } = await supabase.from('products').select('id')
                    .eq('user_id', userId).eq('name', item.name).maybeSingle();
                productId = p?.id || null;
            }
            orderItems.push({ order_id: dbOrderId, product_id: productId, quantity: item.quantity, price: item.price });
        }
        if (!isNewOrder) {
            await supabase.from('order_items').delete().eq('order_id', dbOrderId);
        }
        await supabase.from('order_items').insert(orderItems);
    }

    // Merchant alert on new order
    if (dbOrderId && isNewOrder) {
        await whatsappService.sendMerchantOrderAlert(userId, orderNumber, customerName, total)
            .catch(err => console.error('[Shopify Webhook] Merchant WA alert error:', err));
    }

    // Customer WhatsApp notification
    let phone = customerPhone;
    if (!phone && customerId) {
        const { data: c } = await supabase.from('customers').select('contact').eq('id', customerId).maybeSingle();
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
            }).catch(err => console.error('[Shopify Webhook] sendOrderCreated error:', err.message));
        } else {
            await whatsappService.sendOrderStatusUpdate(userId, orderNumber, newStatus, phone, customerName, total)
                .catch(err => console.error('[Shopify Webhook] sendOrderStatusUpdate error:', err.message));
        }
    }

    return NextResponse.json({ success: true, dbOrderId, status, topic });
}
