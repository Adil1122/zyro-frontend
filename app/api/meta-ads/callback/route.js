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
    return new Response(getCallbackHTML('error', error), {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  if (!code || !state) {
    return new Response(getCallbackHTML('error', 'Missing parameters'), {
      headers: { 'Content-Type': 'text/html' }
    });
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
      return new Response(getCallbackHTML('error', 'Invalid state'), {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Get user's Meta Ads credentials from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('meta_app_id, meta_app_secret')
      .eq('id', stateData.user_id)
      .single();

    if (userError || !user || !user.meta_app_id || !user.meta_app_secret) {
      return new Response(getCallbackHTML('error', 'Meta credentials missing'), {
        headers: { 'Content-Type': 'text/html' }
      });
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

    return new Response(getCallbackHTML('success', 'meta_ads_connected'), {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('Meta Ads OAuth callback error:', error);
    return new Response(getCallbackHTML('error', error.message), {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

function getCallbackHTML(type, message) {
  if (type === 'success') {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Meta Ads Connected</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background: #f8f9fa;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
            }
            .container {
              text-align: center;
              padding: 40px;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              max-width: 400px;
              width: 90%;
            }
            .checkmark {
              width: 60px;
              height: 60px;
              background: #1877F2;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 20px;
              color: white;
              font-size: 24px;
            }
            h2 {
              font-size: 18px;
              font-weight: 600;
              color: #1a1a1a;
              margin: 0 0 8px;
            }
            p {
              font-size: 14px;
              color: #666;
              margin: 0 0 20px;
              line-height: 1.5;
            }
            .btn {
              background: #1877F2;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              text-decoration: none;
              display: inline-block;
            }
            .btn:hover {
              background: #166FE5;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="checkmark">✓</div>
            <h2>Meta Ads Connected Successfully!</h2>
            <p>Your Meta Ads account has been connected. You can now view your campaign data in the Marketing dashboard.</p>
            <a href="/marketing?meta_ads_connected=true" class="btn">Go to Marketing</a>
          </div>
          <script>
            setTimeout(() => {
              window.location.href = '/marketing?meta_ads_connected=true';
            }, 3000);
          </script>
        </body>
      </html>
    `;
  } else {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Connection Error</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background: #f8f9fa;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
            }
            .container {
              text-align: center;
              padding: 40px;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              max-width: 400px;
              width: 90%;
            }
            .error {
              width: 60px;
              height: 60px;
              background: #dc3545;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 20px;
              color: white;
              font-size: 24px;
            }
            h2 {
              font-size: 18px;
              font-weight: 600;
              color: #1a1a1a;
              margin: 0 0 8px;
            }
            p {
              font-size: 14px;
              color: #666;
              margin: 0 0 20px;
              line-height: 1.5;
            }
            .btn {
              background: #6c757d;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              text-decoration: none;
              display: inline-block;
            }
            .btn:hover {
              background: #5a6268;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">✕</div>
            <h2>Connection Failed</h2>
            <p>There was an error connecting your Meta Ads account: ${message}</p>
            <a href="/marketing?error=${encodeURIComponent(message)}" class="btn">Back to Marketing</a>
          </div>
        </body>
      </html>
    `;
  }
}
