import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

        const { data: user } = await supabase.from('users').select('id').eq('id', userId).maybeSingle();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const wcOrder = await request.json();
        if (!wcOrder?.id) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

        const orderNumber = (wcOrder.number || wcOrder.id).toString();
        console.log(`[WC order.deleted] Order #${orderNumber} deleted in WooCommerce`);

        const { data: existingOrder } = await supabase
            .from('orders')
            .select('id, status')
            .eq('user_id', userId)
            .eq('order_id', orderNumber)
            .maybeSingle();

        if (!existingOrder?.id) {
            return NextResponse.json({ success: true, message: 'Order not found in Zyro — nothing to update' });
        }

        // Mark as cancelled instead of hard delete to preserve history
        await supabase.from('orders').update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
        }).eq('id', existingOrder.id);

        console.log(`[WC order.deleted] Order #${orderNumber} marked as cancelled in Zyro`);

        return NextResponse.json({ success: true, orderId: existingOrder.id, status: 'cancelled' });

    } catch (error) {
        console.error('[WC order.deleted Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
