import { supabase, getCurrentUserId } from '../supabase';
import { isWooCommerceConfigured, getWooCommerceProducts } from './woocommerceService';

export const inventoryService = {
    async getInventory(page = 1, pageSize = 10, search = "", userId = null) {
        // If WooCommerce is configured, fetch from WooCommerce
        if (isWooCommerceConfigured()) {
            try {
                return await getWooCommerceProducts({ page, perPage: pageSize, search });
            } catch (error) {
                console.error('Error fetching WooCommerce inventory:', error);
            }
        }

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        // Use the provided userId parameter instead of getting it from localStorage

        let query = supabase
            .from('products')
            .select('*', { count: 'exact' });

        if (userId) {
            query = query.eq('user_id', userId);
        }

        if (search) {
            query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%`);
        }

        const { data: products, count, error } = await query
            .order('created_at', { ascending: false })
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
    },

    async createProduct(productData) {
        if (!productData.user_id) {
            throw new Error('User ID is required');
        }

        const { data, error } = await supabase
            .from('products')
            .insert([{
                user_id: productData.user_id,
                name: productData.name,
                sku: productData.sku,
                barcode: productData.barcode || null,
                cost_price: parseFloat(productData.cost) || 0,
                price: parseFloat(productData.price) || 0,
                stock: parseInt(productData.stock) || 0,
                reorder_point: parseInt(productData.reorder) || 0,
                publish_shopify: productData.publish_shopify || false,
                publish_daraz: productData.publish_daraz || false,
                publish_woocommerce: productData.publish_woocommerce || false,
                status: parseInt(productData.stock) > 10 ? 'In Stock' : parseInt(productData.stock) > 0 ? 'Low Stock' : 'Out of Stock'
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async adjustStock(adjustmentData) {
        if (!adjustmentData.user_id || !adjustmentData.product_id) {
            throw new Error('User ID and Product ID are required');
        }

        // 1. Get current product
        const { data: product, error: fetchError } = await supabase
            .from('products')
            .select('stock')
            .eq('id', adjustmentData.product_id)
            .single();

        if (fetchError) throw fetchError;

        let newStock = product.stock;
        let qtyChange = adjustmentData.quantity;

        if (adjustmentData.type === 'add') {
            newStock += adjustmentData.quantity;
        } else if (adjustmentData.type === 'remove') {
            newStock -= adjustmentData.quantity;
            qtyChange = -adjustmentData.quantity;
        } else if (adjustmentData.type === 'set') {
            qtyChange = adjustmentData.quantity - newStock;
            newStock = adjustmentData.quantity;
        }

        // 2. Update product stock and adjustment reason/notes
        const { error: updateError } = await supabase
            .from('products')
            .update({ 
                stock: newStock,
                status: newStock > 10 ? 'In Stock' : newStock > 0 ? 'Low Stock' : 'Out of Stock',
                stock_adjustment_reason: adjustmentData.reason || 'Stocktake correction',
                stock_adjustment_notes: adjustmentData.notes || ''
            })
            .eq('id', adjustmentData.product_id);

        if (updateError) throw updateError;

        // 3. Log movement
        const { error: moveError } = await supabase
            .from('inventory_movements')
            .insert([{
                user_id: adjustmentData.user_id,
                product_id: adjustmentData.product_id,
                movement_type: 'Adjustment',
                quantity: qtyChange,
                stock_adjustment_reason: adjustmentData.reason || 'Stocktake correction',
                stock_adjustment_notes: adjustmentData.notes || '',
                user_name: 'System' // Or fetch real user name if available
            }]);

        if (moveError) throw moveError;

        return { success: true, newStock };
    }
};
