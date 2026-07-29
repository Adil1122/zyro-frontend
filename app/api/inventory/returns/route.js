import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    try {
        let query = supabase
            .from('returns')
            .select(`
                id, rma_number, order_id, reason, condition, status, created_at,
                customers ( name ),
                products ( id, name, sku )
            `)
            .order('created_at', { ascending: false });

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({ data: data || [] });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { userId, rma_number, order_id, product_id, reason, condition, status } = body;

        const insert = {
            rma_number: rma_number || `RMA-${Date.now()}`,
            reason,
            condition,
            status: status || 'Pending',
        };
        if (userId) insert.user_id = userId;
        if (order_id) insert.order_id = order_id;
        if (product_id) insert.product_id = product_id;

        const { data, error } = await supabase
            .from('returns')
            .insert(insert)
            .select(`id, rma_number, order_id, reason, condition, status, customers(name), products(id,name,sku)`)
            .single();

        if (error) throw error;
        return NextResponse.json({ data });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request) {
    try {
        const { id, status } = await request.json();
        if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 });

        const { data, error } = await supabase
            .from('returns')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ data });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
