import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

        const { data: user } = await supabase.from('users').select('id').eq('id', userId).maybeSingle();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        let wcOrder;
        try {
            wcOrder = await request.json();
        } catch {
            return NextResponse.json({ success: true, message: 'Ping received' });
        }

        if (!wcOrder?.id) return NextResponse.json({ success: true, message: 'Ping received' });

        const orderNumber = (wcOrder.number || wcOrder.id).toString();
        const newStatus = wcOrder.status;
        const total = parseFloat(wcOrder.total || 0);

        console.log(`[WC order.updated] Order #${orderNumber} → ${newStatus}`);

        const { data: existingOrder } = await supabase
            .from('orders')
            .select('id, status')
            .eq('user_id', userId)
            .eq('order_id', orderNumber)
            .maybeSingle();

        if (!existingOrder?.id) {
            return NextResponse.json({ success: true, message: 'Order not in Zyro yet — skipped' });
        }

        const statusChanged = existingOrder.status?.toLowerCase() !== newStatus?.toLowerCase();

        const { error: updateError } = await supabase
            .from('orders')
            .update({ status: newStatus, total_amount: total })
            .eq('id', existingOrder.id);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, dbOrderId: existingOrder.id, newStatus, statusChanged });

    } catch (error) {
        console.error('[WC order.updated Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
