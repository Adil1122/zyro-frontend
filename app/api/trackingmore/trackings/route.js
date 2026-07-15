import { NextResponse } from 'next/server';
import { getTrackings, addTracking, isTrackingMoreConfigured } from '@/lib/services/trackingmoreService';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { data: user } = await supabase
            .from('users')
            .select('trackingmore_api_key')
            .eq('id', userId)
            .single();

        const apiKey = user?.trackingmore_api_key;

        if (!isTrackingMoreConfigured(apiKey)) {
            return NextResponse.json({ configured: false, message: 'TrackingMore API key not configured' });
        }

        const { searchParams } = new URL(request.url);
        const page        = parseInt(searchParams.get('page')    || '1', 10);
        const perPage     = parseInt(searchParams.get('perPage') || '20', 10);
        const status      = searchParams.get('status') || 'any';
        const courierCode = searchParams.get('courier') || 'pakistan-post';

        const result = await getTrackings(apiKey, { page, limit: perPage, courierCode, status });
        return NextResponse.json({ configured: true, ...result });
    } catch (error) {
        console.error('[TrackingMore Trackings Error]', error.message);
        return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { trackingNumber, courierCode, customerName, customerPhone } = await request.json();

        const { data: user } = await supabase
            .from('users')
            .select('trackingmore_api_key')
            .eq('id', userId)
            .single();

        const apiKey = user?.trackingmore_api_key;

        if (!isTrackingMoreConfigured(apiKey)) {
            return NextResponse.json({ configured: false, error: 'TrackingMore API key not configured' });
        }

        const result = await addTracking(apiKey, trackingNumber, courierCode || 'pakistan-post', {
            customer_name:  customerName,
            customer_phone: customerPhone,
        });

        return NextResponse.json({ configured: true, ...result });
    } catch (error) {
        console.error('[TrackingMore Add Error]', error.message);
        return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
    }
}
