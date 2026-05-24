import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createPostExOrder, isPostExConfigured } from '@/lib/services/postexService';
import { whatsappService } from '@/lib/services/whatsappService';

/**
 * POST /api/whatsapp/test-confirmation
 * Manual test endpoint for simulating the WhatsApp order confirmation flow.
 * 
 * Actions:
 *   action: "create_pending"   → Create a pending order & optionally send WhatsApp template
 *   action: "simulate_yes"     → Simulate customer pressing YES (create PostEx order + save to DB)
 *   action: "simulate_no"      → Simulate customer pressing NO (mark as rejected)
 *   action: "list_pending"     → List all pending orders for the user
 */
export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { action } = body;

        switch (action) {
            case 'create_pending':
                return await handleCreatePending(userId, body);
            case 'simulate_yes':
                return await handleSimulateYes(userId, body);
            case 'simulate_no':
                return await handleSimulateNo(userId, body);
            case 'list_pending':
                return await handleListPending(userId);
            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }

    } catch (error) {
        console.error('[WhatsApp Test] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}


/**
 * Create a pending order record and optionally send WhatsApp template message
 */
async function handleCreatePending(userId, body) {
    const {
        customerName,
        customerPhone,
        orderRef,
        totalAmount,
        deliveryAddress,
        cityName,
        orderDetail,
        sendWhatsApp = false, // If true, also send the template message
    } = body;

    if (!customerName || !customerPhone || !orderRef || !totalAmount) {
        return NextResponse.json({
            error: 'Missing required fields: customerName, customerPhone, orderRef, totalAmount'
        }, { status: 400 });
    }

    // 1. Create pending order record
    const pendingData = {
        user_id: userId,
        phone: customerPhone,
        customer_name: customerName,
        order_ref: orderRef,
        total_amount: parseFloat(totalAmount),
        delivery_address: deliveryAddress || '',
        city_name: cityName || '',
        order_detail: orderDetail || '',
        status: 'pending_confirmation',
    };

    const { data: pending, error: insertError } = await supabase
        .from('wa_pending_orders')
        .insert(pendingData)
        .select()
        .single();

    if (insertError) {
        console.error('[WhatsApp Test] Insert pending order error:', insertError);
        return NextResponse.json({ error: `DB Error: ${insertError.message}` }, { status: 500 });
    }

    let whatsappResult = null;

    // 2. Optionally send WhatsApp template message
    if (sendWhatsApp) {
        try {
            const { data: user } = await supabase
                .from('users')
                .select('wa_phone_number_id, wa_access_token, wa_template_name, currency')
                .eq('id', userId)
                .single();

            if (user?.wa_phone_number_id && user?.wa_access_token) {
                const templateName = 'order_created';
                const recipientPhone = whatsappService.formatPhoneNumber(customerPhone);
                
                if (recipientPhone) {
                    whatsappResult = await whatsappService.sendMetaWhatsAppTemplate({
                        phoneNumberId: user.wa_phone_number_id,
                        accessToken: user.wa_access_token,
                        recipientPhone,
                        templateName,
                        params: [customerName, orderRef, String(totalAmount)],
                    });
                    console.log('[WhatsApp Test] Template sent:', whatsappResult);
                } else {
                    whatsappResult = { error: 'Invalid phone number format' };
                }
            } else {
                whatsappResult = { error: 'WhatsApp credentials not configured' };
            }
        } catch (err) {
            whatsappResult = { error: err.message };
        }
    }

    return NextResponse.json({
        success: true,
        pendingOrder: pending,
        whatsappResult,
        message: sendWhatsApp
            ? 'Pending order created & WhatsApp template sent. Waiting for customer reply.'
            : 'Pending order created. Use "simulate_yes" or "simulate_no" to test the flow.',
    });
}


/**
 * Simulate customer pressing YES on the WhatsApp confirmation
 */
async function handleSimulateYes(userId, body) {
    const { pendingOrderId } = body;

    // 1. Find the pending order
    let query = supabase
        .from('wa_pending_orders')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending_confirmation')
        .order('created_at', { ascending: false })
        .limit(1);

    if (pendingOrderId) {
        query = supabase
            .from('wa_pending_orders')
            .select('*')
            .eq('id', pendingOrderId)
            .eq('status', 'pending_confirmation');
    }

    const { data: pendingOrder, error: fetchErr } = await query.maybeSingle();

    if (fetchErr || !pendingOrder) {
        return NextResponse.json({
            error: 'No pending order found. Create one first with action: "create_pending"'
        }, { status: 404 });
    }

    // 2. Get PostEx API key
    const { data: user } = await supabase
        .from('users')
        .select('postex_api_key, currency')
        .eq('id', userId)
        .single();

    let postexResult = null;
    let trackingNumber = null;

    if (user?.postex_api_key && isPostExConfigured(user.postex_api_key)) {
        // 3. Create PostEx order
        postexResult = await createPostExOrder(user.postex_api_key, {
            orderRefNumber: pendingOrder.order_ref,
            customerName: pendingOrder.customer_name,
            customerPhone: pendingOrder.phone,
            deliveryAddress: pendingOrder.delivery_address || 'N/A',
            cityName: pendingOrder.city_name || 'Karachi',
            invoicePayment: pendingOrder.total_amount,
            orderDetail: pendingOrder.order_detail || '',
        });

        trackingNumber = postexResult?.trackingNumber || null;
        console.log(`[WhatsApp Test] PostEx result:`, postexResult);
    } else {
        postexResult = { skipped: true, reason: 'PostEx API key not configured' };
    }

    // 4. Save customer to DB (same pattern as WooCommerce sync)
    let customerId = null;
    const customerData = {
        user_id: userId,
        name: pendingOrder.customer_name || 'WhatsApp Customer',
        email: '',
        contact: pendingOrder.phone,
        city: pendingOrder.city_name || '',
        total_orders: 1,
        total_spent: parseFloat(pendingOrder.total_amount) || 0,
        status: 'active',
        last_order_date: new Date().toISOString(),
    };

    const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', userId)
        .eq('contact', pendingOrder.phone)
        .maybeSingle();

    if (existingCustomer?.id) {
        customerId = existingCustomer.id;
        await supabase.from('customers').update(customerData).eq('id', existingCustomer.id);
    } else {
        const { data: newCustomer, error: custErr } = await supabase
            .from('customers')
            .insert(customerData)
            .select('id')
            .single();
        if (!custErr) customerId = newCustomer?.id;
    }

    // 5. Save order to DB (same pattern as WooCommerce sync)
    const orderData = {
        user_id: userId,
        customer_id: customerId,
        order_id: pendingOrder.order_ref,
        platform_id: 2, // PostEx
        status: 'pending',
        total_amount: parseFloat(pendingOrder.total_amount) || 0,
    };

    const { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', userId)
        .eq('order_id', pendingOrder.order_ref)
        .maybeSingle();

    let dbOrderId = null;
    if (existingOrder?.id) {
        dbOrderId = existingOrder.id;
        await supabase.from('orders').update(orderData).eq('id', existingOrder.id);
    } else {
        const { data: newOrder, error: orderErr } = await supabase
            .from('orders')
            .insert(orderData)
            .select('id')
            .single();
        if (!orderErr) dbOrderId = newOrder?.id;
    }

    // 6. Insert order item
    if (dbOrderId) {
        await supabase.from('order_items').insert({
            order_id: dbOrderId,
            product_id: null,
            quantity: 1,
            price: parseFloat(pendingOrder.total_amount) || 0,
        });
    }

    // 7. Update pending order status
    await supabase
        .from('wa_pending_orders')
        .update({
            status: 'confirmed',
            postex_tracking_number: trackingNumber,
        })
        .eq('id', pendingOrder.id);

    return NextResponse.json({
        success: true,
        message: 'Order confirmed! PostEx shipment created and order saved to database.',
        pendingOrder: { ...pendingOrder, status: 'confirmed' },
        postexResult,
        trackingNumber,
        dbOrderId,
        customerId,
    });
}


/**
 * Simulate customer pressing NO on the WhatsApp confirmation
 */
async function handleSimulateNo(userId, body) {
    const { pendingOrderId } = body;

    let query = supabase
        .from('wa_pending_orders')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending_confirmation')
        .order('created_at', { ascending: false })
        .limit(1);

    if (pendingOrderId) {
        query = supabase
            .from('wa_pending_orders')
            .select('*')
            .eq('id', pendingOrderId)
            .eq('status', 'pending_confirmation');
    }

    const { data: pendingOrder, error: fetchErr } = await query.maybeSingle();

    if (fetchErr || !pendingOrder) {
        return NextResponse.json({
            error: 'No pending order found.'
        }, { status: 404 });
    }

    await supabase
        .from('wa_pending_orders')
        .update({ status: 'rejected' })
        .eq('id', pendingOrder.id);

    return NextResponse.json({
        success: true,
        message: `Order ${pendingOrder.order_ref} has been rejected/cancelled.`,
        pendingOrder: { ...pendingOrder, status: 'rejected' },
    });
}


/**
 * List all pending orders for this user
 */
async function handleListPending(userId) {
    const { data: pendingOrders, error } = await supabase
        .from('wa_pending_orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
        success: true,
        pendingOrders: pendingOrders || [],
    });
}
