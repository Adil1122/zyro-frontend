import { NextResponse } from 'next/server';
import { verifyTraxConnection, isTraxConfigured } from '@/lib/services/traxService';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data: user } = await supabase
            .from('users').select('trax_api_key, trax_api_secret').eq('id', userId).single();

        const { trax_api_key: apiKey, trax_api_secret: apiSecret } = user || {};

        if (!isTraxConfigured(apiKey, apiSecret)) {
            return NextResponse.json({ configured: false, message: 'Trax credentials not configured' });
        }

        const connection = await verifyTraxConnection(apiKey, apiSecret);
        if (!connection.connected) {
            return NextResponse.json({ configured: true, error: connection.error || 'Could not connect to Trax' });
        }

        const today = new Date().toISOString().split('T')[0];
        const { data: orders } = await supabase
            .from('orders').select('status, total_amount, created_at')
            .eq('user_id', userId).eq('platform_id', 7);

        let todayShipments = 0;
        let codPending = 0;
        let codRecovered = 0;

        for (const o of orders || []) {
            const amount = parseFloat(o.total_amount) || 0;
            if ((o.created_at || '').split('T')[0] === today) todayShipments++;
            if (o.status === 'completed') codRecovered += amount;
            else if (o.status === 'pending' || o.status === 'processing') codPending += amount;
        }

        return NextResponse.json({
            configured: true,
            todayShipments,
            totalShipments: (orders || []).length,
            codPending,
            codRecovered,
            currency: 'PKR',
            lastUpdated: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Trax Stats Error]', error.message);
        return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
    }
}
