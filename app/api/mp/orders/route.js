import { NextResponse } from 'next/server';
import { isMPConfigured } from '@/lib/services/mpService';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data: user } = await supabase
            .from('users')
            .select('mp_username, mp_password')
            .eq('id', userId)
            .single();

        const { mp_username: username, mp_password: password } = user || {};

        if (!isMPConfigured(username, password)) {
            return NextResponse.json({ configured: false, message: 'M&P credentials not configured' });
        }

        const { searchParams } = new URL(request.url);
        const page    = parseInt(searchParams.get('page')    || '1', 10);
        const perPage = parseInt(searchParams.get('perPage') || '10', 10);
        const search  = searchParams.get('search')  || '';
        const status  = searchParams.get('status')  || 'any';

        // M&P has no list-all-orders endpoint — serve from locally synced orders
        let query = supabase
            .from('orders')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .eq('platform_id', 7)
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
            paymentMethod: o.payment_method || 'Cash on Delivery',
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
        console.error('[M&P Orders Error]', error.message);
        return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
    }
}
