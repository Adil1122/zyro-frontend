import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getPostExOrders, isPostExConfigured } from '@/lib/services/postexService';
import { whatsappService } from '@/lib/services/whatsappService';

const MISMATCH_THRESHOLD = 100;

/**
 * GET /api/cod/cron
 * Daily cron: checks each user's PostEx delivered orders vs recorded settlements
 * Sends mismatch alert if outstanding COD is high
 * Runs daily at 10 AM PKT (05:00 UTC)
 */
export async function GET(request) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'zyro_cron_secret';
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: users } = await supabase
        .from('users')
        .select('id, postex_api_key, currency, wa_is_active, wa_merchant_phone')
        .eq('wa_is_active', true)
        .not('wa_merchant_phone', 'is', null)
        .not('postex_api_key', 'is', null);

    if (!users?.length) {
        return NextResponse.json({ success: true, message: 'No users to check' });
    }

    const results = [];

    for (const user of users) {
        try {
            if (!isPostExConfigured(user.postex_api_key)) continue;

            const result = await getPostExOrders({ apiKey: user.postex_api_key, status: 'completed', perPage: 100 });
            const orders = result?.orders || [];
            const expectedCOD = orders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);

            // Get total already settled
            const { data: settlements } = await supabase
                .from('cod_settlements')
                .select('received_amount')
                .eq('user_id', user.id);

            const totalSettled = (settlements || []).reduce((s, r) => s + (parseFloat(r.received_amount) || 0), 0);
            const outstanding = expectedCOD - totalSettled;

            if (outstanding > MISMATCH_THRESHOLD) {
                const currency = user.currency || 'PKR';
                await whatsappService.sendCodMismatchAlert(user.id, {
                    expected: Math.round(expectedCOD),
                    received: Math.round(totalSettled),
                    difference: Math.round(outstanding),
                    currency,
                });
                results.push({ userId: user.id, outstanding, alerted: true });
            } else {
                results.push({ userId: user.id, outstanding, alerted: false });
            }
        } catch (err) {
            console.error(`[COD Cron] Error for user ${user.id}:`, err.message);
            results.push({ userId: user.id, error: err.message });
        }
    }

    return NextResponse.json({ success: true, processed: results.length, results });
}
