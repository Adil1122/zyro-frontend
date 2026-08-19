import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { courierKey, apiKey, apiSecret } = await request.json();
        if (!courierKey || !apiKey || !apiSecret) {
            return NextResponse.json({ error: 'courierKey, apiKey, and apiSecret are required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('courier_credentials')
            .upsert(
                { user_id: userId, courier_key: courierKey, api_key: apiKey, api_secret: apiSecret, updated_at: new Date().toISOString() },
                { onConflict: 'user_id,courier_key' }
            );

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// Maps courier key → the users-table column that holds its API key.
// Checked one-at-a-time so a missing column never blocks the others.
const USER_COURIER_COLUMNS = {
    postex:   'postex_api_key',
    trax:     'trax_api_key',
    tcs:      'tcs_api_key',
    leopards: 'leopards_api_key',
    mnp:      'mp_username',
};

export async function GET(request) {
    const userId = request.headers.get('x-user-id') || new URL(request.url).searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const connected = new Set();

    // 1. courier_credentials table (set via connect modal)
    try {
        const { data: credRows } = await supabase
            .from('courier_credentials')
            .select('courier_key')
            .eq('user_id', userId);
        for (const r of credRows || []) connected.add(r.courier_key);
    } catch { /* table may not exist */ }

    // 2. users table — query each column separately so a missing column
    //    (not yet migrated) never causes the others to be skipped
    for (const [courierKey, col] of Object.entries(USER_COURIER_COLUMNS)) {
        try {
            const { data } = await supabase
                .from('users')
                .select(col)
                .eq('id', userId)
                .single();
            if (data?.[col]) connected.add(courierKey);
        } catch { /* column may not exist in this environment */ }
    }

    return NextResponse.json({ connected: [...connected] });
}
