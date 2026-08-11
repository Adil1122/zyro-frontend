import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getShopifyOrders, isShopifyConfigured } from '@/lib/services/shopifyService';

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
            return NextResponse.json({ configured: false, message: 'Shopify credentials not configured.' });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const perPage = Math.min(parseInt(searchParams.get('perPage') || '50', 10), 250);
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || 'all';
        const pageInfo = searchParams.get('pageInfo') || null;

        const data = await getShopifyOrders({ page, perPage, search, status, creds, pageInfo });
        return NextResponse.json({ configured: true, ...data });
    } catch (error) {
        console.error('[Shopify Orders Error]', error.message);
        return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
    }
}
