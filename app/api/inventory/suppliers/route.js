import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    try {
        let query = supabase
            .from('suppliers')
            .select('*')
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
        if (!body.name) {
            return NextResponse.json({ error: 'Supplier name is required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('suppliers')
            .insert([{
                user_id: body.user_id,
                name: body.name,
                email: body.email || null,
                lead_time_days: parseInt(body.lead_time_days) || 7,
                status: body.status || 'Active',
            }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
