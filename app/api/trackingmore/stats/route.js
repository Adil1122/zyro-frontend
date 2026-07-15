import { NextResponse } from 'next/server';
import { getTrackingMoreStats, isTrackingMoreConfigured } from '@/lib/services/trackingmoreService';
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

        const stats = await getTrackingMoreStats(apiKey);
        return NextResponse.json({ configured: true, ...stats });
    } catch (error) {
        console.error('[TrackingMore Stats Error]', error.message);
        return NextResponse.json({ configured: true, error: error.message }, { status: 500 });
    }
}
