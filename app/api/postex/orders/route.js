import { NextResponse } from 'next/server';
import { getPostExOrders, isPostExConfigured } from '@/lib/services/postexService';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { data: user } = await supabase
            .from('users')
            .select('postex_api_key')
            .eq('id', userId)
            .single();

        const apiKey = user?.postex_api_key;

        if (!isPostExConfigured(apiKey)) {
            return NextResponse.json({
                configured: false,
                message: 'PostEx API Key not configured in database',
            }, { status: 200 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const perPage = parseInt(searchParams.get('perPage') || '10', 10);
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || 'any';

        const result = await getPostExOrders({ apiKey, page, perPage, search, status });
        return NextResponse.json({ configured: true, ...result });
    } catch (error) {
        console.error('[PostEx Orders Error]', error.message);
        return NextResponse.json(
            { configured: true, error: error.message },
            { status: 500 }
        );
    }
}
