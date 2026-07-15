import { NextResponse } from 'next/server';
import { isDarazConfigured, getDarazStats } from '@/lib/services/darazService';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        if (!isDarazConfigured()) {
            return NextResponse.json({ error: 'Daraz credentials not configured in environment' }, { status: 400 });
        }

        // Verify connection by fetching live stats
        const stats = await getDarazStats();
        if (stats.error) {
            return NextResponse.json({ error: stats.error || 'Daraz authentication failed' }, { status: 502 });
        }

        // Upsert Daraz courier row
        const { data: existing } = await supabase
            .from('couriers')
            .select('id')
            .eq('name', 'Daraz')
            .eq('user_id', userId)
            .maybeSingle();

        if (!existing) {
            await supabase.from('couriers').insert({
                name: 'Daraz', status: 'active', user_id: userId, created_at: new Date().toISOString(),
            });
        } else {
            await supabase.from('couriers').update({ status: 'active' }).eq('id', existing.id);
        }

        const { count } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('platform_id', 5);

        return NextResponse.json({
            success: true,
            message: `Daraz connected successfully. ${count || 0} Daraz orders in database.`,
            syncedOrders: count || 0,
        });
    } catch (error) {
        console.error('[Daraz Sync Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
