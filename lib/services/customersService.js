import { supabase } from '../supabase';

export const customersService = {
    async getCustomers(page = 1, pageSize = 10, search = "") {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
            .from('customers')
            .select('*, orders(total_amount)', { count: 'exact' });

        if (search) {
            query = query.or(`name.ilike.%${search}%,contact.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%`);
        }

        const { data: customers, count, error } = await query
            .order('name', { ascending: true })
            .range(from, to);

        if (error) throw error;

        return {
            data: (customers || []).map(c => {
                const orders = (c.orders || []);
                const totalSpent = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

                return {
                    id: c.id,
                    name: c.name,
                    email: c.email || 'N/A',
                    phone: c.contact || 'N/A',
                    city: c.city || 'N/A',
                    ordersCount: orders.length,
                    totalSpent: totalSpent
                };
            }),
            meta: {
                pagination: {
                    total: count || 0,
                    page,
                    pageSize,
                    lastPage: Math.ceil((count || 0) / pageSize)
                }
            }
        };
    }
};
