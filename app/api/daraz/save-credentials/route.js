import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getDarazStats } from '@/lib/services/darazService';

// Manual token save — used when user pastes their own access token
export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const appKey = process.env.DARAZ_APP_KEY;
    const appSecret = process.env.DARAZ_APP_SECRET;
    if (!appKey || !appSecret) {
        return NextResponse.json({ error: 'Daraz integration not configured on this server. Contact support.' }, { status: 500 });
    }

    try {
        const { accessToken, region } = await request.json();
        if (!accessToken) {
            return NextResponse.json({ error: 'Access Token is required' }, { status: 400 });
        }

        // Test the token before saving
        try {
            await getDarazStats({ appKey, appSecret, accessToken, region: region || 'pk' });
        } catch (e) {
            return NextResponse.json({ error: `Connection failed: ${e.message}` }, { status: 400 });
        }

        const { error } = await supabase.from('users').update({
            daraz_access_token: accessToken,
            daraz_region: region || 'pk',
            daraz_is_active: true,
        }).eq('id', userId);

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Daraz connected successfully' });
    } catch (error) {
        console.error('[Daraz Save Credentials Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { error } = await supabase.from('users').update({
            daraz_access_token: null,
            daraz_region: null,
            daraz_is_active: false,
        }).eq('id', userId);

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Daraz disconnected successfully' });
    } catch (error) {
        console.error('[Daraz Disconnect Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
