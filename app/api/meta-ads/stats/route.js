import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

const SYNC_INTERVAL_MS = 20 * 60 * 1000; // 20 minutes

function getUserId(request) {
  return (
    request.headers.get('x-user-id') ||
    request.headers.get('authorization')?.replace('Bearer ', '') ||
    null
  );
}

// Trigger a background sync without waiting for it to finish.
// This keeps the stats endpoint fast — it always returns the stored snapshot
// and lets the sync update it in the background.
async function triggerSync(userId, request) {
  try {
    const origin = request.nextUrl.origin;
    fetch(`${origin}/api/meta-ads/sync`, {
      method:  'POST',
      headers: { 'x-user-id': userId, 'Content-Type': 'application/json' },
    }).catch(() => {}); // fire-and-forget
  } catch { /* non-fatal */ }
}

export async function GET(request) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 1. Verify the user has Meta Ads connected
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('meta_ads_access_token, meta_ads_ad_account_id')
    .eq('id', userId)
    .single();

  if (userError || !user?.meta_ads_access_token || !user?.meta_ads_ad_account_id) {
    return NextResponse.json({ error: 'Meta Ads not connected' }, { status: 400 });
  }

  // 2. Read from stored snapshot — never call Meta API directly on page load
  const { data: snapshotRow } = await supabase
    .from('meta_ads_snapshot')
    .select('data, synced_at')
    .eq('user_id', userId)
    .single();

  const now = Date.now();

  if (!snapshotRow || !snapshotRow.data) {
    // No snapshot yet — trigger a first sync and tell the client to retry
    triggerSync(userId, request);
    return NextResponse.json({ syncing: true, message: 'First sync in progress — refresh in 30 seconds' }, { status: 202 });
  }

  const syncedAt  = new Date(snapshotRow.synced_at).getTime();
  const ageMs     = now - syncedAt;
  const isStale   = ageMs > SYNC_INTERVAL_MS;

  // If stale, kick off a background sync (don't await — return cached data immediately)
  if (isStale) triggerSync(userId, request);

  const { campaigns = [], syncedAt: ts } = snapshotRow.data;

  return NextResponse.json({
    campaigns,
    syncedAt:         ts || snapshotRow.synced_at,
    syncedMinutesAgo: Math.round(ageMs / 60000),
    isStale,
    // legacy totals shape — kept so existing callers don't break
    totalSpend:    campaigns.reduce((s, c) => s + (c.spend || 0), 0),
    revenue:       campaigns.reduce((s, c) => s + (c.revenue || 0), 0),
    totalOrders:   campaigns.reduce((s, c) => s + (c.orders || 0), 0),
    roas:          (() => {
      const sp = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
      const rv = campaigns.reduce((s, c) => s + (c.revenue || 0), 0);
      return sp > 0 ? rv / sp : 0;
    })(),
  });
}
