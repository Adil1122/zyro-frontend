import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { exchangeCodeAndConnectMerchant, validateSignupState } from '@/lib/services/metaEmbeddedSignup';

export const dynamic = 'force-dynamic';

async function resolveUserId(request) {
    let userId = request.headers.get('x-user-id');
    if (!userId || userId === 'null' || userId === 'undefined') {
        const { data: defaultUser } = await supabase
            .from('users')
            .select('id')
            .limit(1)
            .maybeSingle();
        userId = defaultUser?.id || null;
    }
    return userId;
}

export async function POST(request) {
    try {
        const userId = await resolveUserId(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { code, state, wabaId, phoneNumberId, displayPhoneNumber, url } = body;

        const effectiveCode = code || url || '';

        // Exchange code, retrieve assets, subscribe app, and save connection
        const result = await exchangeCodeAndConnectMerchant(userId, {
            code: effectiveCode,
            state,
            wabaId: wabaId || '1683429933404101',
            phoneNumberId: phoneNumberId || '1462001326987017',
            displayPhoneNumber: displayPhoneNumber || '+1 (555) 167-0097',
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('[Embedded Signup Exchange Error]:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
