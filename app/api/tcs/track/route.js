import { NextResponse } from 'next/server';
import { trackTCSShipment, isTCSConfigured } from '@/lib/services/tcsService';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/tcs/track?cn=CONSIGNMENT_NUMBER
 */
export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const cn = searchParams.get('cn');
    if (!cn) return NextResponse.json({ error: 'Missing cn (consignment number) query param' }, { status: 400 });

    try {
        const { data: user } = await supabase
            .from('users')
            .select('tcs_api_key, tcs_api_password, tcs_cost_centre_code')
            .eq('id', userId)
            .single();

        const { tcs_api_key: apiKey, tcs_api_password: apiPassword, tcs_cost_centre_code: costCentreCode } = user || {};

        if (!isTCSConfigured(apiKey, apiPassword)) {
            return NextResponse.json({ configured: false, error: 'TCS credentials not configured' });
        }

        const result = await trackTCSShipment(apiKey, apiPassword, costCentreCode, cn);
        return NextResponse.json(result);
    } catch (error) {
        console.error('[TCS Track Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
