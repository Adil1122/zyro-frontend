import { NextResponse } from 'next/server';
import { getTCSStats, isTCSConfigured } from '@/lib/services/tcsService';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data: user } = await supabase
            .from('users')
            .select('tcs_api_key, tcs_api_password')
            .eq('id', userId)
            .single();

        const apiKey = user?.tcs_api_key;
        const apiPassword = user?.tcs_api_password;

        if (!isTCSConfigured(apiKey, apiPassword)) {
            return NextResponse.json({ configured: false, message: 'TCS credentials not configured' });
        }

        // Verify auth + get base stats
        const stats = await getTCSStats(apiKey, apiPassword);

        if (stats.error) {
            return NextResponse.json({ configured: true, error: stats.error });
        }

        // Augment with Supabase order stats (TCS has no "list all orders" API)
        const today = new Date().toISOString().split('T')[0];
        const { data: orders } = await supabase
            .from('orders')
            .select('status, total_amount, created_at')
            .eq('user_id', userId)
            .eq('platform_id', 3); // 3 = TCS

        let todayShipments = 0;
        let totalShipments = (orders || []).length;
        let codPending = 0;
        let codRecovered = 0;

        for (const o of orders || []) {
            const amount = parseFloat(o.total_amount) || 0;
            const oDate = (o.created_at || '').split('T')[0];
            if (oDate === today) todayShipments++;
            if (o.status === 'completed') codRecovered += amount;
            else if (o.status === 'pending' || o.status === 'processing') codPending += amount;
        }

        return NextResponse.json({
            configured: true,
            todayShipments,
            totalShipments,
            codPending,
            codRecovered,
            currency: 'PKR',
            lastUpdated: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[TCS Stats Error]', error.message);
        return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
    }
}
