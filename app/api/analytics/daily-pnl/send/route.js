import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { whatsappService } from '@/lib/services/whatsappService';

/**
 * POST /api/analytics/daily-pnl/send
 * Calculate today's P&L and send WhatsApp report to merchant
 */
export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const dateParam = new Date().toISOString().split('T')[0];
        const startOfDay = `${dateParam}T00:00:00.000Z`;
        const endOfDay = `${dateParam}T23:59:59.999Z`;

        const { data: orders } = await supabase
            .from('orders')
            .select('total_amount, status')
            .eq('user_id', userId)
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay);

        const allOrders = orders || [];
        const cancelledOrders = allOrders.filter(o =>
            ['cancelled', 'canceled', 'refunded'].includes(o.status?.toLowerCase())
        );
        const activeOrders = allOrders.filter(o =>
            !['cancelled', 'canceled', 'refunded'].includes(o.status?.toLowerCase())
        );

        const totalOrders = allOrders.length;
        const grossRevenue = activeOrders.reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0);
        const cancelledAmount = cancelledOrders.reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0);

        const formattedDate = new Date().toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric'
        });

        const result = await whatsappService.sendDailyPnLReport(userId, {
            date: formattedDate,
            totalOrders,
            grossRevenue: Math.round(grossRevenue),
            cancelledOrders: cancelledOrders.length,
            cancelledAmount: Math.round(cancelledAmount),
            netRevenue: Math.round(grossRevenue),
        });

        // Save to daily_pnl table
        await supabase.from('daily_pnl').upsert({
            user_id: userId,
            date: dateParam,
            total_orders: totalOrders,
            gross_revenue: Math.round(grossRevenue),
            cancelled_orders: cancelledOrders.length,
            cancelled_amount: Math.round(cancelledAmount),
            net_revenue: Math.round(grossRevenue),
            sent_at: new Date().toISOString(),
        }, { onConflict: 'user_id,date' });

        return NextResponse.json({ success: true, result, stats: { totalOrders, grossRevenue, cancelledOrders: cancelledOrders.length } });

    } catch (error) {
        console.error('[Daily PnL Send Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
