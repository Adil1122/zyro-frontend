import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { inventoryService } from '@/lib/services/inventoryService';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    try {
        let query = supabase
            .from('inventory_movements')
            .select(`
                id, movement_type, quantity, reason, reference, created_at, user_name,
                products ( id, name, sku, stock )
            `)
            .order('created_at', { ascending: false })
            .limit(50);

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
        const data = await inventoryService.adjustStock(body);
        return NextResponse.json({ success: true, data }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
