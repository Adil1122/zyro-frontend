import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

        const { data: user } = await supabase.from('users').select('id').eq('id', userId).maybeSingle();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const wcProduct = await request.json();
        if (!wcProduct?.id) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

        const sku = wcProduct.sku || '';
        const name = wcProduct.name || 'Unnamed Product';
        const price = parseFloat(wcProduct.price || wcProduct.regular_price || 0);
        const stock = parseInt(wcProduct.stock_quantity ?? 0);
        const manageStock = wcProduct.manage_stock || false;

        console.log(`[WC product.updated] Product: ${name} (SKU: ${sku}) | Stock: ${stock}`);

        const stockStatus = stock > 10 ? 'In Stock' : stock > 0 ? 'Low Stock' : 'Out of Stock';

        // Find by SKU first, fallback to name
        let existingProduct = null;

        if (sku) {
            const { data } = await supabase
                .from('products')
                .select('id, stock')
                .eq('user_id', userId)
                .eq('sku', sku)
                .maybeSingle();
            existingProduct = data;
        }

        if (!existingProduct && name) {
            const { data } = await supabase
                .from('products')
                .select('id, stock')
                .eq('user_id', userId)
                .eq('name', name)
                .maybeSingle();
            existingProduct = data;
        }

        if (existingProduct?.id) {
            // Update existing product
            await supabase.from('products').update({
                name,
                price,
                stock: manageStock ? stock : existingProduct.stock,
                status: stockStatus,
                updated_at: new Date().toISOString(),
            }).eq('id', existingProduct.id);

            console.log(`[WC product.updated] Updated product ${existingProduct.id} | Stock: ${existingProduct.stock} → ${stock}`);
            return NextResponse.json({ success: true, productId: existingProduct.id, action: 'updated', stock });

        } else {
            // Product not in Zyro yet — create it if published
            if (wcProduct.status !== 'publish') {
                return NextResponse.json({ success: true, message: 'Product not in Zyro and not published — skipped' });
            }

            const { data: newProduct, error } = await supabase.from('products').insert({
                user_id: userId,
                name,
                sku: sku || `WC-${wcProduct.id}`,
                price,
                cost_price: 0,
                stock: manageStock ? stock : 0,
                reorder_point: 5,
                status: stockStatus,
                publish_woocommerce: true,
                publish_shopify: false,
                publish_daraz: false,
                created_at: new Date().toISOString(),
            }).select('id').single();

            if (error) throw error;

            console.log(`[WC product.updated] Product not found — created new: ${newProduct.id}`);
            return NextResponse.json({ success: true, productId: newProduct.id, action: 'created' });
        }

    } catch (error) {
        console.error('[WC product.updated Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
