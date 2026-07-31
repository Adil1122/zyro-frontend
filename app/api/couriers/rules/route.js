import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data, error } = await supabase
            .from('courier_settings')
            .select('hard_rules, zone_rules')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;
        return NextResponse.json({
            hardRules: data?.hard_rules || [],
            zoneRules: data?.zone_rules || { metro: 'TCS', urban: 'Leopards', rural: 'Trax' },
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { hardRules, zoneRules } = await request.json();
        const { error } = await supabase
            .from('courier_settings')
            .upsert({ user_id: userId, hard_rules: hardRules, zone_rules: zoneRules, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
