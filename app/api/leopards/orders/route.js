import { NextResponse } from 'next/server';
import { isLeopardsConfigured } from '@/lib/services/leopardsService';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data: user } = await supabase
            .from('users')
            .select('leopards_api_key, leopards_api_password')
            .eq('id', userId)
            .single();

        if (!isLeopardsConfigured(user?.leopards_api_key, user?.leopards_api_password)) {
            return NextResponse.json({ configured: false, message: 'Leopards credentials not configured' });
        }

        const { searchParams } = new URL(request.url);
        const page    = parseInt(searchParams.get('page')    || '1',  10);
        const perPage = parseInt(searchParams.get('perPage') || '10', 10);
        const search  = (searchParams.get('search') || '').toLowerCase();
        const status  = searchParams.get('status') || 'any';

        // Leopards orders stored in Supabase after booking (platform_id = 4)
        let query = supabase
            .from('orders')
            .select(`
                id, order_id, status, total_amount, created_at,
                customers ( id, name, contact, city )
            `, { count: 'exact' })
            .eq('user_id', userId)
            .eq('platform_id', 4)
            .order('created_at', { ascending: false });

        if (status !== 'any') query = query.eq('status', status);

        const { data: rawOrders, count, error } = await query;
        if (error) throw error;

        let orders = (rawOrders || []).map(o => ({
            id:            o.order_id,
            number:        o.order_id,
            status:        o.status,
            rawStatus:     o.status,
            date:          o.created_at,
            customerName:  o.customers?.name    || 'Unknown',
            customerPhone: o.customers?.contact || '—',
            city:          o.customers?.city    || '—',
            address: {
                shipping: { address1: '—', city: o.customers?.city || '—', country: 'Pakistan' },
                billing:  { address1: '—', city: o.customers?.city || '—', country: 'Pakistan' },
            },
            total:         parseFloat(o.total_amount) || 0,
            currency:      'PKR',
            paymentMethod: 'Cash on Delivery',
            itemCount:     1,
            items: [{ name: 'Standard Parcel', quantity: 1, price: parseFloat(o.total_amount) || 0, subtotal: parseFloat(o.total_amount) || 0 }],
        }));

        if (search) {
            orders = orders.filter(o =>
                o.number?.toLowerCase().includes(search) ||
                o.customerName?.toLowerCase().includes(search)
            );
        }

        const totalOrders = count || 0;
        const totalPages  = Math.ceil(totalOrders / perPage);

        return NextResponse.json({
            configured: true,
            orders,
            pagination: { page, perPage, totalOrders, totalPages },
        });
    } catch (error) {
        console.error('[Leopards Orders Error]', error.message);
        return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
    }
}
