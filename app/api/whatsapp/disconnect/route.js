import { NextResponse } from 'next/server';
import { resolveWhatsAppUserId } from '@/lib/whatsappAuth';
import { disconnectMerchantWhatsApp, hasStoredWhatsAppAuthorization } from '@/lib/services/metaEmbeddedSignup';

export const dynamic = 'force-dynamic';

/**
 * POST /api/whatsapp/disconnect
 *
 * Marks the connection disconnected and stops the merchant being treated as
 * active. Credentials are deliberately left in place so Connect can restore the
 * link without another Meta authorization, and message history, templates,
 * customers and conversations are untouched.
 */
export async function POST(request) {
    const userId = resolveWhatsAppUserId(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await disconnectMerchantWhatsApp(userId);

        // Tells the UI whether the follow-up Connect can skip Meta.
        const canReconnect = await hasStoredWhatsAppAuthorization(userId);

        console.log(`[WhatsApp Disconnect] user=${userId} canReconnect=${canReconnect}`);

        return NextResponse.json({
            success: true,
            status: 'disconnected',
            canReconnect,
            message: 'WhatsApp disconnected. Your message history and templates are unchanged.',
        });
    } catch (error) {
        console.error('[WhatsApp Disconnect]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
