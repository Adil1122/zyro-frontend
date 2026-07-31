import { NextResponse } from 'next/server';
import { customersService } from '@/lib/services/customersService';

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { name, phone, city, email } = body;
        if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        const customer = await customersService.createCustomer({ name: name.trim(), phone: phone?.trim() || null, city: city?.trim() || null, email: email?.trim() || null, userId });
        return NextResponse.json(customer, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search') || '';
    const userId = searchParams.get('userId');

    try {
        const data = await customersService.getCustomers(page, pageSize, search, userId);
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
