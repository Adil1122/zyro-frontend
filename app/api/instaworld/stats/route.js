import { NextResponse } from 'next/server';
import { getInstaWorldStats, isInstaWorldConfigured } from '@/lib/services/instaworldService';
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
        const stats = await getInstaWorldStats(apiKey);
        return NextResponse.json({ configured: true, ...stats });
    } catch (error) {
        return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
    }
}
