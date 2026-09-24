import { NextResponse } from 'next/server';
import { getValidShopifyCreds } from '@/lib/shopifyToken';
import { getShopifyStats, isShopifyConfigured } from '@/lib/services/shopifyService';

export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const creds = await getValidShopifyCreds(userId);

        if (!creds || !isShopifyConfigured(creds)) {
            return NextResponse.json({ configured: false });
        }

        const stats = await getShopifyStats(creds);
        return NextResponse.json({ configured: true, ...stats });
    } catch (error) {
        console.error('[Shopify Stats Error]', error.message);
        if (error.message === 'SHOPIFY_TOKEN_EXPIRED') {
            return NextResponse.json({ configured: false, tokenExpired: true });
        }
        return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
    }
}
