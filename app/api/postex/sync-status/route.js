import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getPostExAllStatuses, mapPostExStatusToEvent, POSTEX_TERMINAL_EVENTS } from '@/lib/services/postexService';
import { whatsappService } from '@/lib/services/whatsappService';

/**
 * GET /api/postex/sync-status
 * Cron: polls PostEx for shipment status changes every 2 hours.
 *
 * For each active user:
 *   1. Load confirmed wa_pending_orders with a tracking number that aren't terminal yet
 *   2. Bulk-fetch all PostEx statuses in one API call per user
 *   3. Compare each order's current PostEx status to its stored postex_last_status
 *   4. On change → fire appropriate WhatsApp → update postex_last_status in DB
 *
 * Required DB column: wa_pending_orders.postex_last_status (TEXT, nullable)
 * Run: vercel.json → "0 * /2 * * *" (every 2 hours UTC)
 */
export async function GET(request) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'zyro_cron_secret';
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all users with PostEx configured and WA active
    const { data: users } = await supabase
        .from('users')
        .select('id, postex_api_key, wa_is_active')
        .eq('wa_is_active', true)
        .not('postex_api_key', 'is', null);

    if (!users?.length) {
        return NextResponse.json({ success: true, message: 'No users to sync' });
    }

    const results = [];

    for (const user of users) {
        try {
            // Load all tracked (confirmed) orders that haven't reached a terminal state
            const { data: pendingOrders } = await supabase
                .from('wa_pending_orders')
                .select('id, order_ref, phone, customer_name, postex_tracking_number, postex_last_status')
                .eq('user_id', user.id)
                .eq('status', 'confirmed')
                .not('postex_tracking_number', 'is', null)
                .not('postex_last_status', 'in', '("delivered","failed","returned")');

            if (!pendingOrders?.length) {
                results.push({ userId: user.id, skipped: true, reason: 'no active shipments' });
                continue;
            }

            // One bulk PostEx call per user (efficient — avoids per-tracking-number requests)
            const { success, statusMap, error: apiErr } = await getPostExAllStatuses(user.postex_api_key);
            if (!success) {
                results.push({ userId: user.id, error: apiErr });
                continue;
            }

            let notified = 0;

            for (const order of pendingOrders) {
                const trackingNumber = order.postex_tracking_number;
                const rawStatus = statusMap.get(trackingNumber);
                if (!rawStatus) continue; // tracking not found in PostEx response yet

                const event = mapPostExStatusToEvent(rawStatus);
                if (!event) continue; // still booked/pending, no notification
                if (event === order.postex_last_status) continue; // already notified for this status

                const ctx = {
                    customerPhone: order.phone,
                    customerName: order.customer_name || 'Customer',
                    orderRef: order.order_ref,
                    trackingNumber,
                };

                // Fire WhatsApp for this status change
                let waResult;
                if (event === 'picked_up') {
                    waResult = await whatsappService.sendShipmentPickedUp(user.id, ctx);
                } else if (event === 'in_transit') {
                    waResult = await whatsappService.sendShipmentInTransit(user.id, ctx);
                } else if (event === 'delivered') {
                    waResult = await whatsappService.sendShipmentDelivered(user.id, ctx);
                } else if (event === 'failed') {
                    waResult = await whatsappService.sendShipmentFailed(user.id, ctx);
                } else if (event === 'returned') {
                    waResult = await whatsappService.sendShipmentReturned(user.id, ctx);
                }

                console.log(`[PostEx Sync] Order ${order.order_ref} | ${order.postex_last_status || 'new'} → ${event} | WA: ${waResult?.success ? 'sent' : 'failed'}`);

                // Update postex_last_status in DB
                await supabase
                    .from('wa_pending_orders')
                    .update({ postex_last_status: event })
                    .eq('id', order.id);

                notified++;
            }

            results.push({ userId: user.id, checked: pendingOrders.length, notified });
        } catch (err) {
            console.error(`[PostEx Sync] Error for user ${user.id}:`, err.message);
            results.push({ userId: user.id, error: err.message });
        }
    }

    return NextResponse.json({ success: true, processed: results.length, results });
}
