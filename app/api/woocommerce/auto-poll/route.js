import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { whatsappService } from '@/lib/services/whatsappService';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

// Vercel cron calls this with a GET; also allow POST for manual trigger
export const dynamic = 'force-dynamic';

async function pollUser(user) {
    const { id: userId, wc_store_url, wc_consumer_key, wc_consumer_secret } = user;

    const api = new WooCommerceRestApi({
        url: wc_store_url,
        consumerKey: wc_consumer_key,
        consumerSecret: wc_consumer_secret,
        version: 'wc/v3',
        queryStringAuth: true,
    });

    const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    let wcOrders = [];
    try {
        // Fetch newly created orders
        const newRes = await api.get('orders', { after: windowStart, per_page: 20, orderby: 'date', order: 'desc', status: 'any' });
        // Fetch recently modified orders (catches status changes like cancellations)
        const modRes = await api.get('orders', { modified_after: windowStart, per_page: 20, orderby: 'modified', order: 'desc', status: 'any' });
        // Merge and deduplicate by order ID
        const seen = new Set();
        for (const o of [...(newRes.data || []), ...(modRes.data || [])]) {
            const key = (o.number || o.id).toString();
            if (!seen.has(key)) { seen.add(key); wcOrders.push(o); }
        }
    } catch (err) {
        console.error(`[WC Poll] API error for user ${userId}:`, err.message);
        return { userId, error: err.message };
    }

    if (wcOrders.length === 0) return { userId, newOrders: 0, updatedOrders: 0 };

    let newCount = 0;
    let updatedCount = 0;
    const waResults = [];
    const NOTIFIABLE = ['processing', 'completed', 'cancelled', 'refunded', 'on-hold', 'failed'];

    for (const wcOrder of wcOrders) {
        const orderNumber = (wcOrder.number || wcOrder.id).toString();

        const { data: existing } = await supabase
            .from('orders').select('id, status')
            .eq('user_id', userId).eq('order_id', orderNumber).maybeSingle();
        const isNewOrder = !existing?.id;
        const oldStatus = existing?.status?.toLowerCase().replace(/^wc-/, '') || null;
        const newStatus = (wcOrder.status || '').replace(/^wc-/, '').toLowerCase();

        // Skip if already in DB and status hasn't changed
        if (!isNewOrder && oldStatus === newStatus) continue;

        const billing = wcOrder.billing || {};
        const customerName = `${billing.first_name || ''} ${billing.last_name || ''}`.trim() || 'Guest';
        const customerPhone = billing.phone || '';
        const customerEmail = billing.email || '';
        const orderTotal = parseFloat(wcOrder.total || 0);
        const orderStatus = (wcOrder.status || '').replace(/^wc-/, '');
        const orderDate = wcOrder.date_created || new Date().toISOString();

        // Upsert customer
        let customerId = null;
        if (customerEmail || customerPhone) {
            const customerData = {
                user_id: userId,
                name: customerName,
                email: customerEmail || null,
                contact: customerPhone || customerEmail,
                city: billing.city || '',
                total_orders: 1,
                total_spent: orderTotal,
                status: 'active',
                last_order_date: orderDate,
            };

            let existingCust = null;
            if (customerEmail) {
                const { data } = await supabase.from('customers').select('id')
                    .eq('user_id', userId).eq('email', customerEmail).maybeSingle();
                existingCust = data;
            }
            if (!existingCust && customerPhone) {
                const { data } = await supabase.from('customers').select('id')
                    .eq('user_id', userId).eq('contact', customerPhone).maybeSingle();
                existingCust = data;
            }

            if (existingCust?.id) {
                customerId = existingCust.id;
                await supabase.from('customers').update(customerData).eq('id', existingCust.id);
            } else {
                const { data: newCust } = await supabase.from('customers').insert(customerData).select('id').single();
                customerId = newCust?.id || null;
            }
        }

        // Upsert order
        let dbOrderId;
        const orderPayload = { user_id: userId, customer_id: customerId, order_id: orderNumber, platform_id: 1, status: newStatus, total_amount: orderTotal };
        if (isNewOrder) {
            const { data: newOrder, error: insertErr } = await supabase.from('orders').insert(orderPayload).select('id').single();
            if (insertErr) { console.error(`[WC Poll] Order insert error #${orderNumber}:`, insertErr.message); continue; }
            dbOrderId = newOrder.id;
            newCount++;
        } else {
            await supabase.from('orders').update({ status: newStatus, total_amount: orderTotal }).eq('id', existing.id);
            dbOrderId = existing.id;
            updatedCount++;
        }

        // Sync order items for new orders
        const items = wcOrder.line_items || [];
        if (isNewOrder && items.length > 0) {
            const orderItems = [];
            for (const item of items) {
                let productId = null;
                if (item.sku) {
                    const { data: p } = await supabase.from('products').select('id').eq('user_id', userId).eq('sku', item.sku).maybeSingle();
                    productId = p?.id || null;
                }
                if (!productId && item.name) {
                    const { data: p } = await supabase.from('products').select('id').eq('user_id', userId).eq('name', item.name).maybeSingle();
                    productId = p?.id || null;
                }
                orderItems.push({ order_id: dbOrderId, product_id: productId, quantity: item.quantity, price: parseFloat(item.price || 0) });
            }
            await supabase.from('order_items').insert(orderItems);
        }

        console.log(`[WC Poll] #${orderNumber} isNew=${isNewOrder} | ${oldStatus} → ${newStatus} | user ${userId}`);

        // Resolve phone — use billing.phone first, fall back to DB customer record
        let resolvedPhone = customerPhone;
        if (!resolvedPhone && customerId) {
            const { data: c } = await supabase.from('customers').select('contact').eq('id', customerId).maybeSingle();
            resolvedPhone = c?.contact || '';
        }
        if (!resolvedPhone && existing?.id) {
            const { data: dbOrder } = await supabase
                .from('orders').select('customer_id').eq('id', existing.id).maybeSingle();
            if (dbOrder?.customer_id) {
                const { data: c } = await supabase.from('customers').select('contact').eq('id', dbOrder.customer_id).maybeSingle();
                resolvedPhone = c?.contact || '';
            }
        }

        console.log(`[WC Poll] #${orderNumber} phone=${resolvedPhone || 'MISSING'} isNew=${isNewOrder} ${oldStatus}→${newStatus}`);

        // WhatsApp notifications
        if (isNewOrder) {
            const merchantResult = await whatsappService.sendMerchantOrderAlert(userId, orderNumber, customerName, orderTotal)
                .catch(err => ({ success: false, error: err.message }));
            waResults.push({ order: orderNumber, type: 'merchant', ...merchantResult });

            if (resolvedPhone && !['cancelled', 'refunded', 'failed'].includes(newStatus)) {
                const shipping = wcOrder.shipping || {};
                const customerResult = await whatsappService.sendOrderCreated(userId, {
                    customerPhone: resolvedPhone, customerName, orderNumber, total: orderTotal,
                    deliveryAddress: shipping.address_1 || billing.address_1 || 'N/A',
                    cityName: shipping.city || billing.city || '',
                    orderDetail: items.map(i => i.name).join(', ') || '',
                }).catch(err => ({ success: false, error: err.message }));
                waResults.push({ order: orderNumber, type: 'customer', phone: resolvedPhone, ...customerResult });
            }
        } else if (NOTIFIABLE.includes(newStatus)) {
            if (resolvedPhone) {
                const statusResult = await whatsappService.sendOrderStatusUpdate(userId, orderNumber, newStatus, resolvedPhone, customerName, orderTotal)
                    .catch(err => ({ success: false, error: err.message }));
                waResults.push({ order: orderNumber, type: 'status_update', status: newStatus, phone: resolvedPhone, ...statusResult });
            } else {
                waResults.push({ order: orderNumber, type: 'status_update', skipped: 'no_phone' });
            }
        }
    }

    return { userId, newOrders: newCount, updatedOrders: updatedCount, checked: wcOrders.length, waResults };
}

export async function GET(request) {
    try {
        // Find all users with WooCommerce configured and WhatsApp active
        const { data: users, error } = await supabase
            .from('users')
            .select('id, wc_store_url, wc_consumer_key, wc_consumer_secret')
            .not('wc_store_url', 'is', null)
            .not('wc_consumer_key', 'is', null)
            .not('wc_consumer_secret', 'is', null)
            .eq('wa_is_active', true);

        if (error) throw error;
        if (!users || users.length === 0) {
            return NextResponse.json({ message: 'No eligible users', results: [] });
        }

        const results = await Promise.all(users.map(u => pollUser(u)));
        const total = results.reduce((sum, r) => sum + (r.newOrders || 0) + (r.updatedOrders || 0), 0);

        console.log(`[WC Poll] Done. ${total} new/updated orders across ${users.length} users.`);
        return NextResponse.json({ success: true, total, results });

    } catch (err) {
        console.error('[WC Poll] Fatal error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// Also allow manual POST trigger from the dashboard
export async function POST(request) {
    return GET(request);
}
