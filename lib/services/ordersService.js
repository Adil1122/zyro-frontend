import { supabase } from '../supabase';

export const ordersService = {
    async getOrders(page = 1, pageSize = 10, search = "", status = "all") {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
            .from('orders')
            .select('*, customers(name, city)', { count: 'exact' });

        if (status !== "all") {
            query = query.ilike('status', status);
        }

        if (search) {
            // First find customers matching the search term
            const { data: matchedCustomers } = await supabase
                .from('customers')
                .select('id')
                .or(`name.ilike.%${search}%,city.ilike.%${search}%`);

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
        const { data: allCounts } = await supabase.from('orders').select('status');
        const counts = {
            all: allCounts.length,
            pending: allCounts.filter(o => o.status.toLowerCase() === 'pending').length,
            confirmed: allCounts.filter(o => o.status.toLowerCase() === 'confirmed').length,
            delivered: allCounts.filter(o => o.status.toLowerCase() === 'delivered').length,
            returned: allCounts.filter(o => o.status.toLowerCase() === 'returned').length,
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
