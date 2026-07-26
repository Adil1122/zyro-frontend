import { NextResponse } from 'next/server';
import { whatsappService } from '@/lib/services/whatsappService';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/whatsapp/test-automations
 * Diagnose WhatsApp config and optionally send a test template.
 * Query params: ?phone=07XXXXXXXXX&template=order_shipped
 */
export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Missing x-user-id header' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const testPhone = searchParams.get('phone');
    const testTemplate = searchParams.get('template') || 'order_created';

    const { data: user, error: userErr } = await supabase
        .from('users')
        .select('id, wa_phone_number_id, wa_access_token, wa_is_active, wa_merchant_phone, currency, wa_template_shipped, wa_template_cancelled, wa_template_payment')
        .eq('id', userId)
        .maybeSingle();

    if (userErr || !user) {
        return NextResponse.json({ error: 'User not found', detail: userErr?.message }, { status: 404 });
    }

    const checks = {
        wa_is_active: user.wa_is_active,
        wa_phone_number_id: user.wa_phone_number_id ? `${String(user.wa_phone_number_id).substring(0, 6)}...` : null,
        wa_access_token: user.wa_access_token ? `${String(user.wa_access_token).substring(0, 8)}...` : null,
        wa_merchant_phone: user.wa_merchant_phone,
        wa_template_shipped: user.wa_template_shipped || '(default: order_shipped)',
        wa_template_cancelled: user.wa_template_cancelled || '(default: order_canceled)',
        wa_template_payment: user.wa_template_payment || '(default: payment_received)',
        currency: user.currency,
    };

    let testResult = null;
    if (testPhone && user.wa_is_active && user.wa_phone_number_id && user.wa_access_token) {
        const recipientPhone = whatsappService.formatPhoneNumber(testPhone);
        if (recipientPhone) {
            const templateParams = {
                'order_created': ['Test Customer', 'TEST-001', `${user.currency || 'GBP'} 25.00`],
                'order_shipped': ['Test Customer', 'TEST-001'],
                'order_canceled': ['Test Customer', 'TEST-001', '25.00'],
                'payment_received': ['Test Customer', 'TEST-001', `${user.currency || 'GBP'} 25.00`],
                'order_status_update': ['Test Customer', 'TEST-001', 'Payment Failed'],
            };
            try {
                testResult = await whatsappService.sendMetaWhatsAppTemplate({
                    phoneNumberId: user.wa_phone_number_id,
                    accessToken: user.wa_access_token,
                    recipientPhone,
                    templateName: testTemplate,
                    params: templateParams[testTemplate] || templateParams['order_created'],
                });
            } catch (err) {
                testResult = { error: err.message };
            }
        } else {
            testResult = { error: `Invalid phone format: ${testPhone}` };
        }
    }

    return NextResponse.json({
        status: 'ok',
        checks,
        testResult: testPhone ? testResult : 'Add ?phone=07XXXXXXXXX to send a test template',
        hint: testPhone ? null : 'Example: ?phone=07XXXXXXXXX&template=order_shipped',
    });
}

export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { action } = body;

        switch (action) {

            case 'send_status_update': {
                const { customerPhone, customerName, orderNumber, status, total } = body;
                if (!customerPhone || !orderNumber || !status) {
                    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
                }
                const result = await whatsappService.sendOrderStatusUpdate(
                    userId, orderNumber, status, customerPhone, customerName || 'Customer', total || 0
                );
                const ok = !result?.error && !result?.reason;
                return NextResponse.json({
                    success: ok,
                    result,
                    message: ok
                        ? `Status update (${status}) sent to ${customerPhone}`
                        : result?.error || result?.reason || 'WhatsApp send failed',
                });
            }

            case 'send_merchant_alert': {
                const { orderNumber, customerName, total } = body;
                if (!orderNumber) return NextResponse.json({ error: 'Missing orderNumber' }, { status: 400 });

                // Get merchant email from users table for display
                const { data: user } = await supabase.from('users').select('wa_merchant_phone').eq('id', userId).single();

                const result = await whatsappService.sendMerchantOrderAlert(
                    userId, orderNumber, customerName || 'Test Customer', total || 0
                );
                return NextResponse.json({
                    success: !result?.error,
                    result,
                    merchantPhone: user?.wa_merchant_phone || 'Not set',
                    message: user?.wa_merchant_phone
                        ? `Merchant alert sent to ${user.wa_merchant_phone}`
                        : 'wa_merchant_phone not set in your profile — add it in Supabase',
                });
            }

            case 'send_low_stock_alert': {
                const { productName, stock } = body;
                if (!productName) return NextResponse.json({ error: 'Missing productName' }, { status: 400 });

                const { data: user } = await supabase.from('users').select('wa_merchant_phone').eq('id', userId).single();

                const result = await whatsappService.sendLowStockAlert(userId, productName, parseInt(stock ?? 3));
                return NextResponse.json({
                    success: !result?.error,
                    result,
                    merchantPhone: user?.wa_merchant_phone || 'Not set',
                    message: user?.wa_merchant_phone
                        ? `Low stock alert sent to ${user.wa_merchant_phone}`
                        : 'wa_merchant_phone not set in your profile — add it in Supabase',
                });
            }

            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }

    } catch (error) {
        console.error('[WhatsApp Test Automations]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
