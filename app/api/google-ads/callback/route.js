import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

// Google Ads OAuth Configuration
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/google-ads/callback`;

export async function GET(request) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/marketing?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/marketing?error=missing_parameters`);
  }

  try {
    // Verify state parameter
    const { data: stateData, error: stateError } = await supabase
      .from('oauth_states')
      .select('user_id, expires_at')
      .eq('provider', 'google_ads')
      .eq('state', state)
      .single();

    if (stateError || !stateData || new Date(stateData.expires_at) < new Date()) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/marketing?error=invalid_state`);
    }

    // Get user's Google Ads credentials from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('google_ads_client_id, google_ads_client_secret')
      .eq('id', stateData.user_id)
      .single();

    if (userError || !user || !user.google_ads_client_id || !user.google_ads_client_secret) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/marketing?error=google_credentials_missing`);
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: user.google_ads_client_id,
        client_secret: user.google_ads_client_secret,
        redirect_uri: GOOGLE_REDIRECT_URI,
        code: code,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      throw new Error(tokenData.error?.message || 'Failed to exchange code for token');
    }

    // Get user's Google Ads accounts
    const accountsResponse = await fetch('https://googleads.googleapis.com/v17/customers:listAccessibleCustomers', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'developer-token': user.google_ads_developer_token,
      },
    });

    const accountsData = await accountsResponse.json();

    if (!accountsResponse.ok || accountsData.error) {
      throw new Error(accountsData.error?.message || 'Failed to fetch Google Ads accounts');
    }

    // Update user's Google Ads credentials
    await supabase
      .from('users')
      .update({
        google_ads_access_token: tokenData.access_token,
        google_ads_refresh_token: tokenData.refresh_token || null,
        google_ads_token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)),
        google_ads_connected_at: new Date(),
        google_ads_enabled: true,
      })
      .eq('id', stateData.user_id);

    // Clean up state
    await supabase
      .from('oauth_states')
      .delete()
      .eq('provider', 'google_ads')
      .eq('state', state);

    // Store accessible accounts for selection
    if (accountsData.resourceNames && accountsData.resourceNames.length > 0) {
      await supabase
        .from('google_ad_accounts')
        .upsert(
          accountsData.resourceNames.map((resourceName, index) => ({
            user_id: stateData.user_id,
            customer_id: resourceName.split('/').pop(),
            resource_name: resourceName,
            display_name: `Account ${index + 1}`, // Will be updated with actual names later
          }))
        );
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/marketing?google_ads_connected=true`);

  } catch (error) {
    console.error('Google Ads OAuth callback error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/marketing?error=${encodeURIComponent(error.message)}`);
  }
}
