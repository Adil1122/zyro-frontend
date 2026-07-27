import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { appKey, appSecret, region } = await request.json();
    if (!appKey || !appSecret) {
        return NextResponse.json({ error: 'App Key and App Secret are required' }, { status: 400 });
    }

    // Save credentials to DB now so callback can look them up by userId in state
    const { error: dbErr } = await supabase.from('users').update({
        daraz_app_key: appKey,
        daraz_app_secret: appSecret,
        daraz_region: region || 'pk',
    }).eq('id', userId);

    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.zyroocloud.com'}/api/daraz/callback`;
    // No state param — Lazada's auth server may reject unknown/long state values.
    // Callback looks up user by app_key extracted from the code instead.
    const authUrl = `https://auth.lazada.com/oauth/authorize?response_type=code&redirect_uri=${encodeURIComponent(callbackUrl)}&client_id=${appKey}`;

    return NextResponse.json({ authUrl });
}
