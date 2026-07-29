import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

const GRAPH_BASE = 'https://graph.facebook.com/v19.0';

// Map Meta ODAX objective enums → simplified display categories
const OBJECTIVE_MAP = {
  OUTCOME_SALES: 'Sales',        OUTCOME_AWARENESS: 'Awareness',
  OUTCOME_TRAFFIC: 'Traffic',    OUTCOME_ENGAGEMENT: 'Engagement',
  OUTCOME_LEADS: 'Leads',        OUTCOME_APP_PROMOTION: 'App',
  // Legacy (pre-ODAX)
  CONVERSIONS: 'Sales',          BRAND_AWARENESS: 'Awareness',
  REACH: 'Awareness',            TRAFFIC: 'Traffic',
  LINK_CLICKS: 'Traffic',        POST_ENGAGEMENT: 'Engagement',
  LEAD_GENERATION: 'Leads',      VIDEO_VIEWS: 'Awareness',
};

// effective_status → our simplified status
// effective_status accounts for delivery issues that status alone won't show
const STATUS_MAP = {
  ACTIVE: 'active',              IN_PROCESS: 'learning',
  LEARNING_LIMITED: 'learning',  PAUSED: 'paused',
  CAMPAIGN_PAUSED: 'paused',    ADSET_PAUSED: 'paused',
  DISAPPROVED: 'paused',        DELETED: 'paused',
  ARCHIVED: 'paused',
};

function getUserId(request) {
  return request.headers.get('x-user-id') || null;
}

// Parse a raw insights row into the campaign shape the frontend expects.
// Meta returns spend/revenue as strings — cast them, don't trust the type.
// Revenue and orders come from the actions / action_values arrays filtered to
// action_type: purchase, not from top-level fields.
function parseInsight(raw) {
  const purchase      = raw.actions?.find(a => a.action_type === 'purchase');
  const purchaseValue = raw.action_values?.find(a => a.action_type === 'purchase');
  return {
    spend:       parseFloat(raw.spend || 0),
    orders:      purchase      ? parseInt(purchase.value)            : 0,
    revenue:     purchaseValue ? parseFloat(purchaseValue.value)     : 0,
    impressions: parseInt(raw.impressions || 0),
    reach:       parseInt(raw.reach       || 0),
    clicks:      parseInt(raw.clicks      || 0),
    ctr:         parseFloat(raw.ctr       || 0),
    freq:        parseFloat(raw.frequency || 0) || null,
  };
}

async function metaFetch(path, token, params = {}) {
  const url = new URL(`${GRAPH_BASE}${path}`);
  url.searchParams.set('access_token', token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || 'Meta API error');
  return json;
}

// Fetch ad copy for one ad set.
// Advantage+ / Dynamic Creative returns asset_feed_spec (multiple variations).
// We label those rather than silently picking one.
async function fetchAdCopy(adsetId, token) {
  try {
    const res = await metaFetch(`/${adsetId}/ads`, token, {
      fields: 'id,creative{object_story_spec,asset_feed_spec}',
      limit: 5,
    });
    const ads = res.data || [];
    if (!ads.length) return { headline: null, body: null };

    const creative = ads[0].creative || {};

    if (creative.asset_feed_spec) {
      const titlesCount = creative.asset_feed_spec.titles?.length || 0;
      return {
        headline: 'Multiple variations running (Advantage+)',
        body: titlesCount > 0 ? `${titlesCount} headlines being tested by Meta` : 'Advantage+ Creative active',
        isAdvantage: true,
      };
    }

    const linkData = creative.object_story_spec?.link_data || {};
    return { headline: linkData.name || null, body: linkData.message || null };
  } catch {
    return { headline: null, body: null };
  }
}

