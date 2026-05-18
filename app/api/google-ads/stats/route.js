import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

// Helper function to get user ID from request
function getUserIdFromRequest(request) {
  // Try to get user ID from Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Try to get user ID from custom header
  const userIdHeader = request.headers.get('x-user-id');
  if (userIdHeader) {
    return userIdHeader;
  }
  
  // Try to get user ID from cookie
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    
    if (cookies.user_id) {
      return cookies.user_id;
    }
  }
  
  return null;
}

// Helper function to automatically refresh Google Ads access token if expired
async function refreshGoogleAdsTokenIfNeeded(userId, user) {
  const expiry = new Date(user.google_ads_token_expires_at);
  const now = new Date();
  
  // If token is still valid (with a 60-second buffer), return it
  if (expiry > new Date(now.getTime() + 60000)) {
    return user.google_ads_access_token;
  }
  
  console.log(`Google Ads access token expired or expiring soon for user ${userId}. Refreshing...`);
  
  if (!user.google_ads_refresh_token) {
    throw new Error('Google Ads refresh token not available. Please reconnect your account.');
  }
  
  if (!user.google_ads_client_id || !user.google_ads_client_secret) {
    throw new Error('Google Ads OAuth client credentials not found in user record.');
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: user.google_ads_client_id,
      client_secret: user.google_ads_client_secret,
      refresh_token: user.google_ads_refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  const responseText = await tokenResponse.text();
  if (!tokenResponse.ok) {
    throw new Error(`Failed to refresh Google Ads token: ${responseText}`);
  }

  const tokenData = JSON.parse(responseText);
  const newExpiry = new Date(Date.now() + (tokenData.expires_in * 1000));

  // Update new access token in database
  const { error: updateError } = await supabase
    .from('users')
    .update({
      google_ads_access_token: tokenData.access_token,
      google_ads_token_expires_at: newExpiry
    })
    .eq('id', userId);

  if (updateError) {
    console.error('Failed to save refreshed token to database:', updateError);
  }

  return tokenData.access_token;
}

export async function GET(request) {
  const userId = getUserIdFromRequest(request);
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user's Google Ads credentials
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('google_ads_access_token, google_ads_token_expires_at, google_ads_developer_token, google_ads_customer_id, google_ads_refresh_token, google_ads_client_id, google_ads_client_secret')
      .eq('id', userId)
      .single();

    if (userError || !user || !user.google_ads_access_token) {
      return NextResponse.json({ error: 'Google Ads not connected' }, { status: 400 });
    }

    if (!user.google_ads_customer_id) {
      return NextResponse.json({ error: 'No Google Ads account selected' }, { status: 400 });
    }

    // Refresh token if needed
    let activeAccessToken = user.google_ads_access_token;
    try {
      activeAccessToken = await refreshGoogleAdsTokenIfNeeded(userId, user);
    } catch (refreshError) {
      console.error('Google Ads token refresh failed:', refreshError);
      return NextResponse.json({ error: `Token refresh failed: ${refreshError.message}` }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const datePreset = searchParams.get('date_preset') || 'LAST_7_DAYS';
    const rawCustomerId = user.google_ads_customer_id;
    const cleanCustomerId = rawCustomerId.replace('customers/', '').replace(/-/g, '').trim();

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

    // Execute GAQL query to get real Google Ads data
    const queryResponse = await fetch(`https://googleads.googleapis.com/v20/customers/${cleanCustomerId}/googleAds:searchStream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${activeAccessToken}`,
        'developer-token': user.google_ads_developer_token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        query: gaqlQuery.trim()
      }),
    });

    const rawResponseText = await queryResponse.text();
    let queryData;
    try {
      queryData = JSON.parse(rawResponseText);
    } catch (parseError) {
      throw new Error(`Google Ads returned non-JSON response (Status ${queryResponse.status}) during search: ${rawResponseText.substring(0, 300)}`);
    }

    if (!queryResponse.ok) {
      let errorMessage = 'Failed to execute Google Ads query';
      if (Array.isArray(queryData) && queryData[0]?.error) {
        errorMessage = queryData[0].error.message;
      } else if (queryData?.error) {
        errorMessage = queryData.error.message;
      } else {
        errorMessage = `HTTP error ${queryResponse.status}: ${rawResponseText.substring(0, 200)}`;
      }
      throw new Error(errorMessage);
    }

    // Process and aggregate campaign data
    const campaigns = new Map();
    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalConversions = 0;

    // Extract results safely from both Array and Object response formats
    const results = [];
    if (Array.isArray(queryData)) {
      for (const chunk of queryData) {
        if (chunk.results) {
          results.push(...chunk.results);
        }
      }
    } else if (queryData.results) {
      results.push(...queryData.results);
    }

    // Process streaming response
    if (results.length > 0) {
      for (const result of results) {
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
