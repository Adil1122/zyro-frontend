import { NextResponse } from 'next/server';
import { ordersService } from '@/lib/services/ordersService';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    try {
        const data = await ordersService.getOrders(page, pageSize, search, status);
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
