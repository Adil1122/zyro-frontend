import { NextResponse } from 'next/server';
import { createMPOrder, isMPConfigured, normalizeMPOrder } from '@/lib/services/mpService';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const orderData = await request.json();

        const { data: user } = await supabase
            .from('users')
            .select('mp_username, mp_password')
            .eq('id', userId)
            .single();

        const { mp_username: username, mp_password: password } = user || {};

        if (!isMPConfigured(username, password)) {
            return NextResponse.json({ configured: false, error: 'M&P credentials not configured' });
        }

        const result = await createMPOrder(username, password, orderData);
        if (!result.success) {
            return NextResponse.json({ configured: true, success: false, error: result.error }, { status: 422 });
        }

        // Upsert customer
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

        // Insert order
        const normalized = normalizeMPOrder({ ...orderData, cn_number: result.trackingNumber, status: 'pending' });
        await supabase.from('orders').insert({
            user_id:           userId,
            customer_id:       customerId,
            platform_id:       7,
            platform_order_id: result.trackingNumber,
            order_number:      result.trackingNumber,
            status:            'pending',
            customer_name:     orderData.customerName,
            customer_phone:    orderData.customerPhone,
            customer_email:    orderData.customerEmail || null,
            city:              orderData.cityName,
            shipping_address:  orderData.deliveryAddress,
            billing_address:   orderData.deliveryAddress,
            total_amount:      Number(orderData.invoicePayment),
            currency:          'PKR',
            payment_method:    'Cash on Delivery',
            item_count:        Number(orderData.items || 1),
            items:             normalized.items,
            order_date:        new Date().toISOString(),
            created_at:        new Date().toISOString(),
        });

        return NextResponse.json({ configured: true, success: true, trackingNumber: result.trackingNumber });
    } catch (error) {
        console.error('[M&P Create Order Error]', error.message);
        return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
    }
}
