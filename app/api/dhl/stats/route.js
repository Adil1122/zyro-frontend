import { NextResponse } from 'next/server';
import { getDHLStats, isDHLConfigured } from '@/lib/services/dhlService';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data: user } = await supabase
            .from('users')
            .select('dhl_api_key, dhl_api_secret, dhl_account_number')
            .eq('id', userId)
            .single();

        const { dhl_api_key: apiKey, dhl_api_secret: apiSecret, dhl_account_number: accountNumber } = user || {};

        if (!isDHLConfigured(apiKey, apiSecret, accountNumber)) {
            return NextResponse.json({ configured: false, message: 'DHL credentials not configured' });
        }

        const stats = await getDHLStats(apiKey, apiSecret, accountNumber);
        return NextResponse.json({ configured: true, ...stats });
    } catch (error) {
        console.error('[DHL Stats Error]', error.message);
        return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
    }
}
