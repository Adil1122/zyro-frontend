import { supabase as supabaseAnon, getCurrentUserId } from '../supabase';
import { supabaseAdmin } from '../supabaseAdmin';
import { storeLabel, STORE_COLORS, OTHER_DISPLAY } from '../platforms';
import { getUserBaseCurrency } from './fxService';

// platform_id is the authoritative record of which store an order came from.
// This previously keyed off utm_source, which the sync never writes — so every
// order fell through to the woo default and Shopify and Daraz always read zero.
const TREND_KEY = { 1: 'woo', 5: 'daraz', 6: 'shopify' };

function trendKey(platformId) {
    return TREND_KEY[platformId] || 'other';
}

// This module only ever runs inside /api/dashboard-stats, where the anon client has
// no session and RLS silently returns zero rows — which rendered as "Rs 0, 0 orders"
// no matter how much real data existed. Every query below is scoped by user_id.
const supabase = supabaseAdmin || supabaseAnon;

// Revenue is reported in the account's base currency. total_amount is whatever the
// store charged in, so summing it across currencies is meaningless. Rows written
// before conversion existed carry no base amount and were already PKR.
function baseAmount(order) {
    const base = order?.total_amount_base;
    return Number(base ?? order?.total_amount ?? 0) || 0;
}

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
            if (pt) pt.revenue += baseAmount(o);
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
            if (pt) pt.revenue += baseAmount(o);
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
            if (pt) pt.revenue += baseAmount(o);
        });
    }

    return points.map(({ label, revenue }) => ({ label, revenue }));
}

function buildPlatformByDay(orders, range) {
    const now = new Date();
    const points = [];

    if (range === 'Today') {
        for (let h = 0; h <= now.getHours(); h++) {
            points.push({ day: `${h}:00`, woo: 0, daraz: 0, shopify: 0, other: 0, _h: h });
        }
        (orders || []).forEach(o => {
            const h = new Date(o.created_at).getHours();
            const pt = points.find(p => p._h === h);
            if (!pt) return;
            pt[trendKey(o.platform_id)]++;
        });
    } else {
        const days = range === '30d' ? 30 : range === '90d' ? 14 : 7;
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now - i * 86400000);
            const dk = d.toISOString().split('T')[0];
            points.push({ day: d.toLocaleDateString('en', { weekday: 'short' }), woo: 0, daraz: 0, shopify: 0, other: 0, _dk: dk });
        }
        (orders || []).forEach(o => {
            const dk = new Date(o.created_at).toISOString().split('T')[0];
            const pt = points.find(p => p._dk === dk);
            if (!pt) return;
            pt[trendKey(o.platform_id)]++;
        });
    }

    return points.map(({ day, woo, daraz, shopify }) => ({ day, woo, daraz, shopify }));
}

const RANGE_LABEL = { Today: 'Today', '7d': 'Last 7 Days', '30d': 'Last 30 Days', '90d': 'Last 90 Days' };

export const dashboardService = {
    async getDashboardStats(userId = null, range = '7d') {
        const now = new Date();
        const baseCurrency = await getUserBaseCurrency(userId);
        const dateFrom = computeDateFrom(range);
        const periodMs = now - dateFrom;
        const prevDateFrom = new Date(dateFrom - periodMs);

        // 1. Current period orders
        let revenueQuery = supabase
            .from('orders')
            .select('total_amount, total_amount_base, created_at, platform_id, status')
            .gte('created_at', dateFrom.toISOString());
        if (userId) revenueQuery = revenueQuery.eq('user_id', userId);
        const { data: periodOrders, error: revenueError } = await revenueQuery;

        // Discarding this error is how a missing column turned into a confident
        // "Rs 0" instead of a visible failure.
        if (revenueError) {
            console.error('[Dashboard] Revenue query failed:', revenueError.message);
            return { error: `Revenue query failed: ${revenueError.message}` };
        }

        const totalRevenueToday = periodOrders?.reduce((sum, o) => sum + baseAmount(o), 0) || 0;
        const ordersTodayCount = periodOrders?.length || 0;

        // 2. Previous period for delta computation
        let prevQuery = supabase
            .from('orders')
            .select('total_amount, total_amount_base')
            .gte('created_at', prevDateFrom.toISOString())
            .lt('created_at', dateFrom.toISOString());
        if (userId) prevQuery = prevQuery.eq('user_id', userId);
        const { data: prevPeriodOrders } = await prevQuery;
        const prevRevenue = prevPeriodOrders?.reduce((sum, o) => sum + baseAmount(o), 0) || 0;

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
        let aiQuery = supabase
            .from('wa_messages')
            .select('ai_confidence')
            .not('ai_confidence', 'is', null);
        if (userId) aiQuery = aiQuery.eq('user_id', userId);
        const { data: aiStats } = await aiQuery;
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
            .lt('stock_quantity', 5)
            .gte('stock_quantity', 0);
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
        const platforms = { woo: 0, daraz: 0, shopify: 0, other: 0 };
        periodOrders?.forEach(o => {
            platforms[trendKey(o.platform_id)]++;
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
                currency: baseCurrency,
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
                    { name: "WooCommerce", value: platforms.woo || 0, color: STORE_COLORS.WooCommerce },
                    { name: "Daraz", value: platforms.daraz || 0, color: STORE_COLORS.Daraz },
                    { name: "Shopify", value: platforms.shopify || 0, color: STORE_COLORS.Shopify },
                    { name: OTHER_DISPLAY, value: platforms.other || 0, color: STORE_COLORS.Other },
                ],
                revenueTrend: buildTrend(periodOrders, range),
                platformByDay: buildPlatformByDay(periodOrders, range),
            },
            recentOrders: (recentOrders || []).map(o => ({
                id: o.order_id || `ORD-${o.id}`,
                customer: o.customers?.name || 'Guest',
                city: o.customers?.city || 'Pakistan',
                platform: storeLabel(o.platform_id),
                status: o.status,
                // Reported in the account's base currency, like every other figure
                // on this page. chargedAmount keeps what the store actually billed.
                amount: baseAmount(o),
                currency: baseCurrency,
                chargedAmount: Number(o.total_amount) || 0,
                chargedCurrency: (o.currency || baseCurrency).toUpperCase(),
                time: o.created_at
            }))
        };
    }
};
