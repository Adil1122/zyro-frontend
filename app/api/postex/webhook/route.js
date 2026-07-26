import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { whatsappService } from '@/lib/services/whatsappService';
import { mapPostExStatusToEvent } from '@/lib/services/postexService';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        // Validate user
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .maybeSingle();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let payload;
        try {
            payload = await request.json();
        } catch {
            return NextResponse.json({ success: true, message: 'Ping received' });
        }

        const trackingNumber = payload.trackingNumber || payload.TrackingNumber || '';
        const orderRef = payload.orderRefNumber || payload.OrderRefNumber || trackingNumber;
        const rawStatus = payload.transactionStatus || payload.TransactionStatus || payload.status || '';
        const customerPhone = payload.customerPhone || payload.CustomerPhone || '';
        const customerName = payload.customerName || payload.CustomerName || 'Customer';

        console.log(`[PostEx Webhook] userId=${userId} | order=${orderRef} | tracking=${trackingNumber} | status="${rawStatus}"`);

        if (!rawStatus) {
            return NextResponse.json({ success: true, message: 'No status in payload' });
        }

        const event = mapPostExStatusToEvent(rawStatus);
        console.log(`[PostEx Webhook] Mapped status "${rawStatus}" → event="${event}"`);

        if (!event) {
            return NextResponse.json({ success: true, message: `Status "${rawStatus}" requires no notification` });
        }

        // Look up customer phone from DB if not in payload
        let phone = customerPhone;
        if (!phone && orderRef) {
            const { data: orderRow } = await supabase
                .from('orders')
                .select('customers(contact)')
                .eq('user_id', userId)
                .eq('order_id', orderRef)
                .maybeSingle();
            phone = orderRow?.customers?.contact || '';
        }

        // Fire the right WhatsApp template based on event
        switch (event) {
            case 'picked_up':
                await whatsappService.sendShipmentPickedUp(userId, {
                    customerPhone: phone,
                    customerName,
                    orderRef,
                    trackingNumber,
                });
                break;

            case 'in_transit':
                await whatsappService.sendShipmentInTransit(userId, {
                    customerPhone: phone,
                    customerName,
                    orderRef,
                    trackingNumber,
                });
                break;

            case 'delivered':
                await whatsappService.sendShipmentDelivered(userId, {
                    customerPhone: phone,
                    customerName,
                    orderRef,
                });
                break;

            case 'failed':
                // Failed delivery — alert goes to merchant
                await whatsappService.sendShipmentFailed(userId, {
                    orderRef,
                    trackingNumber,
                    customerName,
                });
                break;

            case 'returned':
                // Return — alert goes to merchant
                await whatsappService.sendShipmentReturned(userId, {
                    orderRef,
                    trackingNumber,
                    customerName,
                });
                break;

            default:
                console.log(`[PostEx Webhook] No handler for event "${event}"`);
        }

        return NextResponse.json({ success: true, event, orderRef, trackingNumber });

    } catch (error) {
        console.error('[PostEx Webhook Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
