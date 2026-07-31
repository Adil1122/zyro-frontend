import { supabase, getCurrentUserId } from '../supabase';

function computeDateFrom(range) {
    const now = new Date();
    if (range === 'Today') return new Date(now.toISOString().split('T')[0] + 'T00:00:00.000Z');
    if (range === '30d') return new Date(now - 30 * 86400000);
    if (range === '90d') return new Date(now - 90 * 86400000);
    return new Date(now - 7 * 86400000); // '7d' default
}

function buildTrend(orders, range) {
    const now = new Date();
    const points = [];

    if (range === 'Today') {
        for (let h = 0; h <= now.getHours(); h++) {
            points.push({ label: `${h}:00`, revenue: 0, _h: h });
        }
        (orders || []).forEach(o => {
            const h = new Date(o.created_at).getHours();
            const pt = points.find(p => p._h === h);
            if (pt) pt.revenue += (o.total_amount || 0);
        });
    } else if (range === '90d') {
        const seen = {};
        for (let i = 89; i >= 0; i--) {
            const d = new Date(now - i * 86400000);
            const mk = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
            if (!seen[mk]) { seen[mk] = true; points.push({ label: mk, revenue: 0, _mk: mk }); }
        }
        (orders || []).forEach(o => {
            const mk = new Date(o.created_at).toLocaleDateString('en', { month: 'short', year: '2-digit' });
            const pt = points.find(p => p._mk === mk);
            if (pt) pt.revenue += (o.total_amount || 0);
        });
    } else {
        const days = range === '30d' ? 30 : 7;
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now - i * 86400000);
            const dk = d.toISOString().split('T')[0];
            points.push({ label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }), revenue: 0, _dk: dk });
        }
        (orders || []).forEach(o => {
            const dk = new Date(o.created_at).toISOString().split('T')[0];
            const pt = points.find(p => p._dk === dk);
            if (pt) pt.revenue += (o.total_amount || 0);
        });
    }

    return points.map(({ label, revenue }) => ({ label, revenue }));
}

function buildPlatformByDay(orders, range) {
    const now = new Date();
    const points = [];

    if (range === 'Today') {
        for (let h = 0; h <= now.getHours(); h++) {
            points.push({ day: `${h}:00`, woo: 0, daraz: 0, shopify: 0, _h: h });
        }
        (orders || []).forEach(o => {
            const h = new Date(o.created_at).getHours();
            const pt = points.find(p => p._h === h);
            if (!pt) return;
            const src = (o.utm_source || '').toLowerCase();
            if (src.includes('daraz')) pt.daraz++;
            else if (src.includes('shopify')) pt.shopify++;
            else pt.woo++;
        });
    } else {
        const days = range === '30d' ? 30 : range === '90d' ? 14 : 7;
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now - i * 86400000);
            const dk = d.toISOString().split('T')[0];
            points.push({ day: d.toLocaleDateString('en', { weekday: 'short' }), woo: 0, daraz: 0, shopify: 0, _dk: dk });
        }
        (orders || []).forEach(o => {
            const dk = new Date(o.created_at).toISOString().split('T')[0];
            const pt = points.find(p => p._dk === dk);
            if (!pt) return;
            const src = (o.utm_source || '').toLowerCase();
            if (src.includes('daraz')) pt.daraz++;
            else if (src.includes('shopify')) pt.shopify++;
            else pt.woo++;
        });
    }

    return points.map(({ day, woo, daraz, shopify }) => ({ day, woo, daraz, shopify }));
}

const RANGE_LABEL = { Today: 'Today', '7d': 'Last 7 Days', '30d': 'Last 30 Days', '90d': 'Last 90 Days' };

