import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data, error } = await supabase
            .from('notification_preferences')
            .select('prefs')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;
        return NextResponse.json({ prefs: data?.prefs || null });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { prefs } = await request.json();
        if (!prefs) return NextResponse.json({ error: 'prefs is required' }, { status: 400 });

        const { error } = await supabase
            .from('notification_preferences')
            .upsert({ user_id: userId, prefs, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
