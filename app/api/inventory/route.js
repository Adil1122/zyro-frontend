import { NextResponse } from 'next/server';
import { inventoryService } from '@/lib/services/inventoryService';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search') || '';

    try {
        const data = await inventoryService.getInventory(page, pageSize, search);
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
