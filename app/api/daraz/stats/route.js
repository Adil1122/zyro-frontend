import { NextResponse } from 'next/server';
import { getDarazStats, isDarazConfigured, getCredentials } from '@/lib/services/darazService';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ configured: false }, { status: 200 });

    try {
        const { data: user } = await supabase
            .from('users')
            .select('daraz_access_token, daraz_region')
            .eq('id', userId)
            .single();

        if (!isDarazConfigured(user)) {
            return NextResponse.json({ configured: false });
        }

        const stats = await getDarazStats(getCredentials(user));
        return NextResponse.json({ configured: true, ...stats });
    } catch (error) {
        console.error('[Daraz Stats Error]', error.message);
        return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
    }
}
