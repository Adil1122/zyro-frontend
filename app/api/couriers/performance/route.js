import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('courier_name, status, total_amount, created_at')
            .eq('user_id', userId)
            .not('courier_name', 'is', null);

        if (error) throw error;

        const stats = {};
        for (const o of (orders || [])) {
            const k = (o.courier_name || '').trim();
            if (!k) continue;
            if (!stats[k]) stats[k] = { total: 0, delivered: 0, returned: 0, inProgress: 0, codTotal: 0 };
            stats[k].total++;
            const s = (o.status || '').toLowerCase();
            if (['delivered', 'completed'].includes(s)) stats[k].delivered++;
            else if (['returned', 'rto', 'cancelled'].includes(s)) stats[k].returned++;
            else if (['pending', 'processing', 'confirmed', 'shipped'].includes(s)) stats[k].inProgress++;
            if ((o.payment_type || '').toLowerCase().includes('cod')) stats[k].codTotal += o.total_amount || 0;
        }

        const maxInProgress = Math.max(1, ...Object.values(stats).map(s => s.inProgress));

        const result = {};
        for (const [name, s] of Object.entries(stats)) {
            const resolved = s.delivered + s.returned;
            const score = resolved >= 5
                ? Math.round((s.delivered / resolved) * 100)
                : null; // not enough data
            const successRate = s.total > 0 ? (s.delivered / s.total * 100).toFixed(1) + '%' : '—';
            const rtoRate = s.total > 0 ? (s.returned / s.total * 100).toFixed(1) + '%' : '—';
            const load = Math.round((s.inProgress / maxInProgress) * 100);

            result[name] = { score, successRate, rtoRate, load, total: s.total, delivered: s.delivered, returned: s.returned, inProgress: s.inProgress };
        }

        return NextResponse.json({ performance: result, totalOrders: orders?.length || 0 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
