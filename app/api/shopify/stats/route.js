import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getShopifyStats, isShopifyConfigured } from '@/lib/services/shopifyService';

export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data: user } = await supabase
            .from('users')
            .select('shopify_store_domain, shopify_access_token')
            .eq('id', userId)
            .single();

        const creds = {
            domain: user?.shopify_store_domain,
            accessToken: user?.shopify_access_token,
        };

        if (!isShopifyConfigured(creds)) {
            return NextResponse.json({ configured: false });
        }

        const stats = await getShopifyStats(creds);
        return NextResponse.json({ configured: true, ...stats });
    } catch (error) {
        console.error('[Shopify Stats Error]', error.message);
        return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
    }
}
