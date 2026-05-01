import { supabase, getCurrentUserId } from '../supabase';
import { isWooCommerceConfigured, getWooCommerceOrders } from './woocommerceService';

export const ordersService = {
    async getOrders(page = 1, pageSize = 10, search = "", status = "all") {
        // If WooCommerce is configured, fetch from WooCommerce
        if (isWooCommerceConfigured()) {
            try {
                const wcData = await getWooCommerceOrders({ 
                    page, 
                    perPage: pageSize, 
                    search, 
                    status: status === 'all' ? 'any' : status 
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
                        platform: 'woocommerce'
                    })),
                    meta: {
                        pagination: wcData.pagination,
                        counts: {
                            all: wcData.pagination.totalOrders,
                            pending: 0, // WC doesn't give counts easily without extra calls
                            confirmed: 0,
                            delivered: 0,
                            returned: 0
                        }
                    }
                };
            } catch (error) {
                console.error('Error fetching WooCommerce orders:', error);
                // Fallback to supabase if WC fails? Or just throw?
                // Let's fallback for now or return empty
            }
        }

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const userId = getCurrentUserId();

        let query = supabase
            .from('orders')
            .select('*, customers(name, city)', { count: 'exact' });

        if (userId) {
            query = query.eq('user_id', userId);
        }

        if (status !== "all") {
            query = query.ilike('status', status);
        }

        if (search) {
            // First find customers matching the search term
            let customerQuery = supabase
                .from('customers')
                .select('id')
                .or(`name.ilike.%${search}%,city.ilike.%${search}%`);

            if (userId) {
                customerQuery = customerQuery.eq('user_id', userId);
            }

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

        // Get counts for each status
        let countsQuery = supabase.from('orders').select('status');
        if (userId) {
            countsQuery = countsQuery.eq('user_id', userId);
        }
        const { data: allCounts } = await countsQuery;
        const counts = {
            all: (allCounts || []).length,
            pending: (allCounts || []).filter(o => o.status.toLowerCase() === 'pending').length,
            confirmed: (allCounts || []).filter(o => o.status.toLowerCase() === 'confirmed').length,
            delivered: (allCounts || []).filter(o => o.status.toLowerCase() === 'delivered').length,
            returned: (allCounts || []).filter(o => o.status.toLowerCase() === 'returned').length,
        };

        return {
            data: (orders || []).map(o => ({
                id: o.id,
                order_id: o.order_id || `ORD-${o.id}`,
                customer: o.customers?.name || 'Walk-in Customer',
                city: o.customers?.city || '—',
                status: o.status,
                amount: o.total_amount || 0,
                time: o.created_at,
                platform: 'shopify'
            })),
            meta: {
                pagination: {
                    total: count || 0,
                    page,
                    pageSize,
                    lastPage: Math.ceil((count || 0) / pageSize)
                },
                counts
            }
        };
    }
};
