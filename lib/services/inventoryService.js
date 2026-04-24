import { supabase } from '../supabase';

export const inventoryService = {
    async getInventory(page = 1, pageSize = 10, search = "") {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
            .from('products')
            .select('*', { count: 'exact' });

        if (search) {
            query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%,sku.ilike.%${search}%`);
        }

        const { data: products, count, error } = await query
            .order('name', { ascending: true })
            .range(from, to);

        if (error) throw error;

        return {
            data: (products || []).map(p => ({
                id: p.id,
                name: p.name,
                sku: p.sku || 'N/A',
                stock: p.stock || 0,
                price: p.price || 0,
                status: (p.stock || 0) > 10 ? 'In Stock' : (p.stock || 0) > 0 ? 'Low Stock' : 'Out of Stock',
                category: p.category || 'Uncategorized'
            })),
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
