import { NextResponse } from 'next/server';
import { isDHLConfigured, verifyDHLConnection } from '@/lib/services/dhlService';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data: user } = await supabase
            .from('users')
            .select('dhl_api_key, dhl_api_secret, dhl_account_number')
            .eq('id', userId)
            .single();

        const { dhl_api_key: apiKey, dhl_api_secret: apiSecret, dhl_account_number: accountNumber } = user || {};

        if (!isDHLConfigured(apiKey, apiSecret, accountNumber)) {
            return NextResponse.json({ error: 'DHL credentials not configured' }, { status: 400 });
        }

        const connection = await verifyDHLConnection(apiKey, apiSecret, accountNumber);
        if (!connection.connected) {
            return NextResponse.json({ error: connection.error || 'DHL authentication failed' }, { status: 502 });
        }

        const { data: existing } = await supabase
            .from('couriers')
            .select('id')
            .eq('name', 'DHL Express')
            .eq('user_id', userId)
            .maybeSingle();

        if (!existing) {
            await supabase.from('couriers').insert({
                name: 'DHL Express', status: 'active', user_id: userId, created_at: new Date().toISOString(),
            });
        } else {
            await supabase.from('couriers').update({ status: 'active' }).eq('id', existing.id);
        }

        const { count } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('platform_id', 9);

        return NextResponse.json({
            success: true,
            message: `DHL Express connected successfully. ${count || 0} DHL shipments in database.`,
            syncedOrders: count || 0,
        });
    } catch (error) {
        console.error('[DHL Sync Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
