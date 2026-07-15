import { NextResponse } from 'next/server';
import { isMPConfigured, verifyMPConnection } from '@/lib/services/mpService';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data: user } = await supabase
            .from('users')
            .select('mp_username, mp_password')
            .eq('id', userId)
            .single();

        const { mp_username: username, mp_password: password } = user || {};

        if (!isMPConfigured(username, password)) {
            return NextResponse.json({ error: 'M&P credentials not configured' }, { status: 400 });
        }

        const connection = await verifyMPConnection(username, password);
        if (!connection.connected) {
            return NextResponse.json({ error: connection.error || 'M&P authentication failed' }, { status: 502 });
        }

        // Upsert M&P courier row
        const { data: existing } = await supabase
            .from('couriers')
            .select('id')
            .eq('name', 'M&P')
            .eq('user_id', userId)
            .maybeSingle();

        if (!existing) {
            await supabase.from('couriers').insert({
                name: 'M&P', status: 'active', user_id: userId, created_at: new Date().toISOString(),
            });
        } else {
            await supabase.from('couriers').update({ status: 'active' }).eq('id', existing.id);
        }

        const { count } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('platform_id', 7);

        return NextResponse.json({
            success: true,
            message: `M&P connected successfully. ${count || 0} M&P orders in database.`,
            syncedOrders: count || 0,
        });
    } catch (error) {
        console.error('[M&P Sync Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
