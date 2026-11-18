import { NextResponse } from 'next/server';
import { resolveWhatsAppUserId } from '@/lib/whatsappAuth';
import {
    getMerchantWhatsAppConnection,
    hasStoredWhatsAppAuthorization,
    verifyStoredConnection,
} from '@/lib/services/metaEmbeddedSignup';

export const dynamic = 'force-dynamic';

/**
 * GET /api/whatsapp/connection-status
 *
 * Reports whether WhatsApp is live, and separately whether a stored
 * authorization exists that reconnect could use. The UI needs both: it decides
 * between "Connect WhatsApp" (reconnect silently) and "Reconnect with Meta"
 * (full OAuth) from canReconnect.
 *
 * Never returns a token, encrypted or otherwise.
 */
export async function GET(request) {
    const userId = resolveWhatsAppUserId(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const connection = await getMerchantWhatsAppConnection(userId);

        // A row saying 'connected' is not proof. Meta is asked before the status
        // is reported, so a fabricated or revoked record demotes itself instead of
        // needing to be deleted by hand.
        if (connection) {
            const verdict = await verifyStoredConnection(userId, connection);
            if (!verdict.valid) {
                return NextResponse.json({
                    status: 'disconnected',
                    connected: false,
                    canReconnect: await hasStoredWhatsAppAuthorization(userId),
                    connection: null,
                    reason: verdict.reason,
                });
            }
        }

        if (connection) {
            return NextResponse.json({
                status: 'connected',
                connected: true,
                canReconnect: false,
                connection: {
                    wabaId: connection.waba_id,
                    phoneNumberId: connection.phone_number_id,
                    displayPhoneNumber: connection.display_phone_number,
                    verifiedName: connection.verified_name,
                    qualityRating: connection.quality_rating,
                    connectedAt: connection.created_at || connection.updated_at,
                },
            });
        }

        const canReconnect = await hasStoredWhatsAppAuthorization(userId);

        return NextResponse.json({
            status: 'disconnected',
            connected: false,
            canReconnect,
            connection: null,
        });
    } catch (error) {
        console.error('[WhatsApp Connection Status]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
