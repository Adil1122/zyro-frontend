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
            data: (products || []).map(p => {
                const stock = p.stock_quantity ?? p.stock ?? 0;
                return {
                id: p.id,
                name: p.name,
                sku: p.sku || 'N/A',
                stock,
                price: p.price || 0,
                cost_price: p.cost_price || 0,
                status: stock > (p.reorder_point || 10) ? 'In Stock' : stock > 0 ? 'Low Stock' : 'Out of Stock',
                category: p.category || '',
                barcode: p.barcode || '',
                reorder_point: p.reorder_point || 10,
                publish_shopify: p.publish_shopify || false,
                publish_daraz: p.publish_daraz || false,
                publish_woocommerce: p.publish_woocommerce || false,
                supplier_id: p.supplier_id || null,
                supplier_name: p.supplier_name || '',
                lead_time_days: p.lead_time_days || null,
                created_at: p.created_at,
                updated_at: p.updated_at
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
                // Blank becomes null so two unset SKUs do not collide under the
                // per-user unique constraint.
                sku: productData.sku?.trim() || null,
                barcode: productData.barcode || null,
                cost_price: parseFloat(productData.cost) || 0,
                price: parseFloat(productData.price) || 0,
                stock_quantity: parseInt(productData.stock) || 0,
                reorder_point: parseInt(productData.reorder) || 0,
                category: productData.category || null,
                supplier_id: productData.supplier_id || null,
                publish_shopify: productData.publish_shopify || false,
                publish_daraz: productData.publish_daraz || false,
                publish_woocommerce: productData.publish_woocommerce || false,
                status: parseInt(productData.stock) > 10 ? 'In Stock' : parseInt(productData.stock) > 0 ? 'Low Stock' : 'Out of Stock'
            }])
            .select()
            .single();

        // The raw Postgres text ("duplicate key value violates unique constraint
        // products_sku_key") tells a merchant nothing about what to change.
        if (error) {
            if (error.code === '23505' && /sku/i.test(error.message)) {
                throw new Error(`You already have a product with SKU "${productData.sku}". Use a different SKU, or edit the existing product.`);
            }
            throw error;
        }

        // Publish to the channels the merchant ticked. Done after the row exists so
        // a channel being unreachable cannot lose the product, and failures are
        // recorded in channel_sync_log rather than thrown at the form.
        const channels = [];
        if (productData.publish_shopify) channels.push('shopify');
        if (productData.publish_woocommerce) channels.push('woocommerce');

        if (channels.length && data?.id) {
            try {
                const { createProductOnChannels } = await import('@/lib/services/channelSync');
                data.channelSync = await createProductOnChannels(productData.user_id, data.id, { channels });
            } catch (e) {
                console.error('[Inventory] Channel publish failed:', e.message);
            }
        }

        return data;
    },

    async adjustStock(adjustmentData) {
        if (!adjustmentData.user_id || !adjustmentData.product_id) {
            throw new Error('User ID and Product ID are required');
        }

        // 1. Get current product
        const { data: product, error: fetchError } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', adjustmentData.product_id)
            .single();

        if (fetchError) throw fetchError;

        let newStock = product.stock_quantity ?? 0;
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

        // 2. Update product stock
        const { error: updateError } = await supabase
            .from('products')
            .update({
                stock_quantity: newStock,
                status: newStock > 10 ? 'In Stock' : newStock > 0 ? 'Low Stock' : 'Out of Stock',
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
                reason: adjustmentData.reason || 'Stocktake correction',
                reference: adjustmentData.notes || null,
                user_name: 'System'
            }]);

        if (moveError) throw moveError;

        // Our database is authoritative, so a local change has to reach the channels.
        // A failed push is not fatal — reconciliation corrects the channel later.
        try {
            const { pushStockToChannels } = await import('@/lib/services/channelSync');
            await pushStockToChannels(adjustmentData.user_id, [adjustmentData.product_id]);
        } catch (e) {
            console.error('[Inventory] Channel push failed:', e.message);
        }

        return { success: true, newStock };
    }
};
