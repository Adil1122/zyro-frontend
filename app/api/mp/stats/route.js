import { NextResponse } from 'next/server';
import { getMPStats, isMPConfigured } from '@/lib/services/mpService';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data: user } = await supabase
            .from('users')
            .select('mp_username, mp_password')
            .eq('id', userId)
            .single();

        const { mp_username: username, mp_password: password } = user || {};

        if (!isMPConfigured(username, password)) {
            return NextResponse.json({ configured: false, message: 'M&P credentials not configured' });
        }

        const stats = await getMPStats(username, password);
        return NextResponse.json({ configured: true, ...stats });
    } catch (error) {
        console.error('[M&P Stats Error]', error.message);
        return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
    }
}
