import { NextResponse } from 'next/server';
import { getShopifyStats, isShopifyConfigured } from '@/lib/services/shopifyService';

/**
 * GET /api/shopify/stats
 * Returns live Shopify stats: total orders, today's orders & revenue
 */
export async function GET() {
    try {
        if (!isShopifyConfigured()) {
            return NextResponse.json({
                configured: false,
                message: 'Shopify credentials not set in .env.local. Set SHOPIFY_STORE_DOMAIN and SHOPIFY_ACCESS_TOKEN.',
            }, { status: 200 });
        }

        const stats = await getShopifyStats();
        return NextResponse.json({ configured: true, ...stats });
    } catch (error) {
        console.error('[Shopify Stats Error]', error.message);
        return NextResponse.json(
            { configured: true, error: error.message },
            { status: 500 }
        );
    }
}
