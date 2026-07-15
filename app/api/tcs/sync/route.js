import { NextResponse } from 'next/server';
import { isTCSConfigured, verifyTCSConnection } from '@/lib/services/tcsService';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/tcs/sync
 * Verifies TCS connection and ensures the TCS courier row exists in Supabase.
 * Full order sync is not possible via TCS API (no list-all-orders endpoint),
 * so this route confirms the integration is active.
 */
export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data: user } = await supabase
            .from('users')
            .select('tcs_api_key, tcs_api_password, tcs_cost_centre_code')
            .eq('id', userId)
            .single();

        const { tcs_api_key: apiKey, tcs_api_password: apiPassword } = user || {};

        if (!isTCSConfigured(apiKey, apiPassword)) {
            return NextResponse.json({ error: 'TCS credentials not configured' }, { status: 400 });
        }

        const connection = await verifyTCSConnection(apiKey, apiPassword);
        if (!connection.connected) {
            return NextResponse.json({ error: connection.error || 'TCS authentication failed' }, { status: 502 });
        }

        // Upsert TCS courier row
        const { data: existingCourier } = await supabase
            .from('couriers')
            .select('id')
            .eq('name', 'TCS')
            .eq('user_id', userId)
            .maybeSingle();

        if (!existingCourier) {
            await supabase.from('couriers').insert({
                name: 'TCS', status: 'active', user_id: userId, created_at: new Date().toISOString(),
            });
        } else {
            await supabase.from('couriers')
                .update({ status: 'active' })
                .eq('id', existingCourier.id);
        }

        // Count local TCS orders for feedback
        const { count } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('platform_id', 3);

        return NextResponse.json({
            success: true,
            message: `TCS connected successfully. ${count || 0} TCS orders in database.`,
            syncedOrders: count || 0,
            syncedCustomers: 0,
            syncedProducts: 0,
        });
    } catch (error) {
        console.error('[TCS Sync Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
