import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { whatsappService } from '@/lib/services/whatsappService';

const LOW_STOCK_THRESHOLD = 5;

export async function POST(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

        const { data: user } = await supabase.from('users').select('id').eq('id', userId).maybeSingle();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        let wcProduct;
        try {
            wcProduct = await request.json();
        } catch {
            return NextResponse.json({ success: true, message: 'Ping received' });
        }
        if (!wcProduct?.id) return NextResponse.json({ success: true, message: 'Ping received' });

        const sku = wcProduct.sku || `WC-${wcProduct.id}`;
        const name = wcProduct.name || 'Unnamed Product';
        const price = parseFloat(wcProduct.price || wcProduct.regular_price || 0);
        const stock = parseInt(wcProduct.stock_quantity ?? 0);
        const manageStock = wcProduct.manage_stock || false;

        console.log(`[WC product.updated] ${name} | Stock: ${stock}`);

        const stockStatus = stock > 10 ? 'In Stock' : stock > 0 ? 'Low Stock' : 'Out of Stock';

        // Find by SKU first, fallback to name
        let existing = null;
        const { data: bySku } = await supabase.from('products').select('id, stock').eq('user_id', userId).eq('sku', sku).maybeSingle();
        existing = bySku;

        if (!existing) {
            const { data: byName } = await supabase.from('products').select('id, stock').eq('user_id', userId).eq('name', name).maybeSingle();
            existing = byName;
        }

        if (existing?.id) {
            await supabase.from('products').update({
                name,
                price,
                stock: manageStock ? stock : existing.stock,
                status: stockStatus,
            }).eq('id', existing.id);

            // Low stock alert to merchant
            if (manageStock && stock <= LOW_STOCK_THRESHOLD) {
                whatsappService.sendLowStockAlert(userId, name, stock)
                    .catch(err => console.error('[WC product.updated] Low stock WA error:', err.message));
            }

            return NextResponse.json({ success: true, productId: existing.id, action: 'updated', stock });
        }

        // Not in Zyro yet — create if published
        if (wcProduct.status !== 'publish') {
            return NextResponse.json({ success: true, message: 'Product not in Zyro and not published — skipped' });
        }

        const { data: newProduct, error } = await supabase.from('products').insert({
            user_id: userId,
            name,
            sku,
            price,
            stock: manageStock ? stock : 0,
            category: 'Uncategorized',
            status: stockStatus,
        }).select('id').single();

        if (error) throw error;

        return NextResponse.json({ success: true, productId: newProduct.id, action: 'created' });

    } catch (error) {
        console.error('[WC product.updated Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
