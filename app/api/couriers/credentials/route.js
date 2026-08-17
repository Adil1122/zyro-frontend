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

// Columns in the users table that indicate a courier is configured
const USER_COURIER_COLUMNS = {
    tcs:      ['tcs_api_key'],
    leopards: ['leopards_api_key'],
    mnp:      ['mp_username'],
    postex:   ['postex_api_key'],
    trax:     ['trax_api_key'],
    dhl:      ['dhl_api_key'],
};

export async function GET(request) {
    const userId = request.headers.get('x-user-id') || new URL(request.url).searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const connected = new Set();

        // Check courier_credentials table — ignore error if table doesn't exist yet
        const { data: credRows } = await supabase
            .from('courier_credentials')
            .select('courier_key')
            .eq('user_id', userId);
        for (const r of credRows || []) connected.add(r.courier_key);

        // Check users table columns for couriers that store credentials there
        const cols = Object.values(USER_COURIER_COLUMNS).flat().join(', ');
        const { data: user } = await supabase
            .from('users')
            .select(cols)
            .eq('id', userId)
            .single();

        if (user) {
            for (const [key, fields] of Object.entries(USER_COURIER_COLUMNS)) {
                if (fields.some(f => user[f])) connected.add(key);
            }
        }

        return NextResponse.json({ connected: [...connected] });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
