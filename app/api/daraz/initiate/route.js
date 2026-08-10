import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.zyroocloud.com';

function buildAuthUrl(appKey, region, userId) {
    const r = region || 'pk';
    const callbackUrl = `${APP_URL}/api/daraz/callback`;
    const authBase = AUTH_BASE[r] || AUTH_BASE['pk'];
    return `${authBase}?response_type=code&force_auth=true`
        + `&redirect_uri=${encodeURIComponent(callbackUrl)}`
        + `&client_id=${appKey}`
        + `&state=${encodeURIComponent(userId)}`;
}

// GET — direct browser redirect (avoids async JS navigation issues)
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const region = searchParams.get('region') || 'pk';

    if (!userId) return NextResponse.redirect(`${APP_URL}/settings/stores?daraz=error&msg=no_user`);

    const appKey = process.env.DARAZ_APP_KEY;
    if (!appKey) return NextResponse.redirect(`${APP_URL}/settings/stores?daraz=error&msg=server_not_configured`);

    await supabase.from('users').update({ daraz_region: region }).eq('id', userId);

    return NextResponse.redirect(buildAuthUrl(appKey, region, userId));
}

// POST — kept for backward compatibility, returns JSON authUrl
export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const appKey = process.env.DARAZ_APP_KEY;
    if (!appKey) {
        return NextResponse.json({ error: 'Daraz integration not configured on this server. Contact support.' }, { status: 500 });
    }

    const { region } = await request.json();
    const r = region || 'pk';

    await supabase.from('users').update({ daraz_region: r }).eq('id', userId);

    return NextResponse.json({ authUrl: buildAuthUrl(appKey, r, userId) });
}
