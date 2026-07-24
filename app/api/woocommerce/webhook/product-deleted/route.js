import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
        const name = wcProduct.name || '';

        console.log(`[WC product.deleted] ${name} (SKU: ${sku})`);

        // Find by SKU first, fallback to name
        let existing = null;
        const { data: bySku } = await supabase.from('products').select('id').eq('user_id', userId).eq('sku', sku).maybeSingle();
        existing = bySku;

        if (!existing && name) {
            const { data: byName } = await supabase.from('products').select('id').eq('user_id', userId).eq('name', name).maybeSingle();
            existing = byName;
        }

        if (!existing?.id) {
            return NextResponse.json({ success: true, message: 'Product not in Zyro — skipped' });
        }

        const { error } = await supabase.from('products').update({
            status: 'Out of Stock',
            stock: 0,
        }).eq('id', existing.id);

        if (error) throw error;

        return NextResponse.json({ success: true, productId: existing.id, action: 'deleted' });

    } catch (error) {
        console.error('[WC product.deleted Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
