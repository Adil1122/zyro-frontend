import { NextResponse } from 'next/server';
import { supabase as supabaseAnon } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { STORE_LABEL_LIST, storeLabel } from '@/lib/platforms';
import { getUserBaseCurrency } from '@/lib/services/fxService';

// Server-side, so the anon client has no session and RLS would return zero rows.
// The query below is scoped by user_id, which this route requires.
const supabase = supabaseAdmin || supabaseAnon;

// Reported in the account's base currency. total_amount is whatever the store
// charged in, so summing it across currencies is meaningless. Rows written before
// conversion existed carry no base amount and were already PKR.
function baseAmount(order) {
    return Number(order?.total_amount_base ?? order?.total_amount ?? 0) || 0;
}

/**
 * GET /api/analytics/daily-pnl?userId=xxx&date=2026-07-25
 * Calculate daily P&L for a user
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || request.headers.get('x-user-id');
    const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    try {
        const baseCurrency = await getUserBaseCurrency(userId);
        const startOfDay = `${dateParam}T00:00:00.000Z`;
        const endOfDay = `${dateParam}T23:59:59.999Z`;

        // All orders for the day, every connected store included.
        const { data: orders } = await supabase
            .from('orders')
            .select('total_amount, total_amount_base, status, platform_id')
            .eq('user_id', userId)
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay);

        const allOrders = orders || [];

        const totalOrders = allOrders.length;
        const cancelledOrders = allOrders.filter(o =>
            ['cancelled', 'canceled', 'refunded'].includes(o.status?.toLowerCase())
        );
        const activeOrders = allOrders.filter(o =>
            !['cancelled', 'canceled', 'refunded'].includes(o.status?.toLowerCase())
        );
        const completedOrders = allOrders.filter(o =>
            ['completed', 'delivered'].includes(o.status?.toLowerCase())
        );

        const grossRevenue = activeOrders.reduce((s, o) => s + baseAmount(o), 0);
        const cancelledAmount = cancelledOrders.reduce((s, o) => s + baseAmount(o), 0);
        const netRevenue = grossRevenue;
        const collectedRevenue = completedOrders.reduce((s, o) => s + baseAmount(o), 0);

        // Status breakdown
        const statusBreakdown = {};
        allOrders.forEach(o => {
            const s = o.status?.toLowerCase() || 'unknown';
            statusBreakdown[s] = (statusBreakdown[s] || 0) + 1;
        });

        // Per-store breakdown. Every store is present even at zero so the charts
        // keep a stable set of series across days.
        const platforms = {};
        for (const label of STORE_LABEL_LIST) {
            platforms[label] = { orders: 0, revenue: 0 };
        }
        allOrders.forEach(o => {
            const label = storeLabel(o.platform_id);
            if (!platforms[label]) platforms[label] = { orders: 0, revenue: 0 };
            platforms[label].orders += 1;
        });
        activeOrders.forEach(o => {
            const label = storeLabel(o.platform_id);
            platforms[label].revenue += baseAmount(o);
        });
        for (const label of Object.keys(platforms)) {
            platforms[label].revenue = Math.round(platforms[label].revenue);
        }

        return NextResponse.json({
            date: dateParam,
            platforms,
            totalOrders,
            activeOrders: activeOrders.length,
            completedOrders: completedOrders.length,
            cancelledOrders: cancelledOrders.length,
            grossRevenue: Math.round(grossRevenue),
            cancelledAmount: Math.round(cancelledAmount),
            netRevenue: Math.round(netRevenue),
            collectedRevenue: Math.round(collectedRevenue),
            statusBreakdown,
            currency: baseCurrency,
        });

    } catch (error) {
        console.error('[Daily PnL Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
