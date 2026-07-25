import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { whatsappService } from '@/lib/services/whatsappService';

/**
 * PATCH /api/purchase-orders/[id]
 * Mark a purchase order as received — fires supplier.po_received WhatsApp alert
 * Body: { status, receivedDate, notes }
 *   status must be 'received' to trigger the WA alert
 */
export async function PATCH(request, { params }) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;

    try {
        const { status, receivedDate, notes } = await request.json();

        // Fetch the PO with supplier details
        const { data: po, error: fetchErr } = await supabase
            .from('purchase_orders')
            .select('*, suppliers(name, phone)')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (fetchErr || !po) return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
        if (po.status === 'received') return NextResponse.json({ error: 'PO already marked as received' }, { status: 400 });

        const date = receivedDate || new Date().toISOString().split('T')[0];

        // Update PO status
        const { data: updated, error: updateErr } = await supabase
            .from('purchase_orders')
            .update({
                status: status || 'received',
                received_date: date,
                notes: notes ?? po.notes,
            })
            .eq('id', id)
            .select('*')
            .single();

        if (updateErr) throw updateErr;

        // Fire WhatsApp alert if marking as received
        if ((status || 'received') === 'received') {
            const formattedDate = new Date(date).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
            });
            const formattedTotal = new Intl.NumberFormat('en-PK').format(Math.round(po.total_amount));

            whatsappService.sendPOReceivedAlert(userId, {
                poNumber: po.po_number,
                supplierName: po.suppliers?.name || 'Supplier',
                totalAmount: formattedTotal,
                receivedDate: formattedDate,
            }).catch(err => console.error('[PO Received] WA alert error:', err.message));
        }

        return NextResponse.json({ success: true, purchaseOrder: updated });
    } catch (err) {
        console.error('[Purchase Orders PATCH] Error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
