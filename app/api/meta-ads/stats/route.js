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
    // Get user's Meta Ads credentials
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('meta_ads_access_token, meta_ads_token_expires_at, meta_ads_ad_account_id')
      .eq('id', userId)
      .single();

    if (userError || !user || !user.meta_ads_access_token) {
      return NextResponse.json({ error: 'Meta Ads not connected' }, { status: 400 });
    }

    if (!user.meta_ads_ad_account_id) {
      return NextResponse.json({ error: 'No ad account selected' }, { status: 400 });
    }

    // Check if token is expired
    if (new Date(user.meta_ads_token_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Meta Ads token expired' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const datePreset = searchParams.get('date_preset') || 'last_30d';
    const accountId = user.meta_ads_ad_account_id;

    // Fetch campaigns with stats
    const campaignsResponse = await fetch(
      `https://graph.facebook.com/v18.0/act_${accountId}/campaigns?fields=id,name,status,objective,buying_type,created_time,updated_time,insights{spend,impressions,clicks,reach,cpc,ctr}&date_preset=${datePreset}&access_token=${user.meta_ads_access_token}`
    );

    const campaignsData = await campaignsResponse.json();

    if (!campaignsResponse.ok || campaignsData.error) {
      throw new Error(campaignsData.error?.message || 'Failed to fetch campaigns');
    }

    // Process and store campaign data
    const campaigns = [];
    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalReach = 0;

    if (campaignsData.data) {
      for (const campaign of campaignsData.data) {
        const insights = campaign.insights?.data?.[0] || {};
        
        const campaignData = {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          objective: campaign.objective,
          buying_type: campaign.buying_type,
          created_time: campaign.created_time,
          updated_time: campaign.updated_time,
          spend: parseFloat(insights.spend || 0),
          impressions: parseInt(insights.impressions || 0),
          clicks: parseInt(insights.clicks || 0),
          reach: parseInt(insights.reach || 0),
          cpc: parseFloat(insights.cpc || 0),
          ctr: parseFloat(insights.ctr || 0),
        };

        campaigns.push(campaignData);

        // Accumulate totals
        totalSpend += campaignData.spend;
        totalImpressions += campaignData.impressions;
        totalClicks += campaignData.clicks;
        totalReach += campaignData.reach;

        // Store in database
        await supabase
          .from('meta_ads_campaigns')
          .upsert({
            user_id: userId,
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            status: campaign.status,
            objective: campaign.objective,
            spend: campaignData.spend,
            impressions: campaignData.impressions,
            clicks: campaignData.clicks,
            reach: campaignData.reach,
            updated_at: new Date(),
          });
      }
    }

    // Calculate ROAS (Return on Ad Spend)
    // Note: Revenue calculation would need to be implemented based on your order tracking
    const totalRevenue = 0; // This should be calculated from your orders data
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    // Get order count for the same period
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, total_amount, created_at')
      .eq('user_id', userId)
      .gte('created_at', getDateFromPreset(datePreset));

    const totalOrders = orders ? orders.length : 0;
    const calculatedRevenue = orders ? orders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) : 0;
    const calculatedRoas = totalSpend > 0 ? calculatedRevenue / totalSpend : 0;

    // Store daily stats
    const today = new Date().toISOString().split('T')[0];
    await supabase
      .from('meta_ads_stats')
      .upsert({
        user_id: userId,
        campaign_id: 'all',
        date: today,
        spend: totalSpend,
        impressions: totalImpressions,
        clicks: totalClicks,
        reach: totalReach,
        revenue: calculatedRevenue,
        orders: totalOrders,
      });

    const stats = {
      totalSpend,
      totalImpressions,
      totalClicks,
      totalReach,
      totalOrders,
      revenue: calculatedRevenue,
      roas: calculatedRoas,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      campaigns,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Meta Ads stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function getDateFromPreset(preset) {
  const now = new Date();
  switch (preset) {
    case 'last_7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case 'last_30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    case 'last_90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }
}
