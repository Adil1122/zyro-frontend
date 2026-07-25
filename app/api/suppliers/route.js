import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/suppliers
 * List all suppliers for the authenticated user
 */
export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ suppliers: data || [] });
}

/**
 * POST /api/suppliers
 * Create a new supplier
 * Body: { name, phone, email, address, notes }
 */
export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { name, phone, email, address, notes } = await request.json();
        if (!name) return NextResponse.json({ error: 'Supplier name is required' }, { status: 400 });

        const { data, error } = await supabase
            .from('suppliers')
            .insert({ user_id: userId, name, phone: phone || null, email: email || null, address: address || null, notes: notes || null })
            .select('*')
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, supplier: data });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
