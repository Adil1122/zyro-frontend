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
      .select('google_ads_access_token, google_ads_token_expires_at, google_ads_developer_token, google_ads_refresh_token, google_ads_client_id, google_ads_client_secret')
      .eq('id', userId)
      .single();

    if (userError || !user || !user.google_ads_access_token) {
      return NextResponse.json({ error: 'Google Ads not connected' }, { status: 400 });
    }

    // Refresh token if needed
    let activeAccessToken = user.google_ads_access_token;
    try {
      activeAccessToken = await refreshGoogleAdsTokenIfNeeded(userId, user);
    } catch (refreshError) {
      console.error('Google Ads token refresh failed:', refreshError);
      return NextResponse.json({ error: `Token refresh failed: ${refreshError.message}` }, { status: 401 });
    }

    // Get stored accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('google_ad_accounts')
      .select('*')
      .eq('user_id', userId);

    if (accountsError) {
      throw accountsError;
    }

    // If no stored accounts, fetch fresh from Google Ads
    if (!accounts || accounts.length === 0) {
      const accountsResponse = await fetch('https://googleads.googleapis.com/v20/customers:listAccessibleCustomers', {
        headers: {
          'Authorization': `Bearer ${activeAccessToken}`,
          'developer-token': user.google_ads_developer_token,
        },
      });

      const rawResponseText = await accountsResponse.text();
      let accountsData;
      try {
        accountsData = JSON.parse(rawResponseText);
      } catch (parseError) {
        throw new Error(`Google Ads returned non-JSON response (Status ${accountsResponse.status}) during customer listing: ${rawResponseText.substring(0, 300)}`);
      }

      if (!accountsResponse.ok || accountsData.error) {
        throw new Error(accountsData.error?.message || 'Failed to fetch Google Ads accounts');
      }

      // Store accounts and get detailed info
      if (accountsData.resourceNames && accountsData.resourceNames.length > 0) {
        const detailedAccounts = [];
        
        for (const resourceName of accountsData.resourceNames) {
          const customerId = resourceName.split('/').pop();
          
          // Get customer details
          const customerResponse = await fetch(`https://googleads.googleapis.com/v20/customers/${customerId}`, {
            headers: {
              'Authorization': `Bearer ${activeAccessToken}`,
              'developer-token': user.google_ads_developer_token,
            },
          });

          const customerRawText = await customerResponse.text();
          let customerData;
          try {
            customerData = JSON.parse(customerRawText);
          } catch (parseError) {
            console.error(`Failed to parse customer details for ${customerId}:`, customerRawText);
            continue;
          }
          
          if (customerResponse.ok && customerData.customer) {
            detailedAccounts.push({
              user_id: userId,
              customer_id: customerId,
              resource_name: resourceName,
              display_name: customerData.customer.displayName || `Account ${customerId}`,
              currency_code: customerData.customer.currencyCode,
              time_zone: customerData.customer.timeZone,
            });
          }
        }

        // Store accounts for future use
        if (detailedAccounts.length > 0) {
          await supabase
            .from('google_ad_accounts')
            .upsert(detailedAccounts);
        }
        
        return NextResponse.json({ accounts: detailedAccounts });
      }
    }

    return NextResponse.json({ accounts: accounts || [] });

  } catch (error) {
    console.error('Google Ads accounts error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const userId = getCurrentUserId();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { customerId } = await request.json();

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 });
    }

    // Update user's selected Google Ads account
    const { error } = await supabase
      .from('users')
      .update({ google_ads_customer_id: customerId })
      .eq('id', userId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Google Ads account selected' });

  } catch (error) {
    console.error('Google Ads account selection error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
