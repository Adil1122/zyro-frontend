import { NextResponse } from 'next/server';
import { isTraxConfigured } from '@/lib/services/traxService';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data: user } = await supabase
            .from('users').select('trax_api_key, trax_api_secret').eq('id', userId).single();

        const { trax_api_key: apiKey, trax_api_secret: apiSecret } = user || {};

        if (!isTraxConfigured(apiKey, apiSecret)) {
            return NextResponse.json({ configured: false, message: 'Trax credentials not configured' });
        }

        // Trax does not expose a "list all orders" endpoint — shipments are created
        // through Zyro and stored locally. Sync verifies credentials and counts.
        const { data: orders } = await supabase
            .from('orders').select('id, status').eq('user_id', userId).eq('platform_id', 7);

        return NextResponse.json({
            configured: true,
            synced: (orders || []).length,
            message: `${(orders || []).length} Trax shipments in Zyro`,
            lastSynced: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Trax Sync Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
