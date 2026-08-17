import { NextResponse } from 'next/server';
import { verifyShopifyWebhook } from '@/lib/shopifyWebhook';
import { supabase } from '@/lib/supabase';

// Shopify GDPR: shop data erasure
// A merchant has uninstalled the app and requested full data deletion.
// We must erase all their store data within 30 days.
export async function POST(request) {
    const rawBody = await request.text();
    const hmac = request.headers.get('x-shopify-hmac-sha256');

    if (!verifyShopifyWebhook(rawBody, hmac)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const payload = JSON.parse(rawBody);
        const { shop_domain } = payload;

        // Find the user account linked to this Shopify store
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('shopify_store_domain', shop_domain)
            .single();

        if (user) {
            const userId = user.id;

            // Delete all Shopify-synced orders for this merchant
            await supabase
                .from('orders')
                .delete()
                .eq('user_id', userId)
                .eq('platform', 'shopify');

            // Delete customer records
            await supabase
                .from('customers')
                .delete()
                .eq('user_id', userId);

            // Disconnect the Shopify integration (clear tokens and domain)
            await supabase
                .from('users')
                .update({
                    shopify_store_domain: null,
                    shopify_access_token: null,
                })
                .eq('id', userId);
        }

        // Log the shop erasure request
        await supabase.from('shopify_gdpr_requests').insert({
            type: 'shop_redact',
            shop_domain,
            customer_id: null,
            customer_email: null,
            payload,
            received_at: new Date().toISOString(),
        }).catch(() => {});

        console.log('[Shopify GDPR] shop/redact for:', shop_domain);
    } catch (e) {
        console.error('[Shopify GDPR] shop/redact error:', e.message);
    }

    return NextResponse.json({ acknowledged: true }, { status: 200 });
}
