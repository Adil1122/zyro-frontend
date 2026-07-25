import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getDarazStats, getCredentials } from '@/lib/services/darazService';

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { appKey, appSecret, accessToken, region } = await request.json();

        if (!appKey || !appSecret || !accessToken) {
            return NextResponse.json({ error: 'App Key, App Secret and Access Token are required' }, { status: 400 });
        }

        // Test connection before saving
        const credentials = { appKey, appSecret, accessToken, region: region || 'pk' };
        try {
            await getDarazStats(credentials);
        } catch (e) {
            return NextResponse.json({ error: `Connection failed: ${e.message}` }, { status: 400 });
        }

        // Save to users table
        const { error } = await supabase
            .from('users')
            .update({
                daraz_app_key: appKey,
                daraz_app_secret: appSecret,
                daraz_access_token: accessToken,
                daraz_region: region || 'pk',
                daraz_is_active: true,
            })
            .eq('id', userId);

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Daraz connected successfully' });
    } catch (error) {
        console.error('[Daraz Save Credentials Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
