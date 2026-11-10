import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createSignupSession } from '@/lib/services/metaEmbeddedSignup';

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
            return NextResponse.json({ error: 'Authentication required to connect WhatsApp' }, { status: 401 });
        }

        const session = await createSignupSession(userId);

        return NextResponse.json({
            success: true,
            signupUrl: session.hostedSignupUrl,
            rawState: session.rawState,
            appId: session.appId,
            configId: session.configId,
            graphApiVersion: session.graphApiVersion,
            redirectUri: session.redirectUri,
            expiresAt: session.expiresAt,
        });
    } catch (error) {
        console.error('[Embedded Signup Start Error]:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
