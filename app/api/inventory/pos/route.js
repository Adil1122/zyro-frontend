import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    try {
        let query = supabase
            .from('purchase_orders')
            .select(`
                id, po_number, total_amount, expected_date, status, created_at,
                suppliers ( id, name )
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

        if (!body.user_id) {
            return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
        }

        // Generate PO number: PO-YYYYMMDD-XXXX
        const now = new Date();
        const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
        const randPart = Math.floor(1000 + Math.random() * 9000);
        const po_number = `PO-${datePart}-${randPart}`;

        const { data, error } = await supabase
            .from('purchase_orders')
            .insert([{
                user_id: body.user_id,
                po_number,
                supplier_id: body.supplier_id || null,
                total_amount: parseFloat(body.total_amount) || 0,
                expected_date: body.expected_date || null,
                status: body.status || 'Draft',
                notes: body.notes || null,
            }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
