import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data, error } = await supabase
            .from('team_members')
            .select('id, name, email, role, status, invited_at')
            .eq('owner_user_id', userId)
            .order('invited_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json({ members: data || [] });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { name, email, role } = await request.json();
        if (!name?.trim() || !email?.trim()) {
            return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('team_members')
            .insert({ owner_user_id: userId, name: name.trim(), email: email.trim().toLowerCase(), role: role || 'viewer', status: 'pending', invited_at: new Date().toISOString() })
            .select('id, name, email, role, status, invited_at')
            .single();

        if (error) throw error;
        return NextResponse.json({ member: data }, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    const userId = request.headers.get('x-user-id') || new URL(request.url).searchParams.get('userId');
    const memberId = new URL(request.url).searchParams.get('memberId');
    if (!userId || !memberId) return NextResponse.json({ error: 'userId and memberId are required' }, { status: 400 });

    try {
        const { error } = await supabase
            .from('team_members')
            .delete()
            .eq('id', memberId)
            .eq('owner_user_id', userId);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
