import { NextResponse } from 'next/server';
import { verifyShopifyWebhook } from '@/lib/shopifyWebhook';
import { supabase } from '@/lib/supabase';

// Shopify GDPR: customer data request
// Shopify notifies us that a customer has requested their data.
// We must acknowledge within 30 days. No data needs to be returned immediately.
export async function POST(request) {
    const rawBody = await request.text();
    const hmac = request.headers.get('x-shopify-hmac-sha256');

    if (!verifyShopifyWebhook(rawBody, hmac)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const payload = JSON.parse(rawBody);
        const { shop_domain, customer } = payload;

        // Log the data request for compliance records
        await supabase.from('shopify_gdpr_requests').insert({
            type: 'customer_data_request',
            shop_domain,
            customer_id: customer?.id?.toString() || null,
            customer_email: customer?.email || null,
            payload,
            received_at: new Date().toISOString(),
        }).catch(() => {}); // non-fatal if table doesn't exist yet

        console.log('[Shopify GDPR] customer/data_request for shop:', shop_domain, 'customer:', customer?.email);
    } catch (e) {
        console.error('[Shopify GDPR] data_request parse error:', e.message);
    }

    return NextResponse.json({ acknowledged: true }, { status: 200 });
}
