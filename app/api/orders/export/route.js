import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const PLATFORM_ID = { woocommerce: 1, daraz: 5, shopify: 6 };

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status') || 'all';
    const platform = searchParams.get('platform') || 'all';
    const dateFrom = searchParams.get('dateFrom') || null;
    const dateTo = searchParams.get('dateTo') || null;

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        let query = supabase
            .from('orders')
            .select('*, customers(name, contact, city)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (status !== 'all') query = query.ilike('status', status);
        if (platform !== 'all') {
            if (platform === 'manual') query = query.is('platform_id', null);
            else if (PLATFORM_ID[platform]) query = query.eq('platform_id', PLATFORM_ID[platform]);
        }
        if (dateFrom) query = query.gte('created_at', dateFrom);
        if (dateTo) query = query.lte('created_at', dateTo);

        const { data: orders, error } = await query;
        if (error) throw error;

        const rows = [
            ['OrderID', 'Customer', 'Phone', 'City', 'Status', 'Amount', 'Platform', 'Date'],
            ...(orders || []).map(o => [
                o.order_id || '',
                (o.customers?.name || 'Walk-in').replace(/,/g, ' '),
                (o.customers?.contact || '').replace(/,/g, ''),
                (o.customers?.city || '').replace(/,/g, ' '),
                o.status || '',
                o.total_amount || 0,
                o.platform_id === 1 ? 'WooCommerce' : o.platform_id === 6 ? 'Shopify' : o.platform_id === 5 ? 'Daraz' : 'Manual',
                o.created_at ? new Date(o.created_at).toLocaleDateString() : '',
            ]),
        ];

        const csv = rows.map(r => r.join(',')).join('\n');

        return new Response(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
            },
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
