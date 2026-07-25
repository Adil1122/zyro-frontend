import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { whatsappService } from '@/lib/services/whatsappService';

/**
 * GET /api/purchase-orders
 * List all purchase orders for the authenticated user
 */
export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
        .from('purchase_orders')
        .select('*, suppliers(name, phone)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ purchaseOrders: data || [] });
}

/**
 * POST /api/purchase-orders
 * Create a new purchase order and fire supplier.po_created WhatsApp alert
 * Body: { supplierId, items, totalAmount, notes }
 *   items: [{ name, quantity, unitPrice }]
 */
export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { supplierId, items, totalAmount, notes } = await request.json();

        if (!supplierId) return NextResponse.json({ error: 'supplierId is required' }, { status: 400 });
        if (!items?.length) return NextResponse.json({ error: 'items array is required' }, { status: 400 });

        // Fetch supplier to include in WA message
        const { data: supplier } = await supabase
            .from('suppliers')
            .select('name, phone')
            .eq('id', supplierId)
            .eq('user_id', userId)
            .single();

        if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

        // Generate PO number: PO-YYYYMMDD-<last4 of timestamp>
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const poNumber = `PO-${dateStr}-${String(Date.now()).slice(-4)}`;

        // Calculate total if not provided
        const total = totalAmount ?? items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

        const { data: po, error: insertErr } = await supabase
            .from('purchase_orders')
            .insert({
                user_id: userId,
                supplier_id: supplierId,
                po_number: poNumber,
                items,
                total_amount: total,
                status: 'draft',
                notes: notes || null,
            })
            .select('*')
            .single();

        if (insertErr) throw insertErr;

        // Fire WhatsApp alert to merchant
        const formattedTotal = new Intl.NumberFormat('en-PK').format(Math.round(total));
        whatsappService.sendPOCreatedAlert(userId, {
            poNumber,
            supplierName: supplier.name,
            totalAmount: formattedTotal,
            itemCount: items.length,
        }).catch(err => console.error('[PO] WA alert error:', err.message));

        return NextResponse.json({ success: true, purchaseOrder: po });
    } catch (err) {
        console.error('[Purchase Orders] Error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
