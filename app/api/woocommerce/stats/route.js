import { NextResponse } from 'next/server';
import { getWooCommerceStats, isWooCommerceConfigured } from '@/lib/services/woocommerceService';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized: Missing User ID' }, { status: 401 });
    }

    try {
        // Fetch credentials from DB
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('wc_store_url, wc_consumer_key, wc_consumer_secret')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: 'User not found or database error' }, { status: 404 });
        }

        const creds = {
            url: user.wc_store_url,
            key: user.wc_consumer_key,
            secret: user.wc_consumer_secret
        };

        if (!isWooCommerceConfigured(creds)) {
            return NextResponse.json({
                configured: false,
                message: 'WooCommerce credentials not configured in database',
            }, { status: 200 });
        }

        const stats = await getWooCommerceStats(creds);
        return NextResponse.json({ configured: true, ...stats });
    } catch (error) {
        console.error('[WooCommerce Stats Error]', error.message);
        return NextResponse.json(
            { configured: true, error: error.message },
            { status: 500 }
        );
    }
}
