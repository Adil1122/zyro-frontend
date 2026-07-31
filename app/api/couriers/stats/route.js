import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    try {
        // COD orders currently in transit (pending or processing)
        let codQuery = supabase
            .from('orders')
            .select('total_amount')
            .in('status', ['pending', 'processing', 'new'])
            .ilike('payment_method', '%cod%');
        if (userId) codQuery = codQuery.eq('user_id', userId);
        const { data: codOrders } = await codQuery;
        const codInTransit = codOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

        // Recent orders for AI routing log
        let recentQuery = supabase
            .from('orders')
            .select('id, order_id, status, payment_method, total_amount, created_at, customers(name, city)')
            .order('created_at', { ascending: false })
            .limit(5);
        if (userId) recentQuery = recentQuery.eq('user_id', userId);
        const { data: recentOrders } = await recentQuery;

        const decisions = (recentOrders || []).map(o => {
            const city = o.customers?.city || 'Pakistan';
            const orderId = o.order_id || o.id?.slice(0, 8).toUpperCase();
            const amount = o.total_amount || 0;
            const isCOD = /cod/i.test(o.payment_method || '');
            const isMetro = /karachi|lahore|islamabad/i.test(city);

            if (isMetro && !isCOD) {
                return { type: 'rule', orderId, city, courier: 'TCS', amount, reason: 'zone rule matched', createdAt: o.created_at };
            } else if (isCOD && amount > 10000) {
                return { type: 'risk', orderId, city, courier: 'Leopards', amount, reason: 'COD high-value → risk routing', createdAt: o.created_at };
            } else {
                const courier = isMetro ? 'TCS' : /sialkot|multan|peshawar/i.test(city) ? 'Leopards' : 'Trax';
                return { type: 'ai', orderId, city, courier, amount, reason: 'AI scored best delivery rate', createdAt: o.created_at };
            }
        });

        return NextResponse.json({ codInTransit, decisions });
    } catch (error) {
        return NextResponse.json({ codInTransit: 0, decisions: [] });
    }
}
