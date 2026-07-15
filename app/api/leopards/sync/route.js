import { NextResponse } from 'next/server';
import { verifyLeopardsConnection, isLeopardsConfigured } from '@/lib/services/leopardsService';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/leopards/sync
 * Verifies Leopards connection and ensures the courier row exists in Supabase.
 */
export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data: user } = await supabase
            .from('users')
            .select('leopards_api_key, leopards_api_password')
            .eq('id', userId)
            .single();

        const { leopards_api_key: apiKey, leopards_api_password: apiPassword } = user || {};

        if (!isLeopardsConfigured(apiKey, apiPassword)) {
            return NextResponse.json({ error: 'Leopards credentials not configured' }, { status: 400 });
        }

        const connection = await verifyLeopardsConnection(apiKey, apiPassword);
        if (!connection.connected) {
            return NextResponse.json({ error: connection.error || 'Leopards authentication failed' }, { status: 502 });
        }

        // Upsert Leopards courier row
        const { data: existingCourier } = await supabase
            .from('couriers').select('id')
            .eq('name', 'Leopards').eq('user_id', userId).maybeSingle();

        if (!existingCourier) {
            await supabase.from('couriers').insert({
                name: 'Leopards', status: 'active',
                user_id: userId, created_at: new Date().toISOString(),
            });
        } else {
            await supabase.from('couriers').update({ status: 'active' }).eq('id', existingCourier.id);
        }

        const { count } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('platform_id', 4);

        return NextResponse.json({
            success: true,
            message: `Leopards connected successfully. ${count || 0} Leopards orders in database.`,
            syncedOrders: count || 0,
            syncedCustomers: 0,
            syncedProducts: 0,
        });
    } catch (error) {
        console.error('[Leopards Sync Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
