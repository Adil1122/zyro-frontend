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

    // Regional OAuth auth endpoints (discovered via Daraz portal)
    const AUTH_BASE = {
        pk: 'https://api.daraz.pk/oauth/authorize',
        bd: 'https://api.daraz.com.bd/oauth/authorize',
        lk: 'https://api.daraz.lk/oauth/authorize',
        my: 'https://api.lazada.com.my/oauth/authorize',
        sg: 'https://api.lazada.sg/oauth/authorize',
        th: 'https://api.lazada.co.th/oauth/authorize',
        ph: 'https://api.lazada.com.ph/oauth/authorize',
        id: 'https://api.lazada.co.id/oauth/authorize',
        vn: 'https://api.lazada.vn/oauth/authorize',
    };
    const authBase = AUTH_BASE[region || 'pk'] || AUTH_BASE['pk'];
    const authUrl = `${authBase}?response_type=code&agreement=true&redirect_auth=true&force_auth=true&redirect_uri=${encodeURIComponent(callbackUrl)}&client_id=${appKey}`;

    return NextResponse.json({ authUrl });
}
