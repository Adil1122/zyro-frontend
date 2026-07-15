import { NextResponse } from 'next/server';
import { createTCSOrder, isTCSConfigured } from '@/lib/services/tcsService';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/tcs/create-order
 * Books a TCS COD shipment and saves the order to Supabase.
 *
 * Body: { orderRefNumber, customerName, customerPhone, deliveryAddress,
 *         cityName, invoicePayment, customerEmail?, orderDetail?, items?, weight? }
 */
export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });

    try {
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('tcs_api_key, tcs_api_password, tcs_cost_centre_code')
            .eq('id', userId)
            .single();

        if (userError || !user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const { tcs_api_key: apiKey, tcs_api_password: apiPassword, tcs_cost_centre_code: costCentreCode } = user;

        if (!isTCSConfigured(apiKey, apiPassword)) {
            return NextResponse.json({ error: 'TCS credentials not configured' }, { status: 400 });
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

        console.log(`[TCS Create Order] Booking ${orderRefNumber} for ${customerName}...`);
        const tcsResult = await createTCSOrder(apiKey, apiPassword, costCentreCode, {
            orderRefNumber, customerName, customerPhone, deliveryAddress,
            cityName, invoicePayment, customerEmail, orderDetail, items, weight,
        });

        if (!tcsResult.success) {
            console.error('[TCS Create Order] API Error:', tcsResult.error);
            return NextResponse.json(
                { error: `TCS API Error: ${tcsResult.error}`, tcsResponse: tcsResult.raw || null },
                { status: 502 }
            );
        }

        const trackingNumber = tcsResult.trackingNumber;
        console.log(`[TCS Create Order] Success! CN: ${trackingNumber}`);

        // Upsert customer
        let customerId = null;
        const customerData = {
            user_id: userId,
            name: customerName,
            email: customerEmail || '',
            contact: customerPhone,
            city: cityName || '',
            total_orders: 1,
            total_spent: parseFloat(invoicePayment) || 0,
            status: 'active',
            last_order_date: new Date().toISOString(),
        };

        const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id')
            .eq('user_id', userId)
            .eq('contact', customerPhone)
            .maybeSingle();

        if (existingCustomer?.id) {
            customerId = existingCustomer.id;
            await supabase.from('customers').update(customerData).eq('id', existingCustomer.id);
        } else {
            const { data: newCustomer } = await supabase
                .from('customers')
                .insert(customerData)
                .select('id')
                .single();
            customerId = newCustomer?.id;
        }

        // Upsert order (platform_id 3 = TCS)
        const orderPayload = {
            user_id: userId,
            customer_id: customerId,
            order_id: trackingNumber || orderRefNumber,
            platform_id: 3,
            status: 'pending',
            total_amount: parseFloat(invoicePayment) || 0,
        };

        const { data: existingOrder } = await supabase
            .from('orders')
            .select('id')
            .eq('user_id', userId)
            .eq('order_id', orderPayload.order_id)
            .maybeSingle();

        let dbOrderId = null;
        if (existingOrder?.id) {
            dbOrderId = existingOrder.id;
            await supabase.from('orders').update(orderPayload).eq('id', existingOrder.id);
        } else {
            const { data: newOrder } = await supabase
                .from('orders')
                .insert(orderPayload)
                .select('id')
                .single();
            dbOrderId = newOrder?.id;
        }

        if (dbOrderId) {
            await supabase.from('order_items').insert({
                order_id: dbOrderId,
                product_id: null,
                quantity: items || 1,
                price: parseFloat(invoicePayment) || 0,
            });
        }

        // Ensure TCS courier row exists
        const { data: existingCourier } = await supabase
            .from('couriers')
            .select('id')
            .eq('name', 'TCS')
            .eq('user_id', userId)
            .maybeSingle();

        if (!existingCourier) {
            await supabase.from('couriers').insert({
                name: 'TCS', status: 'active', user_id: userId, created_at: new Date().toISOString(),
            });
        }

        return NextResponse.json({
            success: true,
            trackingNumber,
            orderRefNumber,
            dbOrderId,
            customerId,
            tcsResponse: tcsResult.raw,
        });
    } catch (error) {
        console.error('[TCS Create Order Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
