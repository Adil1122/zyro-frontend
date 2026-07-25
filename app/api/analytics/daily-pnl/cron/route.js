import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { whatsappService } from '@/lib/services/whatsappService';

/**
 * GET /api/analytics/daily-pnl/cron
 * Called by Vercel Cron daily at midnight PKT (19:00 UTC)
 * Sends P&L report to ALL active users who have WhatsApp configured
 */
export async function GET(request) {
    // Verify cron secret so only Vercel can call this
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'zyro_cron_secret';
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dateParam = new Date().toISOString().split('T')[0];
    const startOfDay = `${dateParam}T00:00:00.000Z`;
    const endOfDay = `${dateParam}T23:59:59.999Z`;

    // Get all users with WhatsApp active + merchant phone set
    const { data: users } = await supabase
        .from('users')
        .select('id, wa_merchant_phone, wa_template_pnl')
        .eq('wa_is_active', true)
        .not('wa_merchant_phone', 'is', null);

    if (!users?.length) {
        return NextResponse.json({ success: true, message: 'No active users to notify' });
    }

    const results = [];

    for (const user of users) {
        try {
            const { data: orders } = await supabase
                .from('orders')
                .select('total_amount, status')
                .eq('user_id', user.id)
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

            const waResult = await whatsappService.sendDailyPnLReport(user.id, {
                date: formattedDate,
                totalOrders,
                grossRevenue: Math.round(grossRevenue),
                cancelledOrders: cancelledOrders.length,
                cancelledAmount: Math.round(cancelledAmount),
                netRevenue: Math.round(grossRevenue),
            });

            await supabase.from('daily_pnl').upsert({
                user_id: user.id,
                date: dateParam,
                total_orders: totalOrders,
                gross_revenue: Math.round(grossRevenue),
                cancelled_orders: cancelledOrders.length,
                cancelled_amount: Math.round(cancelledAmount),
                net_revenue: Math.round(grossRevenue),
                sent_at: new Date().toISOString(),
            }, { onConflict: 'user_id,date' });

            results.push({ userId: user.id, success: true, totalOrders });
        } catch (err) {
            console.error(`[PnL Cron] Error for user ${user.id}:`, err.message);
            results.push({ userId: user.id, success: false, error: err.message });
        }
    }

    console.log(`[PnL Cron] Done. Processed ${results.length} users.`);
    return NextResponse.json({ success: true, processed: results.length, results });
}
