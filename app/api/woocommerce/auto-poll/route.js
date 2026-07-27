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

    // Fetch orders created in the last 15 minutes
    const after = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    let wcOrders;
    try {
        const res = await api.get('orders', { after, per_page: 20, orderby: 'date', order: 'desc', status: 'any' });
        wcOrders = res.data || [];
    } catch (err) {
        console.error(`[WC Poll] API error for user ${userId}:`, err.message);
        return { userId, error: err.message };
    }

    if (wcOrders.length === 0) return { userId, newOrders: 0 };

    let newCount = 0;

    for (const wcOrder of wcOrders) {
        const orderNumber = (wcOrder.number || wcOrder.id).toString();

        // Skip if already in DB
        const { data: existing } = await supabase
            .from('orders').select('id')
            .eq('user_id', userId).eq('order_id', orderNumber).maybeSingle();
        if (existing?.id) continue;

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

        // Insert order
        const { data: newOrder, error: insertErr } = await supabase
            .from('orders')
            .insert({
                user_id: userId,
                customer_id: customerId,
                order_id: orderNumber,
                platform_id: 1,
                status: orderStatus,
                total_amount: orderTotal,
            })
            .select('id').single();

        if (insertErr) {
            console.error(`[WC Poll] Order insert error for #${orderNumber}:`, insertErr.message);
            continue;
        }

        const dbOrderId = newOrder.id;

        // Insert order items
        const items = wcOrder.line_items || [];
        if (items.length > 0) {
            const orderItems = [];
            for (const item of items) {
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
                orderItems.push({ order_id: dbOrderId, product_id: productId, quantity: item.quantity, price: parseFloat(item.price || 0) });
            }
            await supabase.from('order_items').insert(orderItems);
        }

        console.log(`[WC Poll] New order #${orderNumber} saved for user ${userId}`);
        newCount++;

        // Merchant WhatsApp alert
        await whatsappService.sendMerchantOrderAlert(userId, orderNumber, customerName, orderTotal)
            .catch(err => console.error(`[WC Poll] Merchant WA error for #${orderNumber}:`, err.message));

        // Customer WhatsApp notification
        if (customerPhone) {
            const shipping = wcOrder.shipping || {};
            await whatsappService.sendOrderCreated(userId, {
                customerPhone,
                customerName,
                orderNumber,
                total: orderTotal,
                deliveryAddress: shipping.address_1 || billing.address_1 || 'N/A',
                cityName: shipping.city || billing.city || '',
                orderDetail: items.map(i => i.name).join(', ') || '',
            }).catch(err => console.error(`[WC Poll] sendOrderCreated error for #${orderNumber}:`, err.message));
        }
    }

    return { userId, newOrders: newCount, checked: wcOrders.length };
}

export async function GET(request) {
    // Vercel cron passes the CRON_SECRET as Authorization header
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        const total = results.reduce((sum, r) => sum + (r.newOrders || 0), 0);

        console.log(`[WC Poll] Done. ${total} new orders across ${users.length} users.`);
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
