import { NextResponse } from 'next/server';
import { trackTraxShipment, isTraxConfigured } from '@/lib/services/traxService';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const cn = searchParams.get('cn');
    if (!cn) return NextResponse.json({ error: 'Missing cn (consignment number) query param' }, { status: 400 });

    try {
        const { data: user } = await supabase
            .from('users').select('trax_api_key, trax_api_secret').eq('id', userId).single();

        const { trax_api_key: apiKey, trax_api_secret: apiSecret } = user || {};

        if (!isTraxConfigured(apiKey, apiSecret)) {
            return NextResponse.json({ configured: false, error: 'Trax credentials not configured' });
        }

        const result = await trackTraxShipment(apiKey, apiSecret, cn);
        return NextResponse.json(result);
    } catch (error) {
        console.error('[Trax Track Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
