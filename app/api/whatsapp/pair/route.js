import { NextResponse } from 'next/server';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { supabase } from '@/lib/supabase';
import {
    getPlatformWhatsAppConfig,
    resolveTenantWhatsAppCredentials,
    registerPendingPairingToken,
    DEFAULT_MERCHANT_PHONE,
} from '@/lib/whatsappSession';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper to generate a friendly pairing code: e.g. ZYRO-9482
function generatePairingCode() {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = 'ZYRO-';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

export async function POST(request) {
    try {
        let userId = request.headers.get('x-user-id');
        if (!userId || userId === 'null' || userId === 'undefined') {
            const { data: defaultUser } = await supabase.from('users').select('id').limit(1).maybeSingle();
            userId = defaultUser?.id || 'e5940095-1560-4425-ab60-f8fc5f7874f4';
        }

        const body = await request.json().catch(() => ({}));
        const { number, server = 'WhatsApp-69' } = body;
        const cleanedNumber = (number || '').trim().replace(/\D/g, '');

        // Resolve credentials (checks tenant overrides first, then Master Platform credentials)
        const creds = await resolveTenantWhatsAppCredentials(userId);
        const platform = getPlatformWhatsAppConfig();

        // Target official WhatsApp business number for verification handshake
        let officialBotPhone = platform.defaultMerchantPhone || DEFAULT_MERCHANT_PHONE;
        officialBotPhone = officialBotPhone.replace(/\D/g, '');
        if (officialBotPhone.startsWith('03')) officialBotPhone = '92' + officialBotPhone.substring(1);

        // Generate unique pairing code
        const pairingCode = generatePairingCode();

        // Register pairing token in active server memory for webhook verification
        registerPendingPairingToken(pairingCode, {
            userId,
            number: cleanedNumber,
        });

        // Create official Universal WhatsApp Deep Link
        // When scanned with any phone camera, opens WhatsApp with 1-tap verification message
        const verifyMessage = encodeURIComponent(`CONNECT-ZYRO ${pairingCode}`);
        const waDeepLink = `https://wa.me/${officialBotPhone}?text=${verifyMessage}`;

        // Generate high-resolution QR Code
        const qrDataUrl = await QRCode.toDataURL(waDeepLink, {
            width: 256,
            margin: 1,
            color: {
                dark: '#0A1C16',
                light: '#FFFFFF',
            },
            errorCorrectionLevel: 'M',
        });

        return NextResponse.json({
            success: true,
            qrDataUrl,
            waDeepLink,
            pairingCode,
            officialBotPhone,
            isPlatformManaged: creds.isUsingPlatformMaster,
            isMetaConfigured: creds.isConfigured,
            phoneNumberId: creds.phoneNumberId,
            expiresIn: 120, // 2 minutes
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
