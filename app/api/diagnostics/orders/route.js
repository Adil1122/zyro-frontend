import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabase } from '@/lib/supabase';
import { STORE_PLATFORM_IDS, storeLabel } from '@/lib/platforms';

// Diagnostic. Answers "is the dashboard wrong, or is the table empty?"
// Reports which stores are connected and what the orders table actually holds.
// Counts and dates only — never credentials.
export async function GET(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = supabaseAdmin || supabase;

    const { data: user, error: userError } = await db
        .from('users')
        .select('shopify_store_domain, shopify_access_token, wc_store_url, wc_consumer_key, daraz_access_token, daraz_is_active')
        .eq('id', userId)
        .single();

    const connected = {
        shopify: !!(user?.shopify_store_domain && user?.shopify_access_token),
        woocommerce: !!(user?.wc_store_url && user?.wc_consumer_key),
        daraz: !!(user?.daraz_access_token && user?.daraz_is_active),
    };

    const { data: rows, error: ordersError } = await db
        .from('orders')
        .select('platform_id, total_amount, created_at')
        .eq('user_id', userId);

    const byPlatform = {};
    for (const row of rows || []) {
        const label = storeLabel(row.platform_id);
        if (!byPlatform[label]) {
            byPlatform[label] = { orders: 0, revenue: 0, oldest: null, newest: null };
        }
        const bucket = byPlatform[label];
        bucket.orders += 1;
        bucket.revenue += parseFloat(row.total_amount) || 0;
        if (!bucket.oldest || row.created_at < bucket.oldest) bucket.oldest = row.created_at;
        if (!bucket.newest || row.created_at > bucket.newest) bucket.newest = row.created_at;
    }
    for (const bucket of Object.values(byPlatform)) {
        bucket.revenue = Math.round(bucket.revenue);
    }

    // How many fall inside the ranges the dashboard offers, so a store with only
    // older orders is not mistaken for a store with none.
    const now = Date.now();
    const withinDays = days => (rows || []).filter(
        r => now - new Date(r.created_at).getTime() <= days * 86400000
    ).length;

    return NextResponse.json({
        usingServiceRole: !!supabaseAdmin,
        userError: userError ? userError.message : null,
        ordersError: ordersError ? ordersError.message : null,
        connectedStores: connected,
        totalOrdersInDatabase: (rows || []).length,
        byPlatform,
        ordersInLast7Days: withinDays(7),
        ordersInLast30Days: withinDays(30),
        knownPlatformIds: STORE_PLATFORM_IDS,
    });
}
