import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

// Meta App Configuration
const META_REDIRECT_URI = process.env.META_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/meta-ads/callback`;

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
      .eq('provider', 'meta_ads')
      .eq('state', state)
      .single();

    if (stateError || !stateData || new Date(stateData.expires_at) < new Date()) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/marketing?error=invalid_state`);
    }

    // Get user's Meta Ads credentials from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('meta_app_id, meta_app_secret')
      .eq('id', stateData.user_id)
      .single();

    if (userError || !user || !user.meta_app_id || !user.meta_app_secret) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/marketing?error=meta_credentials_missing`);
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: user.meta_app_id,
        client_secret: user.meta_app_secret,
        redirect_uri: META_REDIRECT_URI,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      throw new Error(tokenData.error?.message || 'Failed to exchange code for token');
    }

    // Get user's ad accounts
    const adAccountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_status&access_token=${tokenData.access_token}`
    );

    const adAccountsData = await adAccountsResponse.json();

    if (!adAccountsResponse.ok || adAccountsData.error) {
      throw new Error(adAccountsData.error?.message || 'Failed to fetch ad accounts');
    }

    // Update user's Meta Ads credentials
    await supabase
      .from('users')
      .update({
        meta_ads_access_token: tokenData.access_token,
        meta_ads_refresh_token: tokenData.refresh_token || null,
        meta_ads_token_expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)),
        meta_ads_connected_at: new Date(),
        meta_ads_enabled: true,
      })
      .eq('id', stateData.user_id);

    // Clean up state
    await supabase
      .from('oauth_states')
      .delete()
      .eq('provider', 'meta_ads')
      .eq('state', state);

    // Store ad accounts for selection
    if (adAccountsData.data && adAccountsData.data.length > 0) {
      await supabase
        .from('meta_ad_accounts')
        .upsert(
          adAccountsData.data.map(account => ({
            user_id: stateData.user_id,
            account_id: account.id,
            account_name: account.name,
            account_status: account.account_status,
          }))
        );
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/marketing?meta_ads_connected=true`);

  } catch (error) {
    console.error('Meta Ads OAuth callback error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/marketing?error=${encodeURIComponent(error.message)}`);
  }
}
