import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const notifications = [];
  const now = new Date();
  const yesterday = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  try {
    // ── 1. New orders in the last 24 h ────────────────────────────────────────
    const [{ count: newOrders }, { count: pendingCount }] = await Promise.all([
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', yesterday),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .ilike('status', 'pending'),
    ]);

    if ((newOrders ?? 0) > 0) {
      const n = newOrders;
      notifications.push({
        id: `orders_new_${n}`,
        icon: 'shopping-bag', color: '#60A5FA',
        title: `${n} new order${n !== 1 ? 's' : ''} received`,
        body: `${n} order${n !== 1 ? 's' : ''} came in over the last 24 hours.`,
        time: 'Last 24 h',
        href: '/',
        priority: 10,
      });
    }

    // ── 2. Pending orders needing confirmation ─────────────────────────────────
    if ((pendingCount ?? 0) > 0) {
      const n = pendingCount;
      notifications.push({
        id: `orders_pending_${n}`,
        icon: 'clock', color: '#FBBF24',
        title: `${n} order${n !== 1 ? 's' : ''} awaiting confirmation`,
        body: `${n} pending order${n !== 1 ? 's' : ''} need to be confirmed or booked.`,
        time: 'Action needed',
        href: '/',
        priority: 9,
      });
    }

    // ── 3. Inventory: low stock & out of stock ────────────────────────────────
    // PostgREST can't compare two columns directly, so we fetch and filter in JS.
    const { data: products } = await supabase
      .from('products')
      .select('name, stock, reorder_point')
      .eq('user_id', userId);

    if (products?.length) {
      const outOfStock = products.filter(p => (p.stock ?? 0) === 0);
      const lowStock   = products.filter(p => {
        const s = p.stock ?? 0;
        const r = p.reorder_point ?? 10;
        return s > 0 && s <= r;
      });

      if (outOfStock.length > 0) {
        const preview = outOfStock.slice(0, 2).map(p => p.name).join(', ');
        const extra   = outOfStock.length > 2 ? ` and ${outOfStock.length - 2} more` : '';
        notifications.push({
          id: `stock_out_${outOfStock.length}`,
          icon: 'package', color: '#F87171',
          title: `${outOfStock.length} product${outOfStock.length !== 1 ? 's' : ''} out of stock`,
          body: `${preview}${extra} ${outOfStock.length === 1 ? 'is' : 'are'} out of stock — restock needed.`,
          time: 'Inventory',
          href: '/',
          priority: 8,
        });
      }

      if (lowStock.length > 0) {
        const preview = lowStock.slice(0, 2).map(p => p.name).join(', ');
        const extra   = lowStock.length > 2 ? ` and ${lowStock.length - 2} more` : '';
        notifications.push({
          id: `stock_low_${lowStock.length}`,
          icon: 'alert-triangle', color: '#FBBF24',
          title: `${lowStock.length} product${lowStock.length !== 1 ? 's' : ''} running low`,
          body: `${preview}${extra} ${lowStock.length === 1 ? 'is' : 'are'} below reorder point.`,
          time: 'Inventory',
          href: '/',
          priority: 7,
        });
      }
    }

    // ── 4. Meta Ads snapshot staleness ────────────────────────────────────────
    const { data: adSnap } = await supabase
      .from('meta_ads_snapshot')
      .select('synced_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (adSnap?.synced_at) {
      const ageMins = Math.round((now - new Date(adSnap.synced_at)) / 60_000);
      if (ageMins > 60) {
        const timeLabel = ageMins < 120
          ? `${ageMins}m ago`
          : `${Math.round(ageMins / 60)}h ago`;
        notifications.push({
          id: `ads_stale_${ageMins}`,
          icon: 'refresh-cw', color: '#A78BFA',
          title: 'Meta Ads data is outdated',
          body: `Campaign stats were last synced ${timeLabel}. Open Marketing to refresh.`,
          time: timeLabel,
          href: '/marketing',
          priority: 5,
        });
      }
    }

    // ── 5. Subscription / plan status ─────────────────────────────────────────
    const { data: userRow } = await supabase
      .from('users')
      .select('subscription_status, trial_ends_at, plan_id')
      .eq('id', userId)
      .maybeSingle();

    if (userRow) {
      if (userRow.subscription_status === 'pending_verification') {
        notifications.push({
          id: 'payment_pending',
          icon: 'credit-card', color: '#34D399',
          title: 'Payment under review',
          body: 'Your manual payment receipt was received and is being verified — we\'ll notify you on WhatsApp.',
          time: 'Billing',
          href: '/plans',
          priority: 6,
        });
      }

      if (!userRow.plan_id && userRow.trial_ends_at) {
        const daysLeft = Math.ceil(
          (new Date(userRow.trial_ends_at) - now) / (1000 * 60 * 60 * 24)
        );
        if (daysLeft <= 3 && daysLeft >= 0) {
          notifications.push({
            id: `trial_expiring_${daysLeft}`,
            icon: 'zap', color: '#FB923C',
            title: daysLeft === 0 ? 'Trial expires today' : `Trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
            body: 'Upgrade to a paid plan to keep all your data and automation running.',
            time: 'Billing',
            href: '/plans',
            priority: 11,
          });
        }
      }
    }

    // Sort by priority (highest first)
    notifications.sort((a, b) => b.priority - a.priority);

    return NextResponse.json({ notifications, total: notifications.length });
  } catch (err) {
    console.error('[notifications]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
