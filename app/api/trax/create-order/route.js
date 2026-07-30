import { NextResponse } from 'next/server';
import { createTraxOrder, isTraxConfigured } from '@/lib/services/traxService';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('trax_api_key, trax_api_secret')
            .eq('id', userId)
            .single();

        if (userError || !user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const { trax_api_key: apiKey, trax_api_secret: apiSecret } = user;

        if (!isTraxConfigured(apiKey, apiSecret)) {
            return NextResponse.json({ error: 'Trax credentials not configured' }, { status: 400 });
        }

        const body = await request.json();
        const {
            orderRefNumber, customerName, customerPhone, deliveryAddress,
            cityName, invoicePayment, customerEmail, orderDetail, items, weight,
        } = body;

        if (!orderRefNumber || !customerName || !customerPhone || !deliveryAddress || !cityName || !invoicePayment) {
            return NextResponse.json({
                error: 'Missing required fields: orderRefNumber, customerName, customerPhone, deliveryAddress, cityName, invoicePayment',
            }, { status: 400 });
        }

        console.log(`[Trax Create Order] Booking ${orderRefNumber} for ${customerName}...`);
        const result = await createTraxOrder(apiKey, apiSecret, {
            orderRefNumber, customerName, customerPhone, deliveryAddress,
            cityName, invoicePayment, customerEmail, orderDetail, items, weight,
        });

        if (!result.success) {
            return NextResponse.json({ error: `Trax API Error: ${result.error}`, raw: result.raw || null }, { status: 502 });
        }

        const trackingNumber = result.trackingNumber;
        console.log(`[Trax Create Order] Success! CN: ${trackingNumber}`);

        // Upsert customer
        const customerData = {
            user_id: userId, name: customerName, email: customerEmail || '',
            contact: customerPhone, city: cityName || '',
            total_orders: 1, total_spent: parseFloat(invoicePayment) || 0,
            status: 'active', last_order_date: new Date().toISOString(),
        };
        const { data: existingCustomer } = await supabase
            .from('customers').select('id').eq('user_id', userId).eq('contact', customerPhone).maybeSingle();

        let customerId = null;
        if (existingCustomer?.id) {
            customerId = existingCustomer.id;
            await supabase.from('customers').update(customerData).eq('id', customerId);
        } else {
            const { data: newCustomer } = await supabase.from('customers').insert(customerData).select('id').single();
            customerId = newCustomer?.id;
        }

        // Upsert order (platform_id 7 = Trax)
        const orderPayload = {
            user_id: userId, customer_id: customerId,
            order_id: trackingNumber || orderRefNumber,
            platform_id: 7, status: 'pending',
            total_amount: parseFloat(invoicePayment) || 0,
        };
        const { data: existingOrder } = await supabase
            .from('orders').select('id').eq('user_id', userId).eq('order_id', orderPayload.order_id).maybeSingle();

        let dbOrderId = null;
        if (existingOrder?.id) {
            dbOrderId = existingOrder.id;
            await supabase.from('orders').update(orderPayload).eq('id', dbOrderId);
        } else {
            const { data: newOrder } = await supabase.from('orders').insert(orderPayload).select('id').single();
            dbOrderId = newOrder?.id;
        }

        if (dbOrderId) {
            await supabase.from('order_items').insert({
                order_id: dbOrderId, product_id: null,
                quantity: items || 1, price: parseFloat(invoicePayment) || 0,
            });
        }

        // Ensure Trax courier row exists
        const { data: existingCourier } = await supabase
            .from('couriers').select('id').eq('name', 'Trax').eq('user_id', userId).maybeSingle();
        if (!existingCourier) {
            await supabase.from('couriers').insert({ name: 'Trax', status: 'active', user_id: userId, created_at: new Date().toISOString() });
        }

        return NextResponse.json({ success: true, trackingNumber, orderRefNumber, dbOrderId, customerId, raw: result.raw });
    } catch (error) {
        console.error('[Trax Create Order Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
