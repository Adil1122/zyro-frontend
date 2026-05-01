import { NextResponse } from 'next/server';
import { getWooCommerceOrders, isWooCommerceConfigured } from '@/lib/services/woocommerceService';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { data: user } = await supabase
            .from('users')
            .select('wc_store_url, wc_consumer_key, wc_consumer_secret')
            .eq('id', userId)
            .single();

        const creds = {
            url: user?.wc_store_url,
            key: user?.wc_consumer_key,
            secret: user?.wc_consumer_secret
        };

        if (!isWooCommerceConfigured(creds)) {
            return NextResponse.json({
                configured: false,
                message: 'WooCommerce credentials not configured in database',
            }, { status: 200 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const perPage = parseInt(searchParams.get('perPage') || '10', 10);
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || 'any';

        const data = await getWooCommerceOrders({ creds, page, perPage, search, status });
        return NextResponse.json({ configured: true, ...data });
    } catch (error) {
        console.error('[WooCommerce Orders Error]', error.message);
        return NextResponse.json(
            { configured: true, error: error.message },
            { status: 500 }
        );
    }
}
