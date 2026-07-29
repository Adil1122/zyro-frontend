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
                phone: body.phone || null,
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

export async function PATCH(request) {
    try {
        const body = await request.json();
        if (!body.id || !body.user_id) {
            return NextResponse.json({ error: 'id and user_id required' }, { status: 400 });
        }
        const updates = {};
        if (body.name) updates.name = body.name;
        if (body.email !== undefined) updates.email = body.email || null;
        if (body.phone !== undefined) updates.phone = body.phone || null;
        if (body.lead_time_days !== undefined) updates.lead_time_days = parseInt(body.lead_time_days) || 7;
        if (body.status) updates.status = body.status;
        const { data, error } = await supabase
            .from('suppliers')
            .update(updates)
            .eq('id', body.id)
            .eq('user_id', body.user_id)
            .select()
            .single();
        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const userId = searchParams.get('userId');
        if (!id || !userId) {
            return NextResponse.json({ error: 'id and userId required' }, { status: 400 });
        }
        const { error } = await supabase
            .from('suppliers')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
