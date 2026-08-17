import { NextResponse } from 'next/server';
import { verifyShopifyWebhook } from '@/lib/shopifyWebhook';
import { supabase } from '@/lib/supabase';

// Shopify GDPR: customer data erasure
// A customer has requested deletion of their personal data.
// We must erase their data from our systems within 30 days.
export async function POST(request) {
    const rawBody = await request.text();
    const hmac = request.headers.get('x-shopify-hmac-sha256');

    if (!verifyShopifyWebhook(rawBody, hmac)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const payload = JSON.parse(rawBody);
        const { shop_domain, customer, orders_to_redact } = payload;
        const customerEmail = customer?.email;
        const shopifyCustomerId = customer?.id?.toString();
        const orderIds = (orders_to_redact || []).map(String);

        // Find the user account linked to this Shopify store
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('shopify_store_domain', shop_domain)
            .single();

        if (user) {
            // Remove personal data from matching orders (anonymize rather than delete)
            if (orderIds.length > 0) {
                await supabase
                    .from('orders')
                    .update({
                        customer_name: 'Redacted',
                        customer_email: null,
                        customer_phone: null,
                        shipping_address: null,
                    })
                    .eq('user_id', user.id)
                    .in('platform_order_id', orderIds);
            }

            // Delete customer record if stored separately
            if (customerEmail) {
                await supabase
                    .from('customers')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('email', customerEmail);
            }
        }

        // Log the erasure request
        await supabase.from('shopify_gdpr_requests').insert({
            type: 'customer_redact',
            shop_domain,
            customer_id: shopifyCustomerId || null,
            customer_email: customerEmail || null,
            payload,
            received_at: new Date().toISOString(),
        }).catch(() => {});

        console.log('[Shopify GDPR] customer/redact for shop:', shop_domain, 'customer:', customerEmail);
    } catch (e) {
        console.error('[Shopify GDPR] customer/redact error:', e.message);
    }

    return NextResponse.json({ acknowledged: true }, { status: 200 });
}
