import { NextResponse } from 'next/server';
import { dashboardService } from '@/lib/services/dashboardService';

export async function GET() {
    try {
        const data = await dashboardService.getDashboardStats();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
