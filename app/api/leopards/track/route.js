import { NextResponse } from 'next/server';
import { trackLeopardsPacket, isLeopardsConfigured } from '@/lib/services/leopardsService';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/leopards/track?cn=TRACKING_NUMBER
 */
export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const cn = searchParams.get('cn');
    if (!cn) return NextResponse.json({ error: 'Missing cn query param' }, { status: 400 });

    try {
        const { data: user } = await supabase
            .from('users')
            .select('leopards_api_key, leopards_api_password')
            .eq('id', userId)
            .single();

        const { leopards_api_key: apiKey, leopards_api_password: apiPassword } = user || {};

        if (!isLeopardsConfigured(apiKey, apiPassword)) {
            return NextResponse.json({ configured: false, error: 'Leopards credentials not configured' });
        }

        const result = await trackLeopardsPacket(apiKey, apiPassword, cn);
        return NextResponse.json(result);
    } catch (error) {
        console.error('[Leopards Track Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
