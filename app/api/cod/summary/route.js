import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getPostExOrders, isPostExConfigured } from '@/lib/services/postexService';

/**
 * GET /api/cod/summary
 * Returns expected COD from delivered PostEx orders
 * plus history of recorded settlements
 */
export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data: user } = await supabase
            .from('users')
            .select('postex_api_key, currency')
            .eq('id', userId)
            .single();

        let expectedCOD = 0;
        let deliveredOrders = 0;
        let postexConfigured = false;

        if (isPostExConfigured(user?.postex_api_key)) {
            postexConfigured = true;
            const result = await getPostExOrders({ apiKey: user.postex_api_key, status: 'completed', perPage: 100 });
            const orders = result?.orders || [];
            deliveredOrders = orders.length;
            expectedCOD = orders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
        }

        // Also get from Zyro DB (completed/delivered orders)
        const { data: dbOrders } = await supabase
            .from('orders')
            .select('total_amount')
            .eq('user_id', userId)
            .in('status', ['completed', 'delivered']);

        const dbExpectedCOD = (dbOrders || []).reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0);

        // Get settlement history
        const { data: settlements } = await supabase
            .from('cod_settlements')
            .select('*')
            .eq('user_id', userId)
            .order('settlement_date', { ascending: false })
            .limit(10);

        // Total settled so far
        const totalSettled = (settlements || []).reduce((s, r) => s + (parseFloat(r.received_amount) || 0), 0);

        return NextResponse.json({
            postexConfigured,
            expectedCOD: Math.round(postexConfigured ? expectedCOD : dbExpectedCOD),
            deliveredOrders: postexConfigured ? deliveredOrders : (dbOrders?.length || 0),
            totalSettled: Math.round(totalSettled),
            outstanding: Math.round((postexConfigured ? expectedCOD : dbExpectedCOD) - totalSettled),
            currency: user?.currency || 'PKR',
            settlements: settlements || [],
        });

    } catch (error) {
        console.error('[COD Summary Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
