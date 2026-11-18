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

        const effectiveCode = (code || url || '').trim();
        if (!effectiveCode) {
            return NextResponse.json({ error: 'Meta onboarding was not completed (no authorization code received).' }, { status: 400 });
        }

        // If Meta returned a state, it must match a pending signup session for this user
        if (state) {
            const stateValid = await validateSignupState(userId, state);
            if (!stateValid) {
                return NextResponse.json({ error: 'Signup session is invalid or expired. Please start the WhatsApp onboarding again.' }, { status: 400 });
            }
        }

        // Exchange code, retrieve assets, subscribe app, and save connection
        const result = await exchangeCodeAndConnectMerchant(userId, {
            code: effectiveCode,
            state,
            wabaId: wabaId || null,
            phoneNumberId: phoneNumberId || null,
            displayPhoneNumber: displayPhoneNumber || null,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('[Embedded Signup Exchange Error]:', error.message);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