export async function POST(request) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('meta_ads_access_token, meta_ads_token_expires_at, meta_ads_ad_account_id')
      .eq('id', userId)
      .single();

    if (userError || !user?.meta_ads_access_token) {
      return NextResponse.json({ error: 'Meta Ads not connected' }, { status: 400 });
    }
    if (!user.meta_ads_ad_account_id) {
      return NextResponse.json({ error: 'No ad account selected' }, { status: 400 });
    }
    if (new Date(user.meta_ads_token_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Meta Ads token expired. Please reconnect.' }, { status: 401 });
    }

    const token     = user.meta_ads_access_token;
    const accountId = user.meta_ads_ad_account_id;

    const now      = new Date();
    const since    = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const until    = now.toISOString().split('T')[0];
    const todayStr = until;

    // ── 1. Campaigns ──────────────────────────────────────────────────────────
    const campaignsRes = await metaFetch(`/${accountId}/campaigns`, token, {
      fields: 'id,name,objective,effective_status,daily_budget',
      limit: 100,
    });
    const rawCampaigns = campaignsRes.data || [];

    // ── 2. 30-day insights at campaign level ──────────────────────────────────
    const insightsRes = await metaFetch(`/${accountId}/insights`, token, {
      level:      'campaign',
      fields:     'campaign_id,spend,impressions,reach,frequency,clicks,ctr,actions,action_values',
      time_range: JSON.stringify({ since, until }),
      limit:      200,
    });
    const insightsByCampaign = {};
    for (const row of (insightsRes.data || [])) {
      insightsByCampaign[row.campaign_id] = parseInsight(row);
    }

    // ── 3. Today's spend for pacing (noted as in-progress, not final) ─────────
    const todayRes = await metaFetch(`/${accountId}/insights`, token, {
      level:      'campaign',
      fields:     'campaign_id,spend',
      time_range: JSON.stringify({ since: todayStr, until: todayStr }),
      limit:      200,
    });
    const todaySpendByCampaign = {};
    for (const row of (todayRes.data || [])) {
      todaySpendByCampaign[row.campaign_id] = parseFloat(row.spend || 0);
    }

    // ── 4. Ad sets + copy per campaign (batched to respect rate limits) ───────
    const campaigns = [];
    const BATCH_SIZE = 4;
    for (let i = 0; i < rawCampaigns.length; i += BATCH_SIZE) {
      const batch = rawCampaigns.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(batch.map(async (c) => {
        const m = insightsByCampaign[c.id] || { spend: 0, orders: 0, revenue: 0, impressions: 0, reach: 0, clicks: 0, ctr: 0, freq: null };

        let adSets = [];
        try {
          const adSetsRes = await metaFetch(`/${c.id}/adsets`, token, {
            fields:     'id,name,daily_budget,insights{spend,actions,action_values,ctr}',
            time_range: JSON.stringify({ since, until }),
            limit:      25,
          });

          adSets = await Promise.all((adSetsRes.data || []).map(async (a) => {
            const ai     = a.insights?.data?.[0] || {};
            const am     = parseInsight(ai);
            const copy   = await fetchAdCopy(a.id, token);
            return {
              name:     a.name,
              spend:    am.spend,
              revenue:  am.revenue,
              orders:   am.orders,
              ctr:      am.ctr,
              headline: copy.headline,
              body:     copy.body,
            };
          }));
        } catch { /* non-fatal — ad sets are optional */ }

        return {
          id:          c.id,
          name:        c.name,
          sub:         (OBJECTIVE_MAP[c.objective] || 'Campaign') + ' objective',
          objective:   OBJECTIVE_MAP[c.objective] || 'Sales',
          status:      STATUS_MAP[c.effective_status] || 'paused',
          spend:       m.spend,
          revenue:     m.revenue,
          orders:      m.orders,
          impressions: m.impressions,
          reach:       m.reach,
          clicks:      m.clicks,
          ctr:         m.ctr,
          freq:        m.freq,
          format:      '—',
          placement:   '—',
          // daily_budget from Meta is in cents — divide by 100
          dailyBudget: c.daily_budget ? parseInt(c.daily_budget) / 100 : 0,
          todaySpend:  todaySpendByCampaign[c.id] || 0,
          adSets,
        };
      }));

      for (const r of results) {
        if (r.status === 'fulfilled') campaigns.push(r.value);
      }
    }

    const snapshot = { campaigns, syncedAt: new Date().toISOString() };

    await supabase
      .from('meta_ads_snapshot')
      .upsert({ user_id: userId, data: snapshot, synced_at: snapshot.syncedAt }, { onConflict: 'user_id' });

    return NextResponse.json({ ok: true, syncedAt: snapshot.syncedAt, campaignCount: campaigns.length });
  } catch (error) {
    console.error('[meta-ads/sync]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