export const dashboardService = {
    async getDashboardStats(userId = null, range = '7d') {
        const now = new Date();
        const dateFrom = computeDateFrom(range);
        const periodMs = now - dateFrom;
        const prevDateFrom = new Date(dateFrom - periodMs);

        // 1. Current period orders
        let revenueQuery = supabase
            .from('orders')
            .select('total_amount, created_at, utm_source, payment_method, status')
            .gte('created_at', dateFrom.toISOString());
        if (userId) revenueQuery = revenueQuery.eq('user_id', userId);
        const { data: periodOrders } = await revenueQuery;

        const totalRevenueToday = periodOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
        const ordersTodayCount = periodOrders?.length || 0;

        // 2. Previous period for delta computation
        let prevQuery = supabase
            .from('orders')
            .select('total_amount')
            .gte('created_at', prevDateFrom.toISOString())
            .lt('created_at', dateFrom.toISOString());
        if (userId) prevQuery = prevQuery.eq('user_id', userId);
        const { data: prevPeriodOrders } = await prevQuery;
        const prevRevenue = prevPeriodOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

        const rawDelta = prevRevenue > 0
            ? ((totalRevenueToday - prevRevenue) / prevRevenue * 100)
            : totalRevenueToday > 0 ? 100 : 0;
        const revenueDelta = `${rawDelta >= 0 ? '+' : ''}${rawDelta.toFixed(1)}%`;
        const revenueDeltaUp = rawDelta >= 0;

        // 3. Pending orders
        let pendingQuery = supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .in('status', ['pending', 'processing', 'new']);
        if (userId) pendingQuery = pendingQuery.eq('user_id', userId);
        const { count: pendingOrders } = await pendingQuery;

        // 4. AI rate from wa_messages
        const { data: aiStats } = await supabase
            .from('wa_messages')
            .select('ai_confidence')
            .not('ai_confidence', 'is', null);
        const aiRate = aiStats && aiStats.length > 0
            ? (aiStats.reduce((sum, m) => sum + Number(m.ai_confidence), 0) / aiStats.length).toFixed(0)
            : 94;

        // 5. COD due from couriers table
        let courierQuery = supabase.from('couriers').select('cod_in_transit');
        if (userId) courierQuery = courierQuery.eq('user_id', userId);
        const { data: courierStats } = await courierQuery;
        const codDue = courierStats?.reduce((sum, c) => sum + (c.cod_in_transit || 0), 0) || 0;

        // 6. Awaiting confirmation count (wa_pending_orders)
        let awaitQuery = supabase
            .from('wa_pending_orders')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending_confirmation');
        if (userId) awaitQuery = awaitQuery.eq('user_id', userId);
        const { count: awaitingConfirmation } = await awaitQuery;

        // 7. Low stock count (products with stock < 5)
        let stockQuery = supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .lt('stock', 5)
            .gte('stock', 0);
        if (userId) stockQuery = stockQuery.eq('user_id', userId);
        const { count: lowStockCount } = await stockQuery;

        // 8. Escalated support tickets (open)
        let ticketQuery = supabase
            .from('support_tickets')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'open');
        if (userId) ticketQuery = ticketQuery.eq('user_id', userId);
        const { count: escalatedCount } = await ticketQuery;

        // 9. Platform stats
        const platforms = { woo: 0, daraz: 0, shopify: 0 };
        periodOrders?.forEach(o => {
            const src = (o.utm_source || 'woo').toLowerCase();
            if (src.includes('woo')) platforms.woo++;
            else if (src.includes('daraz')) platforms.daraz++;
            else if (src.includes('shopify')) platforms.shopify++;
            else platforms.woo++;
        });

        // 10. Recent Orders
        let recentOrdersQuery = supabase
            .from('orders')
            .select('*, customers(name, city)')
            .order('created_at', { ascending: false })
            .limit(6);
        if (userId) recentOrdersQuery = recentOrdersQuery.eq('user_id', userId);
        const { data: recentOrders } = await recentOrdersQuery;

        return {
            kpis: {
                revenueToday: totalRevenueToday,
                ordersToday: ordersTodayCount,
                rangeLabel: RANGE_LABEL[range] || 'Last 7 Days',
                pendingOrders: pendingOrders || 0,
                aiRate: `${aiRate}%`,
                codDue: codDue,
                revenueDelta,
                revenueDeltaUp,
                awaitingConfirmation: awaitingConfirmation || 0,
                lowStockCount: lowStockCount || 0,
                escalatedCount: escalatedCount || 0,
            },
            charts: {
                platformSplit: [
                    { name: "WooCommerce", value: platforms.woo || 0, color: "#5CA87C" },
                    { name: "Daraz", value: platforms.daraz || 0, color: "#11332E" },
                    { name: "Shopify", value: platforms.shopify || 0, color: "#A8D5BA" },
                ],
                revenueTrend: buildTrend(periodOrders, range),
                platformByDay: buildPlatformByDay(periodOrders, range),
            },
            recentOrders: (recentOrders || []).map(o => ({
                id: o.order_id || `ORD-${o.id}`,
                customer: o.customers?.name || 'Guest',
                city: o.customers?.city || 'Pakistan',
                platform: o.utm_source || 'WooCommerce',
                status: o.status,
                amount: o.total_amount || 0,
                time: o.created_at
            }))
        };
    }
};
