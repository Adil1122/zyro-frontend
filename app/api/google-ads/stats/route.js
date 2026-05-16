import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUserId } from '@/lib/supabase';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

export async function GET(request) {
  const userId = getCurrentUserId();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user's Google Ads credentials
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('google_ads_access_token, google_ads_token_expires_at, google_ads_developer_token, google_ads_customer_id')
      .eq('id', userId)
      .single();

    if (userError || !user || !user.google_ads_access_token) {
      return NextResponse.json({ error: 'Google Ads not connected' }, { status: 400 });
    }

    if (!user.google_ads_customer_id) {
      return NextResponse.json({ error: 'No Google Ads account selected' }, { status: 400 });
    }

    // Check if token is expired
    if (new Date(user.google_ads_token_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Google Ads token expired' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const datePreset = searchParams.get('date_preset') || 'LAST_7_DAYS';
    const customerId = user.google_ads_customer_id;

    // GAQL query for campaign stats
    const gaqlQuery = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversion_rate,
        segments.date
      FROM campaign
      WHERE segments.date DURING ${datePreset}
      AND campaign.status != 'REMOVED'
    `;

    // Execute GAQL query
    const queryResponse = await fetch(`https://googleads.googleapis.com/v17/customers/${customerId}:searchStream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.google_ads_access_token}`,
        'developer-token': user.google_ads_developer_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: gaqlQuery.trim()
      }),
    });

    const queryData = await queryResponse.json();

    if (!queryResponse.ok || queryData.error) {
      throw new Error(queryData.error?.message || 'Failed to execute GAQL query');
    }

    // Process and aggregate campaign data
    const campaigns = new Map();
    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalConversions = 0;

    // Process streaming response
    if (queryData.results) {
      for (const result of queryData.results) {
        const campaignId = result.campaign?.id;
        const date = result.segments?.date;
        
        if (!campaignId || !date) continue;

        if (!campaigns.has(campaignId)) {
          campaigns.set(campaignId, {
            id: campaignId,
            name: result.campaign?.name || `Campaign ${campaignId}`,
            status: result.campaign?.status || 'UNKNOWN',
            channel_type: result.campaign?.advertisingChannelType || 'UNKNOWN',
            spend: 0,
            impressions: 0,
            clicks: 0,
            conversions: 0,
            ctr: 0,
            avg_cpc: 0,
            conversion_rate: 0,
            daily_data: []
          });
        }

        const campaign = campaigns.get(campaignId);
        const costMicros = parseFloat(result.metrics?.costMicros || 0);
        const impressions = parseInt(result.metrics?.impressions || 0);
        const clicks = parseInt(result.metrics?.clicks || 0);
        const conversions = parseFloat(result.metrics?.conversions || 0);
        const ctr = parseFloat(result.metrics?.ctr || 0);
        const avgCpc = parseFloat(result.metrics?.averageCpc || 0);
        const conversionRate = parseFloat(result.metrics?.conversionRate || 0);

        // Update campaign totals
        campaign.spend += costMicros / 1000000; // Convert micros to dollars
        campaign.impressions += impressions;
        campaign.clicks += clicks;
        campaign.conversions += conversions;
        campaign.ctr = ctr;
        campaign.avg_cpc = avgCpc;
        campaign.conversion_rate = conversionRate;

        // Add daily data
        campaign.daily_data.push({
          date: date,
          spend: costMicros / 1000000,
          impressions: impressions,
          clicks: clicks,
          conversions: conversions
        });

        // Update global totals
        totalSpend += costMicros / 1000000;
        totalImpressions += impressions;
        totalClicks += clicks;
        totalConversions += conversions;
      }
    }

    // Convert Map to array
    const campaignArray = Array.from(campaigns.values());

    // Store campaign data in database
    for (const campaign of campaignArray) {
      await supabase
        .from('google_ads_campaigns')
        .upsert({
          user_id: userId,
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          status: campaign.status,
          channel_type: campaign.channel_type,
          spend: campaign.spend,
          impressions: campaign.impressions,
          clicks: campaign.clicks,
          conversions: campaign.conversions,
          ctr: campaign.ctr,
          avg_cpc: campaign.avg_cpc,
          conversion_rate: campaign.conversion_rate,
          updated_at: new Date(),
        });
    }

    // Get order data with UTM parameters for the same period
    const startDate = getDateFromPreset(datePreset);
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, total_amount, created_at, utm_source, utm_campaign, utm_medium, gclid')
      .eq('user_id', userId)
      .gte('created_at', startDate);

    const totalOrders = orders ? orders.length : 0;
    const calculatedRevenue = orders ? orders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) : 0;
    
    // Filter orders from Google Ads
    const googleAdsOrders = orders ? orders.filter(order => 
      order.utm_source === 'google' || order.gclid
    ) : [];
    
    const googleAdsRevenue = googleAdsOrders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
    const roas = totalSpend > 0 ? googleAdsRevenue / totalSpend : 0;

    // Store daily stats
    const today = new Date().toISOString().split('T')[0];
    await supabase
      .from('google_ads_stats')
      .upsert({
        user_id: userId,
        campaign_id: 'all',
        date: today,
        spend: totalSpend,
        impressions: totalImpressions,
        clicks: totalClicks,
        conversions: totalConversions,
        revenue: googleAdsRevenue,
        orders: googleAdsOrders.length,
        roas: roas,
      });

    const stats = {
      totalSpend,
      totalImpressions,
      totalClicks,
      totalConversions,
      totalOrders: googleAdsOrders.length,
      revenue: googleAdsRevenue,
      roas,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
      campaigns: campaignArray,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Google Ads stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function getDateFromPreset(preset) {
  const now = new Date();
  switch (preset) {
    case 'LAST_7_DAYS':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case 'LAST_30_DAYS':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    case 'LAST_90_DAYS':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }
}
