import { NextResponse } from 'next/server';
import { couriersService } from '@/lib/services/couriersService';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    try {
        const data = await couriersService.getCouriers(page, pageSize);
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
