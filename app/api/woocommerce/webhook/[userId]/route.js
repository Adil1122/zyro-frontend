import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { whatsappService } from '@/lib/services/whatsappService';

export async function POST(request, { params }) {
    try {
        const { userId } = await params;

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        // Validate user
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .maybeSingle();

        if (userError || !user) {
            return NextResponse.json({ error: 'Invalid user' }, { status: 404 });
        }

        // Parse WooCommerce webhook body
        let wcOrder;
        try {
            wcOrder = await request.json();
        } catch {
            return NextResponse.json({ success: true, message: 'Ping received' });
        }

        if (!wcOrder || !wcOrder.id) {
            return NextResponse.json({ success: true, message: 'Ping received' });
        }

        console.log(`[WC Webhook] Order ${wcOrder?.id} received for user ${userId}`);

        // Normalize order data
        const billing = wcOrder.billing || {};
        const customerName = `${billing.first_name || ''} ${billing.last_name || ''}`.trim() || 'Guest';
        const order = {
            number: (wcOrder.number || wcOrder.id).toString(),
            status: (wcOrder.status || '').replace(/^wc-/, ''),
            date: wcOrder.date_created || new Date().toISOString(),
            customerName,
            customerEmail: billing.email || '',
            customerPhone: billing.phone || '',
            city: billing.city || '',
            total: parseFloat(wcOrder.total || 0),
            items: (wcOrder.line_items || []).map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: parseFloat(item.price || 0),
                sku: item.sku || '',
            })),
        };

        // Upsert customer
        let customerId = null;
        if (order.customerEmail || order.customerPhone) {
            const customerData = {
                user_id: userId,
                name: order.customerName,
                email: order.customerEmail || null,
                contact: order.customerPhone || order.customerEmail,
                city: order.city,
                total_orders: 1,
                total_spent: order.total,
                status: 'active',
                last_order_date: order.date,
            };

            let existing = null;
            if (order.customerEmail) {
                const { data } = await supabase.from('customers').select('id')
                    .eq('user_id', userId).eq('email', order.customerEmail).maybeSingle();
                existing = data;
            }
            if (!existing && order.customerPhone) {
                const { data } = await supabase.from('customers').select('id')
                    .eq('user_id', userId).eq('contact', order.customerPhone).maybeSingle();
                existing = data;
            }

            if (existing?.id) {
                customerId = existing.id;
                await supabase.from('customers').update(customerData).eq('id', existing.id);
            } else {
                const { data: newCust, error: custErr } = await supabase
                    .from('customers').insert(customerData).select('id').single();
                if (custErr) console.error('[WC Webhook] Customer insert error:', custErr);
                else customerId = newCust?.id;
            }
        }

        // Check existing order
        const { data: existingOrder } = await supabase
            .from('orders').select('id, status')
            .eq('user_id', userId).eq('order_id', order.number).maybeSingle();

        const isNewOrder = !existingOrder?.id;
        const oldStatus = existingOrder?.status?.toLowerCase() || null;
        const newStatus = order.status?.toLowerCase();
        const NOTIFIABLE = ['processing', 'completed', 'cancelled', 'refunded', 'on-hold', 'failed'];

        const orderData = {
            user_id: userId,
            customer_id: customerId,
            order_id: order.number,
            platform_id: 1,
            status: order.status,
            total_amount: order.total,
        };

        let dbOrderId = null;
        let shouldTriggerNotification = false;

        if (isNewOrder) {
            const { data: newOrder, error: insertErr } = await supabase
                .from('orders').insert(orderData).select('id').single();
            if (insertErr) console.error('[WC Webhook] Order insert error:', insertErr);
            else { dbOrderId = newOrder?.id; shouldTriggerNotification = true; }
        } else {
            dbOrderId = existingOrder.id;
            await supabase.from('orders').update(orderData).eq('id', existingOrder.id);
            if (NOTIFIABLE.includes(newStatus) && oldStatus !== newStatus) {
                shouldTriggerNotification = true;
            }
        }

        console.log(`[WC Webhook] #${order.number} isNew=${isNewOrder} | ${oldStatus} → ${newStatus} | notify=${shouldTriggerNotification}`);

        // Sync order items
        if (dbOrderId && order.items.length > 0) {
            const orderItems = [];
            for (const item of order.items) {
                let productId = null;
                if (item.sku && item.sku !== 'N/A') {
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
            if (!isNewOrder) await supabase.from('order_items').delete().eq('order_id', dbOrderId);
            await supabase.from('order_items').insert(orderItems);
        }

        // Merchant alert on new order
        if (dbOrderId && isNewOrder) {
            await whatsappService.sendMerchantOrderAlert(userId, order.number, order.customerName, order.total)
                .catch(err => console.error('[WC Webhook] Merchant WA error:', err));
        }

        // Customer WhatsApp notification
        let customerPhone = order.customerPhone;
        if (!customerPhone && customerId) {
            const { data: c } = await supabase.from('customers').select('contact').eq('id', customerId).maybeSingle();
            customerPhone = c?.contact || '';
        }

        if (shouldTriggerNotification && customerPhone) {
            const useOrderCreated = isNewOrder && !['cancelled', 'refunded', 'completed'].includes(newStatus);
            if (useOrderCreated) {
                await whatsappService.sendOrderCreated(userId, {
                    customerPhone,
                    customerName: order.customerName,
                    orderNumber: order.number,
                    total: order.total,
                    deliveryAddress: wcOrder.shipping?.address_1 || billing.address_1 || 'N/A',
                    cityName: wcOrder.shipping?.city || billing.city || '',
                    orderDetail: (wcOrder.line_items || []).map(i => i.name).join(', ') || '',
                }).catch(err => console.error('[WC Webhook] sendOrderCreated error:', err.message));
            } else {
                await whatsappService.sendOrderStatusUpdate(
                    userId, order.number, newStatus, customerPhone, order.customerName, order.total
                ).catch(err => console.error('[WC Webhook] sendOrderStatusUpdate error:', err.message));
            }
        } else if (!customerPhone) {
            console.warn(`[WC Webhook] No phone for order ${order.number} — WA skipped`);
        }

        return NextResponse.json({ success: true, dbOrderId, status: order.status });

    } catch (error) {
        console.error('[WC Webhook Error]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
