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
    // Use Daraz-specific auth URL for PK, fall back to Lazada for other regions
    const authBase = (region || 'pk') === 'pk' ? 'https://auth.daraz.com.pk' : 'https://auth.lazada.com';
    const authUrl = `${authBase}/oauth/authorize?response_type=code&redirect_uri=${encodeURIComponent(callbackUrl)}&client_id=${appKey}&state=${userId}`;

    return NextResponse.json({ authUrl });
}
