import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { whatsappService } from '@/lib/services/whatsappService';

export const dynamic = 'force-dynamic';

export async function PATCH(request, { params }) {
    try {
        const { id } = params;
        const { userId, action, status, address } = await request.json();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: order, error: fetchErr } = await supabase
            .from('orders')
            .select('*, customers(name, contact, city)')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (fetchErr || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

        if (action === 'status' || action === 'cancel') {
            const newStatus = action === 'cancel' ? 'cancelled' : (status || order.status);
            const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
            if (error) throw error;
            return NextResponse.json({ success: true, status: newStatus });
        }

        if (action === 'address') {
            const { error } = await supabase.from('customers')
                .update({ city: address?.city || '', name: address?.name || order.customers?.name || '' })
                .eq('id', order.customer_id);
            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        if (action === 'whatsapp') {
            const phone = order.customers?.contact || '';
            const customerName = order.customers?.name || 'Customer';
            if (!phone) return NextResponse.json({ error: 'No phone number for this customer' }, { status: 400 });

            await whatsappService.sendOrderStatusUpdate(
                userId, order.order_id, order.status, phone, customerName, order.total_amount
            );
            return NextResponse.json({ success: true });
        }

        if (action === 'update') {
            const updates = {};
            if (status) updates.status = status;
            const { error } = await supabase.from('orders').update(updates).eq('id', id);
            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = params;
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { error } = await supabase.from('orders').delete().eq('id', id).eq('user_id', userId);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
