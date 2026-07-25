import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { whatsappService } from '@/lib/services/whatsappService';

export async function POST(request) {
    try {
        // 1. Get userId from query params
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            console.error('[WooCommerce Webhook] Missing userId in request query');
            return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
        }

        // Validate user existence and get user info
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .maybeSingle();

        if (userError || !user) {
            console.error(`[WooCommerce Webhook] User not found for ID: ${userId}`, userError);
            return NextResponse.json({ error: 'Unauthorized or invalid user' }, { status: 404 });
        }

        // 2. Parse WooCommerce webhook body
        let wcOrder;
        try {
            wcOrder = await request.json();
        } catch {
            return NextResponse.json({ success: true, message: 'Ping received' });
        }

        console.log(`[WooCommerce Webhook] Received webhook payload for order ${wcOrder?.id || 'unknown'} (User: ${userId})`);

        if (!wcOrder || !wcOrder.id) {
            return NextResponse.json({ success: true, message: 'Ping received' });
        }

        // 3. Normalize Order data
        const billing = wcOrder.billing || {};
        const customerName = `${billing.first_name || ''} ${billing.last_name || ''}`.trim() || 'Guest';
        const order = {
            id: wcOrder.id,
            number: (wcOrder.number || wcOrder.id).toString(),
            status: wcOrder.status,
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

        // 4. Upsert/Find Customer — works with email-only, phone-only, or both
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
                last_order_date: order.date
            };

            // Try matching by email first, then by phone
            let existingCustomer = null;
            if (order.customerEmail) {
                const { data } = await supabase
                    .from('customers')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('email', order.customerEmail)
                    .maybeSingle();
                existingCustomer = data;
            }
            if (!existingCustomer && order.customerPhone) {
                const { data } = await supabase
                    .from('customers')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('contact', order.customerPhone)
                    .maybeSingle();
                existingCustomer = data;
            }

            if (existingCustomer?.id) {
                customerId = existingCustomer.id;
                await supabase.from('customers').update(customerData).eq('id', existingCustomer.id);
            } else {
                const { data: newCustomer, error: customerInsertError } = await supabase
                    .from('customers')
                    .insert(customerData)
                    .select('id')
                    .single();
                if (customerInsertError) {
                    console.error('[WooCommerce Webhook] Customer insert error:', customerInsertError);
                } else {
                    customerId = newCustomer?.id;
                }
            }
        }

        // 5. Upsert Order
        const orderData = {
            user_id: userId,
            customer_id: customerId,
            order_id: order.number,
            platform_id: 1, // WooCommerce
            status: order.status,
            total_amount: order.total
        };

        const { data: existingOrder, error: checkError } = await supabase
            .from('orders')
            .select('id, status')
            .eq('user_id', userId)
            .eq('order_id', order.number)
            .maybeSingle();

        if (checkError) {
            console.error('[WooCommerce Webhook] Error checking existing order:', checkError);
        }

        let dbOrderId = null;
        let shouldTriggerNotification = false;

        if (existingOrder?.id) {
            dbOrderId = existingOrder.id;

            const { error: updateError } = await supabase
                .from('orders')
                .update(orderData)
                .eq('id', existingOrder.id);

            if (updateError) console.error('[WooCommerce Webhook] Error updating order:', updateError);

            // For existing orders, only notify on meaningful status changes (not new order)
            const oldStatus = existingOrder.status?.toLowerCase();
            const newStatus = order.status?.toLowerCase();
            if (oldStatus !== newStatus && ['processing', 'completed', 'cancelled', 'refunded', 'on-hold'].includes(newStatus)) {
                shouldTriggerNotification = true;
            }
        } else {
            // Insert new order
            const { data: newOrder, error: insertError } = await supabase
                .from('orders')
                .insert(orderData)
                .select('id')
                .single();

            if (insertError) {
                console.error('[WooCommerce Webhook] Error inserting new order:', insertError);
            } else {
                dbOrderId = newOrder?.id;
            }

            // Always trigger WA for new orders — any status
            shouldTriggerNotification = true;
        }

        // 6. Sync Order Items
        if (dbOrderId && order.items.length > 0) {
            const orderItems = [];
            for (const item of order.items) {
                let productId = null;
                
                // 1. Try finding by SKU if SKU is valid (not empty and not 'N/A')
                if (item.sku && item.sku !== 'N/A') {
                    const { data: product } = await supabase
                        .from('products')
                        .select('id')
                        .eq('user_id', userId)
                        .eq('sku', item.sku)
                        .maybeSingle();
                    
                    if (product?.id) {
                        productId = product.id;
                    }
                }
                
                // 2. If not found by SKU, try finding by Name
                if (!productId && item.name) {
                    const { data: product } = await supabase
                        .from('products')
                        .select('id')
                        .eq('user_id', userId)
                        .eq('name', item.name)
                        .maybeSingle();
                        
                    if (product?.id) {
                        productId = product.id;
                    }
                }

                orderItems.push({
                    order_id: dbOrderId,
                    product_id: productId,
                    quantity: item.quantity,
                    price: item.price
                });
            }

            // Clean up existing order items first
            if (existingOrder?.id) {
                await supabase
                    .from('order_items')
                    .delete()
                    .eq('order_id', dbOrderId);
            }

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (itemsError) {
                console.error('[WooCommerce Webhook] Error inserting order items:', itemsError);
            }
        }

        // 7. Merchant new-order alert (fires on every new order regardless of status)
        if (dbOrderId && !existingOrder?.id) {
            whatsappService.sendMerchantOrderAlert(userId, order.number, order.customerName, order.total)
                .catch(err => console.error('[WC webhook] Merchant WA alert error:', err));
        }

        // 8. Fire WhatsApp customer notification
        if (shouldTriggerNotification && order.customerPhone) {
            console.log(`[WooCommerce Webhook] Firing WA for order ${order.number} (status: ${order.status})`);
            try {
                if (!existingOrder?.id) {
                    // New order → order_created template + creates wa_pending_orders for YES/NO flow
                    whatsappService.sendOrderCreated(userId, {
                        customerPhone: order.customerPhone,
                        customerName: order.customerName,
                        orderNumber: order.number,
                        total: order.total,
                        deliveryAddress: wcOrder.shipping?.address_1 || wcOrder.billing?.address_1 || 'N/A',
                        cityName: wcOrder.shipping?.city || wcOrder.billing?.city || 'Karachi',
                        orderDetail: (wcOrder.line_items || []).map(i => i.name).join(', ') || '',
                    }).catch(err => console.error('[WC webhook] sendOrderCreated error:', err.message));
                } else {
                    // Existing order status changed → status-based template
                    whatsappService.sendOrderStatusUpdate(
                        userId, order.number, order.status,
                        order.customerPhone, order.customerName, order.total
                    ).catch(err => console.error('[WC webhook] sendOrderStatusUpdate error:', err.message));
                }
            } catch (err) {
                console.error('[WooCommerce Webhook] WhatsApp notification error:', err.message);
            }
        } else if (!order.customerPhone) {
            console.warn(`[WooCommerce Webhook] Order ${order.number} has no customer phone — WA skipped`);
        }

        return NextResponse.json({ success: true, dbOrderId, status: order.status });

    } catch (error) {
        console.error('[WooCommerce Webhook Error]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
