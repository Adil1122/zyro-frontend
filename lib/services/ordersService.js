import { supabase, getCurrentUserId } from '../supabase';
import { isWooCommerceConfigured, getWooCommerceOrders } from './woocommerceService';

export const ordersService = {
    async getOrders(page = 1, pageSize = 10, search = "", status = "all", userId = null, platform = "all", dateFrom = null, dateTo = null) {
        const PLATFORM_ID = { woocommerce: 1, daraz: 5, shopify: 6 };

        // WooCommerce live path — only when no conflicting platform filter
        if (isWooCommerceConfigured() && (platform === 'all' || platform === 'woocommerce')) {
            try {
                const wcData = await getWooCommerceOrders({
                    page, perPage: pageSize, search,
                    status: status === 'all' ? 'any' : status,
                });
                return {
                    data: wcData.orders.map(o => ({
                        id: o.id,
                        order_id: o.number,
                        customer: o.customerName,
                        customerEmail: o.customerEmail,
                        customerPhone: o.customerPhone,
                        city: o.city,
                        address: o.address,
                        status: o.status,
                        amount: o.total,
                        time: o.date,
                        items: o.items,
                        platform: 'woocommerce',
                    })),
                    meta: {
                        pagination: wcData.pagination,
                        counts: { all: wcData.pagination.totalOrders, pending: 0, confirmed: 0, delivered: 0, returned: 0 },
                    },
                };
            } catch (error) {
                console.error('Error fetching WooCommerce orders:', error);
            }
        }

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
            .from('orders')
            .select('*, customers(name, city), courier_name, courier_key', { count: 'exact' });

        if (userId) query = query.eq('user_id', userId);
        if (status !== 'all') query = query.ilike('status', status);

        // Platform filter
        if (platform !== 'all') {
            if (platform === 'manual') {
                query = query.is('platform_id', null);
            } else {
                const pid = PLATFORM_ID[platform];
                if (pid) query = query.eq('platform_id', pid);
            }
        }

        // Date range filter
        if (dateFrom) query = query.gte('created_at', dateFrom);
        if (dateTo) query = query.lte('created_at', dateTo);

        if (search) {
            let customerQuery = supabase
                .from('customers')
                .select('id')
                .or(`name.ilike.%${search}%,city.ilike.%${search}%`);
            if (userId) customerQuery = customerQuery.eq('user_id', userId);
            const { data: matchedCustomers } = await customerQuery;
            const customerIds = (matchedCustomers || []).map(c => c.id);
            if (customerIds.length > 0) {
                query = query.or(`order_id.ilike.%${search}%,customer_id.in.(${customerIds.join(',')})`);
            } else {
                query = query.ilike('order_id', `%${search}%`);
            }
        }

        const { data: orders, count, error } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        // Status counts (respect same non-status filters)
        let countsQuery = supabase.from('orders').select('status').eq('user_id', userId);
        if (platform !== 'all') {
            if (platform === 'manual') countsQuery = countsQuery.is('platform_id', null);
            else if (PLATFORM_ID[platform]) countsQuery = countsQuery.eq('platform_id', PLATFORM_ID[platform]);
        }
        if (dateFrom) countsQuery = countsQuery.gte('created_at', dateFrom);
        if (dateTo) countsQuery = countsQuery.lte('created_at', dateTo);
        const { data: allCounts } = await countsQuery;

        const PLATFORM_NAME = { 1: 'woocommerce', 5: 'daraz', 6: 'shopify' };

        const counts = {
            all: (allCounts || []).length,
            pending: (allCounts || []).filter(o => o.status?.toLowerCase() === 'pending').length,
            confirmed: (allCounts || []).filter(o => o.status?.toLowerCase() === 'confirmed').length,
            delivered: (allCounts || []).filter(o => o.status?.toLowerCase() === 'delivered').length,
            returned: (allCounts || []).filter(o => o.status?.toLowerCase() === 'returned').length,
        };

        return {
            data: (orders || []).map(o => ({
                id: o.id,
                order_id: o.order_id || `ORD-${o.id}`,
                customer: o.customers?.name || 'Walk-in Customer',
                city: o.customers?.city || '—',
                status: o.status || 'pending',
                amount: o.total_amount || 0,
                time: o.created_at,
                platform: PLATFORM_NAME[o.platform_id] || 'manual',
                courier_name: o.courier_name || null,
                courier_key: o.courier_key || null,
            })),
            meta: {
                pagination: { total: count || 0, page, pageSize, lastPage: Math.max(1, Math.ceil((count || 0) / pageSize)) },
                counts,
            },
        };
    }
};
