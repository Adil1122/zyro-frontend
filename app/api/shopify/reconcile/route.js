import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabase } from '@/lib/supabase';
import { getValidShopifyCreds } from '@/lib/shopifyToken';
import { isShopifyConfigured } from '@/lib/services/shopifyService';
import { reconcileInventory } from '@/lib/services/shopifyInventory';

export const maxDuration = 60;

async function reconcileForUser(userId) {
    const creds = await getValidShopifyCreds(userId);
    if (!creds || !isShopifyConfigured(creds)) return { userId, skipped: 'not_configured' };
    return { userId, ...(await reconcileInventory(userId, creds)) };
}

// Single user: POST with x-user-id (the "Reconcile now" button).
export async function POST(request) {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        return NextResponse.json({ configured: true, ...(await reconcileForUser(userId)) });
    } catch (error) {
        console.error('[Shopify Reconcile Error]', error.message);
        if (error.message === 'SHOPIFY_TOKEN_EXPIRED') {
            return NextResponse.json({ configured: false, tokenExpired: true });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Scheduled sweep across every connected store. Guarded by CRON_SECRET so it
// cannot be triggered from outside; Vercel Cron sends it as a bearer token.
export async function GET(request) {
    const secret = process.env.CRON_SECRET;
    const auth = request.headers.get('authorization') || '';

    if (!secret || auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = supabaseAdmin || supabase;
    const { data: users, error } = await db
        .from('users')
        .select('id')
        .not('shopify_access_token', 'is', null);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results = [];
    for (const u of users || []) {
        try {
            results.push(await reconcileForUser(u.id));
        } catch (e) {
            results.push({ userId: u.id, error: e.message });
        }
    }

    const totalDrift = results.reduce((n, r) => n + (r.drift?.length || 0), 0);
    console.log(`[Shopify Reconcile] swept ${results.length} stores, ${totalDrift} drifted`);

    return NextResponse.json({ stores: results.length, totalDrift, results });
}
