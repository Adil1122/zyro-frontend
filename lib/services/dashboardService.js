import { supabase } from '../supabase';

export const dashboardService = {
    async getDashboardStats() {
        const today = new Date().toISOString().split('T')[0];

        // 1. KPIs
        const { data: revenueToday } = await supabase
            .from('orders')
            .select('total_amount')
            .gte('created_at', today);

        const totalRevenueToday = revenueToday?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
        const ordersTodayCount = revenueToday?.length || 0;

        const { count: pendingOrders } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .in('status', ['pending', 'processing', 'new']);

        const { data: aiStats } = await supabase
            .from('wa_messages')
            .select('ai_confidence')
            .not('ai_confidence', 'is', null);

        const aiRate = aiStats && aiStats.length > 0
            ? (aiStats.reduce((sum, m) => sum + Number(m.ai_confidence), 0) / aiStats.length).toFixed(0)
            : 94;

        const { data: courierStats } = await supabase
            .from('couriers')
            .select('cod_in_transit');

        const codDue = courierStats?.reduce((sum, c) => sum + (c.cod_in_transit || 0), 0) || 0;

        // 2. Platform Stats
        const { data: platformStats } = await supabase
            .from('orders')
            .select('utm_source');

        const platforms = { woo: 0, daraz: 0, shopify: 0 };
        platformStats?.forEach(o => {
            const src = (o.utm_source || 'woo').toLowerCase();
            if (src.includes('woo')) platforms.woo++;
            else if (src.includes('daraz')) platforms.daraz++;
            else if (src.includes('shopify')) platforms.shopify++;
            else platforms.woo++;
        });

        // 3. Recent Orders
        const { data: recentOrders } = await supabase
            .from('orders')
            .select('*, customers(name, city)')
            .order('created_at', { ascending: false })
            .limit(6);

        return {
            kpis: {
                revenueToday: totalRevenueToday,
                ordersToday: ordersTodayCount,
                pendingOrders: pendingOrders || 0,
                aiRate: `${aiRate}%`,
                codDue: codDue
            },
            charts: {
                platformSplit: [
                    { name: "WooCommerce", value: platforms.woo || 40, color: "#5CA87C" },
                    { name: "Daraz", value: platforms.daraz || 35, color: "#11332E" },
                    { name: "Shopify", value: platforms.shopify || 25, color: "#A8D5BA" },
                ],
                revenueTrend: [
                    { month: "Jan", revenue: 45000, target: 40000 },
                    { month: "Feb", revenue: 52000, target: 45000 },
                    { month: "Mar", revenue: 48000, target: 50000 },
                    { month: "Apr", revenue: 61000, target: 55000 },
                ]
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
