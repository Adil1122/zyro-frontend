import { NextResponse } from 'next/server';
import { dashboardService } from '@/lib/services/dashboardService';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const data = await dashboardService.getDashboardStats(userId);
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
