import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ordersService } from '@/lib/services/ordersService';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const userId = searchParams.get('userId');
    const platform = searchParams.get('platform') || 'all';
    const dateFrom = searchParams.get('dateFrom') || null;
    const dateTo = searchParams.get('dateTo') || null;

    try {
        const data = await ordersService.getOrders(page, pageSize, search, status, userId, platform, dateFrom, dateTo);
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { userId, customerName, customerPhone, city, amount, status } = await request.json();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!customerName) return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });

        // Upsert customer
        let customerId = null;
        if (customerPhone) {
            const { data: existCust } = await supabase
                .from('customers').select('id')
                .eq('user_id', userId).eq('contact', customerPhone).maybeSingle();
            if (existCust?.id) {
                customerId = existCust.id;
                await supabase.from('customers').update({ name: customerName, city: city || '' }).eq('id', existCust.id);
            } else {
                const { data: newCust } = await supabase.from('customers').insert({
                    user_id: userId, name: customerName,
                    contact: customerPhone, city: city || '', status: 'active',
                }).select('id').single();
                customerId = newCust?.id || null;
            }
        }

        const orderId = `ORD-${Date.now()}`;
        const { data: newOrder, error } = await supabase.from('orders').insert({
            user_id: userId,
            customer_id: customerId,
            order_id: orderId,
            status: status || 'pending',
            total_amount: parseFloat(amount) || 0,
        }).select('id, order_id, status, total_amount, created_at').single();

        if (error) throw error;
        return NextResponse.json({ success: true, order: newOrder });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
