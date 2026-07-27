import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { whatsappService } from '@/lib/services/whatsappService';
import { getDarazOrderById, getCredentials, isDarazConfigured } from '@/lib/services/darazService';

export const dynamic = 'force-dynamic';

// Order statuses that trigger customer WhatsApp
const NOTIFIABLE = ['processing', 'packed', 'shipped', 'delivered', 'cancelled', 'returned'];

export async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    console.log('[Daraz Webhook] Raw payload:', JSON.stringify(body));

    // Parse event type and seller identifier
    const event = body.event || body.type || '';
    const sellerId = String(body.sellerId || body.seller_id || body.userID || '');

    // Decode base64 data field if present
    let eventData = {};
    if (body.data) {
        try {
            const decoded = Buffer.from(String(body.data), 'base64').toString('utf-8');
            eventData = JSON.parse(decoded);
        } catch {
            eventData = typeof body.data === 'object' ? body.data : {};
        }
    }

    const orderId = String(
        eventData.tradeOrderId || eventData.order_id || eventData.orderId ||
        body.tradeOrderId || body.order_id || ''
    );

    console.log('[Daraz Webhook] event:', event, '| sellerId:', sellerId, '| orderId:', orderId);

    // Acknowledge immediately (Daraz expects fast response)
    if (!orderId) {
        return NextResponse.json({ success: true, note: 'no_order_id_in_payload' });
    }

    // Find the Zyro user for this seller
    let user = null;

    if (sellerId) {
        const { data } = await supabase.from('users')
            .select('*')
            .eq('daraz_seller_id', sellerId)
            .maybeSingle();
        user = data;
    }

    // Fallback: single active Daraz user
    if (!user) {
        const { data } = await supabase.from('users')
            .select('*')
            .eq('daraz_is_active', true)
            .not('daraz_access_token', 'is', null)
            .limit(1)
            .maybeSingle();
        user = data;
    }

    if (!user || !isDarazConfigured(user)) {
        console.warn('[Daraz Webhook] No matching configured user for sellerId:', sellerId);
        return NextResponse.json({ success: true, note: 'no_user_found' });
    }

    const userId = user.id;
    const creds = getCredentials(user);

    // Fetch full order details from Daraz
    let order;
    try {
        order = await getDarazOrderById(orderId, creds);
    } catch (err) {
        console.error('[Daraz Webhook] Failed to fetch order:', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 200 }); // 200 so Daraz doesn't retry
    }

    if (!order) {
        return NextResponse.json({ success: true, note: 'order_not_found' });
    }

    const orderNumber = String(order.number || order.id);
    const newStatus = order.status?.toLowerCase() || 'pending';
    const customerName = order.customerName || 'Guest';
    const customerPhone = order.customerPhone || '';
    const orderTotal = order.total || 0;

    // Check if order already exists in DB
    const { data: existing } = await supabase
        .from('orders').select('id, status')
        .eq('user_id', userId).eq('order_id', orderNumber).maybeSingle();

    const isNewOrder = !existing?.id;
    const oldStatus = existing?.status?.toLowerCase() || null;

    if (!isNewOrder && oldStatus === newStatus) {
        return NextResponse.json({ success: true, note: 'no_change' });
    }

    // Upsert customer
    let customerId = null;
    if (order.customerEmail || customerPhone) {
        const customerData = {
            user_id: userId,
            name: customerName,
            email: order.customerEmail || null,
            contact: customerPhone || order.customerEmail || '',
            city: order.city || '',
            status: 'active',
        };
        let existingCust = null;
        if (order.customerEmail) {
            const { data } = await supabase.from('customers').select('id')
                .eq('user_id', userId).eq('email', order.customerEmail).maybeSingle();
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
    const orderPayload = {
        user_id: userId, customer_id: customerId,
        order_id: orderNumber, platform_id: 5,
        status: newStatus, total_amount: orderTotal,
    };

    let dbOrderId;
    if (isNewOrder) {
        const { data: newDbOrder } = await supabase.from('orders').insert(orderPayload).select('id').single();
        dbOrderId = newDbOrder?.id;
    } else {
        await supabase.from('orders').update({ status: newStatus, total_amount: orderTotal }).eq('id', existing.id);
        dbOrderId = existing.id;
    }

    console.log(`[Daraz Webhook] #${orderNumber} isNew=${isNewOrder} | ${oldStatus} → ${newStatus}`);

    // WhatsApp — only if wa_is_active
    if (!user.wa_is_active) {
        return NextResponse.json({ success: true, wa: 'inactive' });
    }

    if (isNewOrder) {
        // Merchant alert
        await whatsappService.sendMerchantOrderAlert(userId, orderNumber, customerName, orderTotal)
            .catch(e => console.error('[Daraz Webhook] Merchant WA error:', e.message));

        // Customer alert (Daraz often masks phone — only send if available)
        if (customerPhone && !['cancelled', 'returned'].includes(newStatus)) {
            await whatsappService.sendOrderCreated(userId, {
                customerPhone, customerName, orderNumber,
                total: orderTotal,
                deliveryAddress: order.city || 'N/A',
                cityName: order.city || '',
                orderDetail: (order.items || []).map(i => i.name).join(', ') || 'Daraz Order',
            }).catch(e => console.error('[Daraz Webhook] Customer WA error:', e.message));
        }
    } else if (NOTIFIABLE.includes(newStatus)) {
        const phone = customerPhone || '';
        if (phone) {
            await whatsappService.sendOrderStatusUpdate(userId, orderNumber, newStatus, phone, customerName, orderTotal)
                .catch(e => console.error('[Daraz Webhook] Status WA error:', e.message));
        }
    }

    return NextResponse.json({ success: true, orderNumber, isNewOrder, status: newStatus });
}
