import { NextResponse } from 'next/server';
import { getDarazStats, isDarazConfigured } from '@/lib/services/darazService';

/**
 * GET /api/daraz/stats
 * Returns live Daraz stats: total orders (last 90 days), today's orders & revenue
 */
export async function GET() {
    try {
        if (!isDarazConfigured()) {
            return NextResponse.json({
                configured: false,
                message: 'Daraz credentials not set in .env.local. Set DARAZ_APP_KEY, DARAZ_APP_SECRET, DARAZ_ACCESS_TOKEN.',
            }, { status: 200 });
        }

        const stats = await getDarazStats();
        return NextResponse.json({ configured: true, ...stats });
    } catch (error) {
        console.error('[Daraz Stats Error]', error.message);
        return NextResponse.json(
            { configured: true, error: error.message },
            { status: 500 }
        );
    }
}
