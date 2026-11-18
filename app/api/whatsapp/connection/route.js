import { NextResponse } from 'next/server';
import { resolveWhatsAppUserId } from '@/lib/whatsappAuth';
import { getMerchantWhatsAppConnection, disconnectMerchantWhatsApp } from '@/lib/services/metaEmbeddedSignup';

export const dynamic = 'force-dynamic';

// Previously fell back to the first row in `users` when the header was missing,
// which let an unauthenticated caller read one merchant's phone number and WABA
// id, or disconnect them. Absent header now means unauthorized.
async function resolveUserId(request) {
    return resolveWhatsAppUserId(request);
}

export async function GET(request) {
    try {
        const userId = await resolveUserId(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const connection = await getMerchantWhatsAppConnection(userId);

        if (!connection) {
            return NextResponse.json({
                connected: false,
                connection: null,
            });
        }

        return NextResponse.json({
            connected: true,
            connection: {
                id: connection.id,
                wabaId: connection.waba_id,
                phoneNumberId: connection.phone_number_id,
                displayPhoneNumber: connection.display_phone_number,
                verifiedName: connection.verified_name,
                qualityRating: connection.quality_rating,
                status: connection.connection_status,
                onboardingType: connection.onboarding_type,
                connectedAt: connection.created_at || connection.updated_at,
            }
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const userId = await resolveUserId(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await disconnectMerchantWhatsApp(userId);

        return NextResponse.json({ success: true, message: 'WhatsApp Business account disconnected successfully' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
