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
      .select('meta_ads_access_token, meta_ads_token_expires_at')
      .eq('id', userId)
      .single();

    if (userError || !user || !user.meta_ads_access_token) {
      return NextResponse.json({ error: 'Meta Ads not connected' }, { status: 400 });
    }

    // Check if token is expired
    if (new Date(user.meta_ads_token_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Meta Ads token expired' }, { status: 401 });
    }

    // Get stored ad accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('meta_ad_accounts')
      .select('*')
      .eq('user_id', userId);

    if (accountsError) {
      throw accountsError;
    }

    // If no stored accounts, fetch fresh from Meta
    if (!accounts || accounts.length === 0) {
      const adAccountsResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_status,business_name,currency,timezone_name&access_token=${user.meta_ads_access_token}`
      );

      const adAccountsData = await adAccountsResponse.json();

      if (!adAccountsResponse.ok || adAccountsData.error) {
        throw new Error(adAccountsData.error?.message || 'Failed to fetch ad accounts');
      }

      // Store accounts for future use
      if (adAccountsData.data && adAccountsData.data.length > 0) {
        await supabase
          .from('meta_ad_accounts')
          .upsert(
            adAccountsData.data.map(account => ({
              user_id: userId,
              account_id: account.id,
              account_name: account.name,
              account_status: account.account_status,
              business_name: account.business_name,
              currency: account.currency,
              timezone_name: account.timezone_name,
            }))
          );
        
        return NextResponse.json({ accounts: adAccountsData.data });
      }
    }

    return NextResponse.json({ accounts: accounts || [] });

  } catch (error) {
    console.error('Meta Ads accounts error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const userId = getCurrentUserId();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    // Update user's selected ad account
    const { error } = await supabase
      .from('users')
      .update({ meta_ads_ad_account_id: accountId })
      .eq('id', userId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Ad account selected' });

  } catch (error) {
    console.error('Meta Ads account selection error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
