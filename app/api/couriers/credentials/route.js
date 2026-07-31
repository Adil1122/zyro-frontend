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

export async function GET(request) {
    const userId = request.headers.get('x-user-id') || new URL(request.url).searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data, error } = await supabase
            .from('courier_credentials')
            .select('courier_key, updated_at')
            .eq('user_id', userId);

        if (error) throw error;
        // Return only which couriers are connected — never return raw keys/secrets to the client
        const connected = (data || []).map(r => r.courier_key);
        return NextResponse.json({ connected });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
