import { NextResponse } from 'next/server';
import { whatsappService } from '@/lib/services/whatsappService';
import { supabase } from '@/lib/supabase';

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
                return NextResponse.json({ success: true, result, message: `Status update (${status}) sent to ${customerPhone}` });
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
