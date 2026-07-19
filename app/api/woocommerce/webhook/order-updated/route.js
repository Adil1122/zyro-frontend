import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { whatsappService } from '@/lib/services/whatsappService';

export async function POST(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

        const { data: user } = await supabase.from('users').select('id').eq('id', userId).maybeSingle();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const wcOrder = await request.json();
        if (!wcOrder?.id) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

        console.log(`[WC order.updated] Order #${wcOrder.number} → status: ${wcOrder.status}`);

        const billing = wcOrder.billing || {};
        const newStatus = wcOrder.status;
        const orderNumber = (wcOrder.number || wcOrder.id).toString();
        const total = parseFloat(wcOrder.total || 0);
        const customerName = `${billing.first_name || ''} ${billing.last_name || ''}`.trim() || 'Guest';

        // Find existing order
        const { data: existingOrder } = await supabase
            .from('orders')
            .select('id, status')
            .eq('user_id', userId)
            .eq('order_id', orderNumber)
            .maybeSingle();

        let dbOrderId = null;
        let statusChanged = false;

        if (existingOrder?.id) {
            dbOrderId = existingOrder.id;
            statusChanged = existingOrder.status?.toLowerCase() !== newStatus?.toLowerCase();

            await supabase.from('orders').update({
                status: newStatus,
                total_amount: total,
                customer_name: customerName,
                customer_email: billing.email || null,
                customer_phone: billing.phone || null,
                city: billing.city || null,
                updated_at: new Date().toISOString(),
            }).eq('id', existingOrder.id);

        } else {
            // Order doesn't exist yet — insert it
            const { data: newOrder } = await supabase.from('orders').insert({
                user_id: userId,
                order_id: orderNumber,
                platform_id: 1,
                status: newStatus,
                total_amount: total,
                customer_name: customerName,
                customer_email: billing.email || null,
                customer_phone: billing.phone || null,
                city: billing.city || null,
            }).select('id').single();

            dbOrderId = newOrder?.id;
            statusChanged = true;
        }

        // WhatsApp notification on key status changes
        if (statusChanged && dbOrderId && ['processing', 'completed', 'cancelled'].includes(newStatus?.toLowerCase())) {
            try {
                await whatsappService.sendOrderNotification(userId, dbOrderId, newStatus);
            } catch (err) {
                console.error('[WC order.updated] WhatsApp error:', err.message);
            }
        }

        return NextResponse.json({ success: true, dbOrderId, newStatus, statusChanged });

    } catch (error) {
        console.error('[WC order.updated Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
