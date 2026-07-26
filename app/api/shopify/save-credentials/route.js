import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getShopifyStats, isShopifyConfigured } from '@/lib/services/shopifyService';

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { storeDomain, accessToken } = await request.json();

        if (!storeDomain || !accessToken) {
            return NextResponse.json({ error: 'Store Domain and Access Token are required' }, { status: 400 });
        }

        const clean = storeDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
        const creds = { domain: clean, accessToken };

        if (!isShopifyConfigured(creds)) {
            return NextResponse.json({ error: 'Invalid credentials provided' }, { status: 400 });
        }

        // Test connection before saving
        try {
            await getShopifyStats(creds);
        } catch (e) {
            return NextResponse.json({ error: `Connection failed: ${e.message}` }, { status: 400 });
        }

        const { error } = await supabase
            .from('users')
            .update({
                shopify_store_domain: clean,
                shopify_access_token: accessToken,
            })
            .eq('id', userId);

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Shopify connected successfully' });
    } catch (error) {
        console.error('[Shopify Save Credentials Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { error } = await supabase
            .from('users')
            .update({ shopify_store_domain: null, shopify_access_token: null })
            .eq('id', userId);

        if (error) throw error;
        return NextResponse.json({ success: true, message: 'Shopify disconnected' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
