import { NextResponse } from 'next/server';
import { dashboardService } from '@/lib/services/dashboardService';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const range = searchParams.get('range') || '7d';

        // Required: the service reads with the service-role client, so an absent
        // userId would drop the per-tenant filter and aggregate every account.
        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        const data = await dashboardService.getDashboardStats(userId, range);
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
