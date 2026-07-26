import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    console.log('[Daraz Callback] code:', code, '| state:', state);

    if (!code) {
        return NextResponse.json({ error: 'No authorization code received' }, { status: 400 });
    }

    return NextResponse.json({ success: true, code, state });
}
