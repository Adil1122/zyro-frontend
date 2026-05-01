import { NextResponse } from 'next/server';
import { getPostExStats, isPostExConfigured } from '@/lib/services/postexService';
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

        const stats = await getPostExStats(apiKey);
        return NextResponse.json({ configured: true, ...stats });
    } catch (error) {
        console.error('[PostEx Stats Error]', error.message);
        return NextResponse.json(
            { configured: true, error: error.message },
            { status: 500 }
        );
    }
}
