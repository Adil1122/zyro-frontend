import { NextResponse } from 'next/server';
import { createPostExOrder, isPostExConfigured } from '@/lib/services/postexService';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/postex/create-order
 * Creates a PostEx shipment and saves the order to the database.
 * 
 * Request body:
 * {
 *   orderRefNumber, customerName, customerPhone, deliveryAddress, cityName,
 *   invoicePayment, orderDetail, customerEmail?, pickupAddressCode?
 * }
 */
export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });
    }

    try {
        // 1. Get user's PostEx API key
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('postex_api_key, currency')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const apiKey = user?.postex_api_key;
        if (!isPostExConfigured(apiKey)) {
            return NextResponse.json({ error: 'PostEx API Key not configured' }, { status: 400 });
        }

        // 2. Parse request body
        const body = await request.json();
        const {
            orderRefNumber,
            customerName,
            customerPhone,
            deliveryAddress,
            cityName,
            invoicePayment,
            orderDetail,
            customerEmail,
            pickupAddressCode,
            items,
        } = body;

        if (!orderRefNumber || !customerName || !customerPhone || !deliveryAddress || !cityName || !invoicePayment) {
            return NextResponse.json({ error: 'Missing required fields: orderRefNumber, customerName, customerPhone, deliveryAddress, cityName, invoicePayment' }, { status: 400 });
        }

        // 3. Call PostEx Create Order API
        console.log(`[PostEx Create Order] Creating order ${orderRefNumber} for ${customerName}...`);
        const postexResult = await createPostExOrder(apiKey, {
            orderRefNumber,
            customerName,
            customerPhone,
            deliveryAddress,
            cityName,
            invoicePayment,
            orderDetail: orderDetail || '',
            pickupAddressCode: pickupAddressCode || 'OFC',
            items: items || 1,
        });

        if (!postexResult.success) {
            console.error('[PostEx Create Order] API Error:', postexResult.error);
            return NextResponse.json({
                error: `PostEx API Error: ${postexResult.error}`,
                postexResponse: postexResult.raw || null,
            }, { status: 502 });
        }

        const trackingNumber = postexResult.trackingNumber;
        console.log(`[PostEx Create Order] Success! Tracking: ${trackingNumber}`);

        // 4. Upsert customer in DB (same pattern as woocommerce sync)
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

        // Check if customer already exists by phone
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
            const { data: newCustomer, error: customerInsertError } = await supabase
                .from('customers')
                .insert(customerData)
                .select('id')
                .single();

            if (customerInsertError) {
                console.error('[PostEx Create Order] Customer insert error:', customerInsertError);
            } else {
                customerId = newCustomer?.id;
            }
        }

        // 5. Insert order into DB (same pattern as woocommerce sync)
        const orderData = {
            user_id: userId,
            customer_id: customerId,
            order_id: orderRefNumber,
            platform_id: 2, // PostEx platform ID
            status: 'pending',
            total_amount: parseFloat(invoicePayment) || 0,
        };

        // Check if order already exists
        const { data: existingOrder } = await supabase
            .from('orders')
            .select('id')
            .eq('user_id', userId)
            .eq('order_id', orderRefNumber)
            .maybeSingle();

        let dbOrderId = null;
        if (existingOrder?.id) {
            dbOrderId = existingOrder.id;
            await supabase.from('orders').update(orderData).eq('id', existingOrder.id);
        } else {
            const { data: newOrder, error: orderInsertError } = await supabase
                .from('orders')
                .insert(orderData)
                .select('id')
                .single();

            if (orderInsertError) {
                console.error('[PostEx Create Order] Order insert error:', orderInsertError);
            } else {
                dbOrderId = newOrder?.id;
            }
        }

        // 6. Insert order items
        if (dbOrderId) {
            await supabase.from('order_items').insert({
                order_id: dbOrderId,
                product_id: null,
                quantity: items || 1,
                price: parseFloat(invoicePayment) || 0,
            });
        }

        return NextResponse.json({
            success: true,
            trackingNumber,
            orderRefNumber,
            dbOrderId,
            customerId,
            postexResponse: postexResult.raw,
        });

    } catch (error) {
        console.error('[PostEx Create Order Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
