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

        // Only sync published products
        if (wcProduct.status !== 'publish') {
            return NextResponse.json({ success: true, message: `Skipped — product status is "${wcProduct.status}"` });
        }

        const sku = wcProduct.sku || '';
        const name = wcProduct.name || 'Unnamed Product';
        const price = parseFloat(wcProduct.price || wcProduct.regular_price || 0);
        const stock = parseInt(wcProduct.stock_quantity || 0);
        const manageStock = wcProduct.manage_stock || false;

        console.log(`[WC product.created] New product: ${name} (SKU: ${sku})`);

        // Check if product already exists by SKU or WC ID
        const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('user_id', userId)
            .eq('sku', sku)
            .maybeSingle();

        if (existing?.id) {
            return NextResponse.json({ success: true, productId: existing.id, action: 'already_exists' });
        }

        const stockStatus = stock > 10 ? 'In Stock' : stock > 0 ? 'Low Stock' : 'Out of Stock';

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

        console.log(`[WC product.created] Product saved: ${newProduct.id}`);
        return NextResponse.json({ success: true, productId: newProduct.id, action: 'created' });

    } catch (error) {
        console.error('[WC product.created Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
