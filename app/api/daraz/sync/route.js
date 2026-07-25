import { NextResponse } from 'next/server';
import { isDarazConfigured, getCredentials, syncDarazOrdersToDB } from '@/lib/services/darazService';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data: user } = await supabase
            .from('users')
            .select('daraz_app_key, daraz_app_secret, daraz_access_token, daraz_region')
            .eq('id', userId)
            .single();

        if (!isDarazConfigured(user)) {
            return NextResponse.json({ error: 'Daraz credentials not configured' }, { status: 400 });
        }

        const result = await syncDarazOrdersToDB(getCredentials(user), userId, supabase);

        return NextResponse.json({
            success: true,
            message: `Synced ${result.synced} new orders (${result.total} total from Daraz).`,
            ...result,
        });
    } catch (error) {
        console.error('[Daraz Sync Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
