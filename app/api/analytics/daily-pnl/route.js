import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
        const startOfDay = `${dateParam}T00:00:00.000Z`;
        const endOfDay = `${dateParam}T23:59:59.999Z`;

        // All orders for the day
        const { data: orders } = await supabase
            .from('orders')
            .select('total_amount, status')
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

        const grossRevenue = activeOrders.reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0);
        const cancelledAmount = cancelledOrders.reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0);
        const netRevenue = grossRevenue;
        const collectedRevenue = completedOrders.reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0);

        // Status breakdown
        const statusBreakdown = {};
        allOrders.forEach(o => {
            const s = o.status?.toLowerCase() || 'unknown';
            statusBreakdown[s] = (statusBreakdown[s] || 0) + 1;
        });

        return NextResponse.json({
            date: dateParam,
            totalOrders,
            activeOrders: activeOrders.length,
            completedOrders: completedOrders.length,
            cancelledOrders: cancelledOrders.length,
            grossRevenue: Math.round(grossRevenue),
            cancelledAmount: Math.round(cancelledAmount),
            netRevenue: Math.round(netRevenue),
            collectedRevenue: Math.round(collectedRevenue),
            statusBreakdown,
            currency: 'PKR',
        });

    } catch (error) {
        console.error('[Daily PnL Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
