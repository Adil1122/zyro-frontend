import { NextResponse } from 'next/server';
import { getDarazOrders, isDarazConfigured } from '@/lib/services/darazService';

/**
 * GET /api/daraz/orders
 * Query params:
 *   page      (default: 1)
 *   perPage   (default: 10, max: 100)
 *   search    (optional: order ID substring)
 *   status    (optional: all | pending | processing | packed | shipped | delivered | canceled | returned)
 */
export async function GET(request) {
    try {
        if (!isDarazConfigured()) {
            return NextResponse.json({
                configured: false,
                message: 'Daraz credentials not set in .env.local.',
            }, { status: 200 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const perPage = Math.min(parseInt(searchParams.get('perPage') || '10', 10), 100);
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || 'all';

        const data = await getDarazOrders({ page, perPage, search, status });
        return NextResponse.json({ configured: true, ...data });
    } catch (error) {
        console.error('[Daraz Orders Error]', error.message);
        return NextResponse.json(
            { configured: true, error: error.message },
            { status: 500 }
        );
    }
}
