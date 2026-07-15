import { NextResponse } from 'next/server';
import { isDHLConfigured } from '@/lib/services/dhlService';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data: user } = await supabase
            .from('users')
            .select('dhl_api_key, dhl_api_secret, dhl_account_number')
            .eq('id', userId)
            .single();

        const { dhl_api_key: apiKey, dhl_api_secret: apiSecret, dhl_account_number: accountNumber } = user || {};

        if (!isDHLConfigured(apiKey, apiSecret, accountNumber)) {
            return NextResponse.json({ configured: false, message: 'DHL credentials not configured' });
        }

        const { searchParams } = new URL(request.url);
        const page    = parseInt(searchParams.get('page')    || '1', 10);
        const perPage = parseInt(searchParams.get('perPage') || '10', 10);
        const search  = searchParams.get('search')  || '';
        const status  = searchParams.get('status')  || 'any';

        let query = supabase
            .from('orders')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .eq('platform_id', 9)
            .order('order_date', { ascending: false });

        if (status && status !== 'any') query = query.eq('status', status);
        if (search) query = query.or(`customer_name.ilike.%${search}%,order_number.ilike.%${search}%`);

        const from = (page - 1) * perPage;
        query = query.range(from, from + perPage - 1);

        const { data: orders, count, error } = await query;
        if (error) throw error;

        const mapped = (orders || []).map(o => ({
            id:            o.id,
            number:        o.order_number || o.platform_order_id,
            status:        o.status,
            rawStatus:     o.status,
            date:          o.order_date || o.created_at,
            customerName:  o.customer_name,
            customerPhone: o.customer_phone || '—',
            city:          o.city || '—',
            address: {
                shipping: { address1: o.shipping_address || '—', city: o.city || '—', country: 'Pakistan' },
                billing:  { address1: o.billing_address  || '—', city: o.city || '—', country: 'Pakistan' },
            },
            total:         parseFloat(o.total_amount) || 0,
            currency:      o.currency || 'PKR',
            paymentMethod: o.payment_method || 'Prepaid',
            itemCount:     o.item_count || 1,
            items:         o.items || [],
        }));

        return NextResponse.json({
            configured: true,
            orders: mapped,
            pagination: {
                page,
                perPage,
                totalOrders: count || 0,
                totalPages:  Math.ceil((count || 0) / perPage) || 1,
            },
        });
    } catch (error) {
        console.error('[DHL Orders Error]', error.message);
        return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
    }
}
