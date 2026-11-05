import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabase } from '@/lib/supabase';
import { createProductOnChannels } from '@/lib/services/channelSync';

export const maxDuration = 60;

// Deliberately small. Creating one product costs several channel calls and
// Shopify downloads its image URL before responding, so a large batch exceeds the
// function time limit and the caller gets a platform error page instead of JSON.
const MAX_PER_CALL = 3;

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        let body = {};
        try { body = await request.json(); } catch { /* no body is fine */ }

        const db = supabaseAdmin || supabase;
        let ids = Array.isArray(body.productIds) ? body.productIds : null;

        // With no explicit list, pick up whatever is still unpublished.
        if (!ids) {
            const { data } = await db
                .from('products')
                .select('id')
                .eq('user_id', userId)
                .is('shopify_inventory_item_id', null)
                .eq('publish_shopify', true)
                .limit(MAX_PER_CALL);
            ids = (data || []).map(p => p.id);
        }

        const batch = ids.slice(0, MAX_PER_CALL);
        const results = [];

        for (const id of batch) {
            const { data: p } = await db
                .from('products')
                .select('id, sku, publish_shopify, publish_woocommerce')
                .eq('id', id)
                .eq('user_id', userId)
                .maybeSingle();

            if (!p) { results.push({ id, error: 'not found' }); continue; }

            const channels = [];
            if (p.publish_shopify) channels.push('shopify');
            if (p.publish_woocommerce) channels.push('woocommerce');
            if (!channels.length) { results.push({ id, sku: p.sku, skipped: 'no channels flagged' }); continue; }

            try {
                results.push({ id, sku: p.sku, ...(await createProductOnChannels(userId, id, { channels })) });
            } catch (e) {
                results.push({ id, sku: p.sku, error: e.message });
            }
        }

        return NextResponse.json({
            success: true,
            processed: batch.length,
            remaining: Math.max(0, ids.length - batch.length),
            results,
        });
    } catch (error) {
        console.error('[Inventory Publish]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
