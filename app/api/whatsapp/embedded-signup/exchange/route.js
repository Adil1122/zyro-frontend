import { NextResponse } from 'next/server';
import { resolveWhatsAppUserId } from '@/lib/whatsappAuth';
import { exchangeCodeAndConnectMerchant } from '@/lib/services/metaEmbeddedSignup';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request) {
    const userId = resolveWhatsAppUserId(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { code, state, wabaId, phoneNumberId, url } = body;

        // Identifiers are passed through only as hints; the service accepts them
        // solely when Meta's own token grants them. No defaults: substituting
        // placeholder ids here is what produced a connected-looking account
        // with a fictional +1 (555) number and no authorization behind it.
        const result = await exchangeCodeAndConnectMerchant(userId, {
            code: code || url || '',
            state,
            wabaId: wabaId || null,
            phoneNumberId: phoneNumberId || null,
        });

        return NextResponse.json(result, { status: result.success ? 200 : 400 });
    } catch (error) {
        console.error('[Embedded Signup Exchange Error]:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
