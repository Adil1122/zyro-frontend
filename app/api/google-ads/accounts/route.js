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
      .select('google_ads_access_token, google_ads_token_expires_at, google_ads_developer_token')
      .eq('id', userId)
      .single();

    if (userError || !user || !user.google_ads_access_token) {
      return NextResponse.json({ error: 'Google Ads not connected' }, { status: 400 });
    }

    // Check if token is expired
    if (new Date(user.google_ads_token_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Google Ads token expired' }, { status: 401 });
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
      const accountsResponse = await fetch('https://googleads.googleapis.com/v17/customers:listAccessibleCustomers', {
        headers: {
          'Authorization': `Bearer ${user.google_ads_access_token}`,
          'developer-token': user.google_ads_developer_token,
        },
      });

      const accountsData = await accountsResponse.json();

      if (!accountsResponse.ok || accountsData.error) {
        throw new Error(accountsData.error?.message || 'Failed to fetch Google Ads accounts');
      }

      // Store accounts and get detailed info
      if (accountsData.resourceNames && accountsData.resourceNames.length > 0) {
        const detailedAccounts = [];
        
        for (const resourceName of accountsData.resourceNames) {
          const customerId = resourceName.split('/').pop();
          
          // Get customer details
          const customerResponse = await fetch(`https://googleads.googleapis.com/v17/customers/${customerId}`, {
            headers: {
              'Authorization': `Bearer ${user.google_ads_access_token}`,
              'developer-token': user.google_ads_developer_token,
            },
          });

          const customerData = await customerResponse.json();
          
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
