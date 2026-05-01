import { NextResponse } from 'next/server';
import { getShopifyOrders, isShopifyConfigured } from '@/lib/services/shopifyService';

/**
 * GET /api/shopify/orders
 * Query params:
 *   page      (default: 1)
 *   perPage   (default: 10, max: 250)
 *   search    (optional: order name/number)
 *   status    (optional: all | open | closed | cancelled | any)
 */
export async function GET(request) {
    try {
        if (!isShopifyConfigured()) {
            return NextResponse.json({
                configured: false,
                message: 'Shopify credentials not set in .env.local.',
            }, { status: 200 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const perPage = Math.min(parseInt(searchParams.get('perPage') || '10', 10), 250);
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || 'all';

        const data = await getShopifyOrders({ page, perPage, search, status });
        return NextResponse.json({ configured: true, ...data });
    } catch (error) {
        console.error('[Shopify Orders Error]', error.message);
        return NextResponse.json(
            { configured: true, error: error.message },
            { status: 500 }
        );
    }
}
