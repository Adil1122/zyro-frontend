import { NextResponse } from 'next/server';
import { getDarazOrders, isDarazConfigured, getCredentials } from '@/lib/services/darazService';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ configured: false }, { status: 200 });

    try {
        const { data: user } = await supabase
            .from('users')
            .select('daraz_app_key, daraz_app_secret, daraz_access_token, daraz_region')
            .eq('id', userId)
            .single();

        if (!isDarazConfigured(user)) {
            return NextResponse.json({ configured: false, message: 'Daraz credentials not configured.' });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const perPage = Math.min(parseInt(searchParams.get('perPage') || '10', 10), 100);
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || 'all';

        const data = await getDarazOrders({ page, perPage, search, status, credentials: getCredentials(user) });
        return NextResponse.json({ configured: true, ...data });
    } catch (error) {
        console.error('[Daraz Orders Error]', error.message);
        return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
    }
}
