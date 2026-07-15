import { NextResponse } from 'next/server';
import { getLeopardsCities, isLeopardsConfigured } from '@/lib/services/leopardsService';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/leopards/cities
 * Returns list of all Leopards cities with their IDs.
 * Used by the booking form to pick destination_city.
 */
export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

        const result = await getLeopardsCities(apiKey, apiPassword);
        return NextResponse.json(result);
    } catch (error) {
        console.error('[Leopards Cities Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
