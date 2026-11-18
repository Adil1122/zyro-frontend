import { NextResponse } from 'next/server';
import { resolveWhatsAppUserId } from '@/lib/whatsappAuth';
import { reconnectMerchantWhatsApp } from '@/lib/services/metaEmbeddedSignup';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/whatsapp/reconnect
 *
 * Restores a previously authorized connection using the stored credentials,
 * after verifying them against Meta. Returns 409 with reauthRequired when the
 * authorization is genuinely gone, so the UI can offer Meta OAuth only then —
 * and 503 for a Meta outage, which should be retried rather than re-authorized.
 */
export async function POST(request) {
    const userId = resolveWhatsAppUserId(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await reconnectMerchantWhatsApp(userId);

        if (result.ok) {
            return NextResponse.json({
                success: true,
                status: 'connected',
                connection: result.connection,
                message: 'WhatsApp connected successfully!',
            });
        }

        return NextResponse.json({
            success: false,
            status: 'disconnected',
            reauthRequired: result.reauthRequired,
            reason: result.reason,
            message: result.message,
        }, { status: result.reauthRequired ? 409 : 503 });
    } catch (error) {
        console.error('[WhatsApp Reconnect]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
