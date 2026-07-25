import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { whatsappService } from '@/lib/services/whatsappService';
import { getPostExOrders, isPostExConfigured } from '@/lib/services/postexService';

const MISMATCH_THRESHOLD = 100; // alert if difference > Rs 100

/**
 * POST /api/cod/settlement
 * Record a COD settlement received from PostEx
 * Body: { receivedAmount, settlementDate, notes }
 */
export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { receivedAmount, settlementDate, notes } = await request.json();

        if (!receivedAmount || isNaN(parseFloat(receivedAmount))) {
            return NextResponse.json({ error: 'receivedAmount is required' }, { status: 400 });
        }

        const date = settlementDate || new Date().toISOString().split('T')[0];
        const received = parseFloat(receivedAmount);

        const { data: user } = await supabase
            .from('users')
            .select('postex_api_key, currency')
            .eq('id', userId)
            .single();

        // Calculate expected COD
        let expectedCOD = 0;
        let orderCount = 0;

        if (isPostExConfigured(user?.postex_api_key)) {
            const result = await getPostExOrders({ apiKey: user.postex_api_key, status: 'completed', perPage: 100 });
            const orders = result?.orders || [];
            orderCount = orders.length;
            expectedCOD = orders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
        } else {
            const { data: dbOrders } = await supabase
                .from('orders')
                .select('total_amount')
                .eq('user_id', userId)
                .in('status', ['completed', 'delivered']);
            orderCount = dbOrders?.length || 0;
            expectedCOD = (dbOrders || []).reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0);
        }

        const difference = Math.abs(expectedCOD - received);
        const hasMismatch = difference > MISMATCH_THRESHOLD;
        const status = hasMismatch ? 'mismatch' : 'matched';

        // Save settlement record
        const { data: settlement, error: insertErr } = await supabase
            .from('cod_settlements')
            .insert({
                user_id: userId,
                settlement_date: date,
                expected_amount: Math.round(expectedCOD),
                received_amount: Math.round(received),
                order_count: orderCount,
                mismatch_amount: Math.round(difference),
                status,
                notes: notes || null,
            })
            .select('id')
            .single();

        if (insertErr) throw insertErr;

        const formattedDate = new Date(date).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
        const currency = user?.currency || 'PKR';

        // Send WhatsApp settlement confirmation
        whatsappService.sendCodSettlementAlert(userId, {
            date: formattedDate,
            receivedAmount: Math.round(received),
            orderCount,
            currency,
        }).catch(err => console.error('[COD] Settlement WA error:', err.message));

        // Send mismatch alert if needed
        if (hasMismatch) {
            whatsappService.sendCodMismatchAlert(userId, {
                expected: Math.round(expectedCOD),
                received: Math.round(received),
                difference: Math.round(difference),
                currency,
            }).catch(err => console.error('[COD] Mismatch WA error:', err.message));
        }

        return NextResponse.json({
            success: true,
            settlementId: settlement.id,
            status,
            expectedCOD: Math.round(expectedCOD),
            receivedAmount: Math.round(received),
            difference: Math.round(difference),
            hasMismatch,
        });

    } catch (error) {
        console.error('[COD Settlement Error]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
