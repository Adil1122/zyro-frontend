import { NextResponse } from 'next/server';
import { createDHLShipment, isDHLConfigured, normalizeDHLShipment } from '@/lib/services/dhlService';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const orderData = await request.json();

        const { data: user } = await supabase
            .from('users')
            .select('dhl_api_key, dhl_api_secret, dhl_account_number')
            .eq('id', userId)
            .single();

        const { dhl_api_key: apiKey, dhl_api_secret: apiSecret, dhl_account_number: accountNumber } = user || {};

        if (!isDHLConfigured(apiKey, apiSecret, accountNumber)) {
            return NextResponse.json({ configured: false, error: 'DHL credentials not configured' });
        }

        const result = await createDHLShipment(apiKey, apiSecret, accountNumber, orderData);
        if (!result.success) {
            return NextResponse.json({ configured: true, success: false, error: result.error }, { status: 422 });
        }

        let customerId = null;
        if (orderData.customerPhone) {
            const { data: existing } = await supabase
                .from('customers')
                .select('id')
                .eq('user_id', userId)
                .eq('phone', orderData.customerPhone)
                .maybeSingle();

            if (existing) {
                customerId = existing.id;
            } else {
                const { data: newCustomer } = await supabase
                    .from('customers')
                    .insert({ user_id: userId, name: orderData.customerName, phone: orderData.customerPhone, email: orderData.customerEmail || null })
                    .select('id')
                    .single();
                customerId = newCustomer?.id;
            }
        }

        await supabase.from('orders').insert({
            user_id:           userId,
            customer_id:       customerId,
            platform_id:       9,
            platform_order_id: result.trackingNumber,
            order_number:      result.trackingNumber,
            status:            'pending',
            customer_name:     orderData.customerName,
            customer_phone:    orderData.customerPhone,
            customer_email:    orderData.customerEmail || null,
            city:              orderData.cityName,
            shipping_address:  orderData.deliveryAddress,
            billing_address:   orderData.deliveryAddress,
            total_amount:      Number(orderData.declaredValue || orderData.invoicePayment || 0),
            currency:          'PKR',
            payment_method:    'Prepaid',
            item_count:        Number(orderData.items || 1),
            items:             [{ name: orderData.orderDetail || 'DHL Express Shipment', quantity: 1, price: 0, subtotal: 0 }],
            order_date:        new Date().toISOString(),
            created_at:        new Date().toISOString(),
        });

        return NextResponse.json({
            configured: true,
            success: true,
            trackingNumber: result.trackingNumber,
            label: result.label,
        });
    } catch (error) {
        console.error('[DHL Create Order Error]', error.message);
        return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
    }
}
