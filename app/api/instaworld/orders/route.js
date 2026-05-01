import { NextResponse } from 'next/server';
import { getInstaWorldOrders, isInstaWorldConfigured } from '@/lib/services/instaworldService';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { data: user } = await supabase
            .from('users')
            .select('instaworld_api_key')
            .eq('id', userId)
            .single();

        const apiKey = user?.instaworld_api_key;

        if (!isInstaWorldConfigured(apiKey)) {
            return NextResponse.json({ configured: false });
        }
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const perPage = parseInt(searchParams.get('perPage') || '10', 10);
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || 'any';

        const result = await getInstaWorldOrders({ apiKey, page, perPage, search, status });
        return NextResponse.json({ configured: true, ...result });
    } catch (error) {
        return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
    }
}
