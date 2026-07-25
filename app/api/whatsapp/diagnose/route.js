import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { whatsappService } from '@/lib/services/whatsappService';

/**
 * GET /api/whatsapp/diagnose
 * Checks every step of the WhatsApp notification flow and reports exactly what's wrong.
 * Pass ?phone=03XXXXXXXXX to also send a live test message.
 */
export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Missing x-user-id header' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const testPhone = searchParams.get('phone');

    const checks = [];

    // ── 1. Fetch user WA config ──────────────────────────────────────────────
    const { data: user, error: userErr } = await supabase
        .from('users')
        .select('id, wa_phone_number_id, wa_access_token, wa_is_active, wa_merchant_phone, wa_template_name, currency')
        .eq('id', userId)
        .single();

    if (userErr || !user) {
        return NextResponse.json({ error: 'User not found', userErr }, { status: 404 });
    }

    checks.push({
        check: 'wa_is_active',
        pass: user.wa_is_active === true,
        value: user.wa_is_active,
        fix: 'Go to WhatsApp Settings in Zyro and enable WhatsApp',
    });

    checks.push({
        check: 'wa_phone_number_id',
        pass: !!user.wa_phone_number_id,
        value: user.wa_phone_number_id ? `${user.wa_phone_number_id.substring(0, 6)}...` : null,
        fix: 'Add your WhatsApp Phone Number ID from Meta Business Manager',
    });

    checks.push({
        check: 'wa_access_token',
        pass: !!user.wa_access_token,
        value: user.wa_access_token ? `${user.wa_access_token.substring(0, 8)}...` : null,
        fix: 'Add your WhatsApp Access Token from Meta Business Manager',
    });

    checks.push({
        check: 'wa_merchant_phone',
        pass: !!user.wa_merchant_phone,
        value: user.wa_merchant_phone || null,
        fix: 'Set your personal WhatsApp number in Settings to receive merchant alerts',
    });

    // ── 2. Check template name ───────────────────────────────────────────────
    checks.push({
        check: 'order_created_template',
        pass: true,
        value: 'order_created (hardcoded)',
        fix: 'No action needed',
    });

    // ── 3. Phone formatting test ─────────────────────────────────────────────
    if (testPhone) {
        const formatted = whatsappService.formatPhoneNumber(testPhone);
        checks.push({
            check: 'phone_format',
            pass: !!formatted,
            value: formatted || 'INVALID',
            input: testPhone,
            fix: formatted ? null : 'Use format 03XXXXXXXXX or +923XXXXXXXXX',
        });
    }

    // ── 4. Send live test message ────────────────────────────────────────────
    let testMessageResult = null;
    if (testPhone && user.wa_is_active && user.wa_phone_number_id && user.wa_access_token) {
        const recipientPhone = whatsappService.formatPhoneNumber(testPhone);
        if (recipientPhone) {
            try {
                testMessageResult = await whatsappService.sendMetaWhatsAppTemplate({
                    phoneNumberId: user.wa_phone_number_id,
                    accessToken: user.wa_access_token,
                    recipientPhone,
                    templateName: 'order_created',
                    params: ['Test Customer', 'TEST-001', `${user.currency || 'PKR'} 1,500`],
                });
            } catch (err) {
                testMessageResult = { success: false, error: err.message };
            }
        }
    }

    const allPassed = checks.filter(c => !c.pass);

    return NextResponse.json({
        status: allPassed.length === 0 ? 'ALL CHECKS PASSED' : 'ISSUES FOUND',
        failedChecks: allPassed.length,
        checks,
        testMessageResult: testPhone ? testMessageResult : 'Add ?phone=03XXXXXXXXX to send a test message',
        summary: allPassed.length === 0
            ? 'WhatsApp is fully configured. If messages are still not received, check Vercel logs for errors.'
            : `Fix ${allPassed.length} issue(s): ${allPassed.map(c => c.check).join(', ')}`,
    });
}
