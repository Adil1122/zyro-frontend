import { NextResponse } from 'next/server';
import { verifyShopifyWebhook } from '@/lib/shopifyWebhook';
import { supabase } from '@/lib/supabase';

// Unified compliance webhook handler for all 3 mandatory GDPR topics.
// Shopify sends all compliance webhooks to this single URI (configured in shopify.app.toml).
// The X-Shopify-Topic header identifies which action to take.
export async function POST(request) {
    const rawBody = await request.text();
    const hmac = request.headers.get('x-shopify-hmac-sha256');
    const topic = request.headers.get('x-shopify-topic') || '';

    if (!verifyShopifyWebhook(rawBody, hmac)) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const payload = JSON.parse(rawBody);
        const { shop_domain, customer, orders_to_redact } = payload;

        if (topic === 'customers/data_request') {
            await supabase.from('shopify_gdpr_requests').insert({
                type: 'customer_data_request',
                shop_domain,
                customer_id: customer?.id?.toString() || null,
                customer_email: customer?.email || null,
                payload,
                received_at: new Date().toISOString(),
            }).catch(() => {});
            console.log('[Shopify GDPR] customers/data_request:', shop_domain);
        }

        else if (topic === 'customers/redact') {
            const { data: user } = await supabase
                .from('users')
                .select('id')
                .eq('shopify_store_domain', shop_domain)
                .single();

            if (user) {
                const orderIds = (orders_to_redact || []).map(String);
                if (orderIds.length > 0) {
                    await supabase.from('orders').update({
                        customer_name: 'Redacted',
                        customer_email: null,
                        customer_phone: null,
                        shipping_address: null,
                    }).eq('user_id', user.id).in('platform_order_id', orderIds);
                }
                if (customer?.email) {
                    await supabase.from('customers').delete()
                        .eq('user_id', user.id).eq('email', customer.email);
                }
            }
            await supabase.from('shopify_gdpr_requests').insert({
                type: 'customer_redact', shop_domain,
                customer_id: customer?.id?.toString() || null,
                customer_email: customer?.email || null,
                payload, received_at: new Date().toISOString(),
            }).catch(() => {});
            console.log('[Shopify GDPR] customers/redact:', shop_domain);
        }

        else if (topic === 'shop/redact') {
            const { data: user } = await supabase
                .from('users')
                .select('id')
                .eq('shopify_store_domain', shop_domain)
                .single();

            if (user) {
                await supabase.from('orders').delete()
                    .eq('user_id', user.id).eq('platform', 'shopify');
                await supabase.from('customers').delete().eq('user_id', user.id);
                await supabase.from('users').update({
                    shopify_store_domain: null,
                    shopify_access_token: null,
                }).eq('id', user.id);
            }
            await supabase.from('shopify_gdpr_requests').insert({
                type: 'shop_redact', shop_domain,
                customer_id: null, customer_email: null,
                payload, received_at: new Date().toISOString(),
            }).catch(() => {});
            console.log('[Shopify GDPR] shop/redact:', shop_domain);
        }
    } catch (e) {
        console.error('[Shopify GDPR] webhook error:', topic, e.message);
    }

    return NextResponse.json({ acknowledged: true }, { status: 200 });
}
